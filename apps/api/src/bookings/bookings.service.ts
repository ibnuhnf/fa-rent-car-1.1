import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type BookingStatus } from '@fa/db';
import {
  calculateRentalPrice,
  type BookingDetailResponse,
  type BookingListQuery,
  type BookingListResponse,
  type BookingSummary,
  type CreateBookingRequest,
  type CreateBookingResponse,
  type ExtendHoldResponse,
} from '@fa/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function formatCode(prefix: string, sequence: string): string {
  return `${prefix}-${sequence}`;
}

/** FA-YYYYMMDD-XXXX / INV-YYYYMMDD-XXXX as pinned by the shared schemas. */
export function randomCode(prefix: 'FA' | 'INV', now: Date): string {
  const stamp = now.toISOString().slice(0, 10).replaceAll('-', '');
  let suffix = '';
  for (let index = 0; index < 4; index += 1) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return formatCode(prefix, `${stamp}-${suffix}`);
}

export function chargeableDays(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
}

export function ratePackagesFor(rate: {
  daily: number;
  weekly: number | null;
  monthly: number | null;
}) {
  const packages = [{ days: 1, amount: rate.daily }];
  if (rate.weekly !== null && rate.weekly > 0) packages.push({ days: 7, amount: rate.weekly });
  if (rate.monthly !== null && rate.monthly > 0) packages.push({ days: 30, amount: rate.monthly });
  return packages;
}

/** Prisma JSON columns reject readonly arrays; round-trip through JSON. */
function jsonSnapshot(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly database: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobsService,
  ) {}

  async create(
    input: CreateBookingRequest,
    admin: AuthenticatedAdmin,
  ): Promise<CreateBookingResponse> {
    const created = await this.database.$transaction(
      async (transaction) => {
        const customer = await this.upsertCustomer(transaction, input);

        const vehicleIds = input.items.map((item) => item.vehicleId);
        if (new Set(vehicleIds).size !== vehicleIds.length) {
          throw new ConflictException({
            code: 'DUPLICATE_VEHICLE',
            message: 'Satu mobil tidak boleh muncul dua kali dalam satu booking.',
          });
        }

        const vehicles = await transaction.vehicle.findMany({
          where: { id: { in: vehicleIds }, deletedAt: null },
          include: { rate: true },
        });
        if (vehicles.length !== vehicleIds.length) {
          throw new NotFoundException({
            code: 'VEHICLE_NOT_FOUND',
            message: 'Ada mobil yang tidak ditemukan.',
          });
        }

        // Booking creation locks availability inside the same RepeatableRead
        // transaction that writes the items, so a concurrent create cannot
        // slip between the check and the insert.
        const conflicts = await transaction.bookingItem.findMany({
          where: {
            vehicleId: { in: vehicleIds },
            booking: { status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] } },
            OR: input.items.map((item) => ({
              startDate: { lt: new Date(item.endDate) },
              endDate: { gt: new Date(item.startDate) },
            })),
          },
          select: { vehicleId: true },
        });
        if (conflicts.length > 0) {
          throw new ConflictException({
            code: 'VEHICLE_UNAVAILABLE',
            message: 'Mobil yang dipilih sudah dibooking pada rentang tanggal tersebut.',
          });
        }

        const now = new Date();
        const holdExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        const priced = input.items.map((item) => {
          const vehicle = vehicles.find((candidate) => candidate.id === item.vehicleId);
          if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND' });
          // Hanya unit AVAILABLE yang boleh dibooking; RENTED/HELD/MAINTENANCE ditolak.
          if (vehicle.status !== 'AVAILABLE') {
            throw new ConflictException({
              code: 'VEHICLE_UNAVAILABLE',
              message: 'Mobil sedang tidak tersedia untuk disewa.',
            });
          }

          const days = chargeableDays(new Date(item.startDate), new Date(item.endDate));
          const result = calculateRentalPrice({
            chargeableDays: days,
            ratePackages: vehicle.rate ? ratePackagesFor(vehicle.rate) : [{ days: 1, amount: 0 }],
            driverPerDay: item.withDriver ? (vehicle.rate?.driverPerDay ?? 0) : 0,
          });

          return { item, vehicle, days, result };
        });

        const subtotal = priced.reduce((total, entry) => total + entry.result.breakdown.total, 0);

        const booking = await transaction.booking.create({
          data: {
            bookingCode: randomCode('FA', now),
            customerId: customer.id,
            holdExpiresAt,
            notes: input.notes ?? null,
            items: {
              create: priced.map(({ item, vehicle, days, result }) => ({
                vehicleId: item.vehicleId,
                startDate: new Date(item.startDate),
                endDate: new Date(item.endDate),
                withDriver: item.withDriver,
                driverPerDay: result.snapshot.driverPerDay,
                vehicleAmount: result.breakdown.vehicleAmount,
                driverAmount: result.breakdown.driverAmount,
                surchargeAmount: result.breakdown.surchargeAmount,
                promoDiscount: result.breakdown.promoDiscount,
                totalAmount: result.breakdown.total,
                snapshot: jsonSnapshot({
                  ...result.snapshot,
                  selectedRatePackages: result.breakdown.selectedRatePackages,
                  chargeableDays: days,
                  vehicle: { plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model },
                }),
              })),
            },
          },
          include: { items: true },
        });

        const invoice = await transaction.invoice.create({
          data: {
            invoiceNumber: randomCode('INV', now),
            bookingId: booking.id,
            version: 1,
            subtotal,
            totalAmount: subtotal,
            bankAccount: await this.bankAccount(transaction),
            items: {
              create: priced.map(({ vehicle, days, result }) => ({
                description: `${vehicle.brand} ${vehicle.model} (${vehicle.plate}) — ${days} hari`,
                quantity: days,
                unitPrice: Math.round(result.breakdown.total / days),
                amount: result.breakdown.total,
              })),
            },
          },
          include: { items: true },
        });

        await this.audit.recordBooking(transaction, {
          actorId: admin.user.id,
          action: 'BOOKING_CREATED',
          objectId: booking.id,
          after: { bookingCode: booking.bookingCode, invoiceNumber: invoice.invoiceNumber },
        });

        return { booking, invoice, customer, holdExpiresAt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    await this.jobs.scheduleHoldExpiry(created.booking.id, created.holdExpiresAt);

    return {
      booking: this.toBookingDto(created.booking, created.booking.items, []),
      invoice: this.toInvoiceDto(created.invoice, created.invoice.items),
    };
  }

  async list(query: BookingListQuery): Promise<BookingListResponse> {
    const where: Prisma.BookingWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.vehicleId) where.items = { some: { vehicleId: query.vehicleId } };
    if (query.from || query.to) {
      where.items = {
        ...(typeof where.items === 'object' ? (where.items as object) : {}),
        some: {
          ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
          ...(query.from ? { endDate: { gte: new Date(query.from) } } : {}),
          ...(query.to ? { startDate: { lte: new Date(query.to) } } : {}),
        },
      };
    }
    if (query.search) {
      where.OR = [
        { bookingCode: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { whatsapp: { contains: query.search } } },
      ];
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput[] =
      query.sort === 'oldest'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : query.sort === 'hold_asc'
          ? [{ holdExpiresAt: 'asc' }, { id: 'asc' }]
          : [{ createdAt: 'desc' }, { id: 'asc' }];

    const [total, rows] = await this.database.$transaction([
      this.database.booking.count({ where }),
      this.database.booking.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          customer: true,
          items: { select: { totalAmount: true } },
          invoices: { orderBy: { version: 'desc' }, take: 1, select: { invoiceNumber: true, status: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);
    const bookings: BookingSummary[] = rows.map((row) => ({
      id: row.id,
      bookingCode: row.bookingCode,
      status: row.status,
      holdExpiresAt: row.holdExpiresAt.toISOString(),
      customerId: row.customerId,
      customerName: row.customer.name,
      customerWhatsapp: row.customer.whatsapp,
      itemCount: row.items.length,
      totalAmount: row.items.reduce((sum, item) => sum + item.totalAmount, 0),
      invoiceNumber: row.invoices[0]?.invoiceNumber ?? null,
      invoiceStatus: row.invoices[0]?.status ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return {
      bookings,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
    };
  }

  async detail(id: string): Promise<BookingDetailResponse> {
    const booking = await this.database.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        items: true,
        documents: true,
        invoices: { include: { items: true }, orderBy: { version: 'asc' } },
      },
    });
    if (!booking) throw this.notFound();

    const logs = await this.database.auditLog.findMany({
      where: { objectType: 'BOOKING', objectId: id },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { name: true } } },
    });

    return {
      booking: this.toBookingDto(booking, booking.items, booking.documents),
      customer: {
        id: booking.customer.id,
        nik: booking.customer.nik,
        name: booking.customer.name,
        whatsapp: booking.customer.whatsapp,
        email: booking.customer.email,
        address: booking.customer.address,
        isBlacklisted: booking.customer.isBlacklisted,
        blacklistReason: booking.customer.blacklistReason,
        notes: booking.customer.notes,
        createdAt: booking.customer.createdAt.toISOString(),
        updatedAt: booking.customer.updatedAt.toISOString(),
      },
      invoices: booking.invoices.map((invoice) => this.toInvoiceDto(invoice, invoice.items)),
      timeline: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        actorName: log.actor?.name ?? null,
        before: (log.before as Record<string, unknown> | null) ?? null,
        after: (log.after as Record<string, unknown> | null) ?? null,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  async extendHold(id: string, minutes: number, admin: AuthenticatedAdmin): Promise<ExtendHoldResponse> {
    const booking = await this.database.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking) throw this.notFound();
    if (booking.status !== 'PENDING_VERIFICATION') {
      throw new ConflictException({
        code: 'HOLD_NOT_EXTENDABLE',
        message: 'Hold hanya dapat diperpanjang selama booking menunggu konfirmasi.',
      });
    }

    const base = booking.holdExpiresAt.getTime() > Date.now() ? booking.holdExpiresAt : new Date();
    const holdExpiresAt = new Date(base.getTime() + minutes * 60 * 1000);

    await this.database.$transaction(async (transaction) => {
      await transaction.booking.update({ where: { id }, data: { holdExpiresAt } });
      await this.audit.recordBooking(transaction, {
        actorId: admin.user.id,
        action: 'BOOKING_HOLD_EXTENDED',
        objectId: id,
        before: { holdExpiresAt: booking.holdExpiresAt.toISOString() },
        after: { holdExpiresAt: holdExpiresAt.toISOString() },
      });
    });

    await this.jobs.scheduleHoldExpiry(id, holdExpiresAt);
    return { id, holdExpiresAt: holdExpiresAt.toISOString() };
  }

  private async bankAccount(transaction: Prisma.TransactionClient): Promise<Prisma.InputJsonObject> {
    const setting = await transaction.setting.findUnique({ where: { key: 'business' } });
    const value = setting?.value;
    if (typeof value === 'object' && value !== null && 'bankAccount' in value) {
      return (value as { bankAccount: Prisma.InputJsonObject }).bankAccount;
    }
    return { bankName: '', accountNumber: '', accountHolder: '' };
  }

  private async upsertCustomer(
    transaction: Prisma.TransactionClient,
    input: CreateBookingRequest,
  ) {
    const { nik } = input.customer;
    return transaction.customer.upsert({
      where: { nik },
      update: {
        name: input.customer.name,
        whatsapp: input.customer.whatsapp,
        email: input.customer.email ?? null,
        address: input.customer.address,
        notes: input.customer.notes ?? null,
      },
      create: {
        nik,
        name: input.customer.name,
        whatsapp: input.customer.whatsapp,
        email: input.customer.email ?? null,
        address: input.customer.address,
        notes: input.customer.notes ?? null,
      },
    });
  }

  private notFound() {
    return new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking tidak ditemukan.' });
  }

  private toBookingDto(
    booking: {
      id: string;
      bookingCode: string;
      customerId: string;
      status: BookingStatus;
      holdExpiresAt: Date;
      pickupOffice: string;
      notes: string | null;
      internalNotes: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    items: Array<Record<string, unknown>>,
    documents: Array<Record<string, unknown>>,
  ) {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerId: booking.customerId,
      status: booking.status,
      holdExpiresAt: booking.holdExpiresAt.toISOString(),
      pickupOffice: booking.pickupOffice,
      notes: booking.notes,
      internalNotes: booking.internalNotes,
      items: items.map((item) => ({
        ...item,
        startDate: (item.startDate as Date).toISOString(),
        endDate: (item.endDate as Date).toISOString(),
      })) as never,
      documents: documents.map((document) => ({
        ...document,
        verifiedAt: document.verifiedAt ? (document.verifiedAt as Date).toISOString() : null,
      })) as never,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  private toInvoiceDto(invoice: Record<string, unknown>, items: Array<Record<string, unknown>>) {
    return {
      ...invoice,
      issuedAt: (invoice.issuedAt as Date).toISOString(),
      paidAt: invoice.paidAt ? (invoice.paidAt as Date).toISOString() : null,
      items,
    } as never;
  }
}