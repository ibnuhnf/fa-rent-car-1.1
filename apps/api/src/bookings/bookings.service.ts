import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type BookingStatus } from '@fa/db';
import {
  calculateRentalPrice,
  type BookingDetailResponse,
  type BookingExportQuery,
  type BookingListQuery,
  type BookingListResponse,
  type BookingSummary,
  type CalendarQuery,
  type CalendarResponse,
  type CalendarSlot,
  type CreateBookingItemRequest,
  type CreateBookingRequest,
  type CreateBookingResponse,
  type ExtendHoldResponse,
} from '@fa/shared';
import { csvString } from '../exports/csv-export.helper';
import { blockedVehicleItemsWhere } from '../vehicles/availability.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Fallback hold duration when no business setting exists. */
const DEFAULT_HOLD_MINUTES = 120;

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

function vehicleNameOf(
  vehicle: { brand: string | null; model: string | null; variant: string | null } | undefined,
): string {
  if (!vehicle) return '(unknown)';
  const parts = [vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' ') : '(unknown)';
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

/**
 * Acquire per-vehicle advisory locks in sorted ID order to prevent deadlocks.
 * Each lock is transaction-scoped and released automatically on commit/rollback.
 */
async function lockVehiclesForBooking(
  transaction: Prisma.TransactionClient,
  vehicleIds: string[],
): Promise<void> {
  const sorted = [...vehicleIds].sort();
  for (const vid of sorted) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${vid}::text, 0))`;
  }
}

/** Read holdMinutes from business settings, with a sensible default. */
async function readHoldMinutes(transaction: Prisma.TransactionClient): Promise<number> {
  const setting = await transaction.setting.findUnique({ where: { key: 'business' } });
  const val = setting?.value as Record<string, unknown> | null;
  if (typeof val?.holdMinutes === 'number' && val.holdMinutes > 0) return val.holdMinutes as number;
  return DEFAULT_HOLD_MINUTES;
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

        // Acquire per-vehicle advisory locks in sorted order before checking
        // availability — prevents concurrent creates on the same vehicle from
        // slipping through even at RepeatableRead isolation.
        await lockVehiclesForBooking(transaction, vehicleIds);

        // Re-read availability AFTER acquiring locks to ensure we see any
        // bookings committed since the tx opened.
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
        const holdMinutes = await readHoldMinutes(transaction);
        const holdExpiresAt = new Date(now.getTime() + holdMinutes * MS_PER_MINUTE);

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

          if (!vehicle.rate) {
            throw new ConflictException({
              code: 'RATE_NOT_CONFIGURED',
              message: `Tarif untuk ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) belum diatur.`,
            });
          }

          const result = calculateRentalPrice({
            chargeableDays: days,
            ratePackages: ratePackagesFor(vehicle.rate),
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

  async exportCsv(query: BookingExportQuery): Promise<string> {
    const response = await this.list({ ...query, page: 1, limit: 10000 } as BookingListQuery);
    const rows: Array<Array<string | number>> = [
      ['id', 'bookingCode', 'status', 'customerName', 'customerWhatsapp', 'totalAmount', 'createdAt'],
      ...response.bookings.map((b) => [b.id, b.bookingCode, b.status, b.customerName, b.customerWhatsapp, b.totalAmount, b.createdAt]),
    ];
    return csvString(rows);
  }

  async calendar(query: CalendarQuery): Promise<CalendarResponse> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const now = new Date();

    const [vehicles, items] = await Promise.all([
      this.database.vehicle.findMany({
        where: { deletedAt: null, ...(query.vehicleId ? { id: query.vehicleId } : {}) },
        select: { id: true, brand: true, model: true, variant: true, plate: true, status: true },
        orderBy: [{ brand: 'asc' }, { model: 'asc' }, { plate: 'asc' }],
      }),
      this.database.bookingItem.findMany({
        where: {
          ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
          startDate: { lt: to },
          endDate: { gt: from },
          booking: {
            deletedAt: null,
            OR: [
              { status: 'PENDING_VERIFICATION', holdExpiresAt: { gt: now } },
              { status: { in: ['ACTIVE', 'COMPLETED'] } },
            ],
          },
        },
        select: {
          vehicleId: true,
          startDate: true,
          endDate: true,
          booking: { select: { bookingCode: true, status: true } },
        },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    const vehicleById = (id: string) => vehicles.find((v) => v.id === id);

    const slots: CalendarSlot[] = items.map((item) => ({
      vehicleId: item.vehicleId,
      vehicleName: vehicleNameOf(vehicleById(item.vehicleId)),
      plate: vehicleById(item.vehicleId)?.plate ?? '',
      bookingCode: item.booking.bookingCode,
      status: item.booking.status,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate.toISOString(),
    }));

    return {
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicleNameOf(vehicle),
        plate: vehicle.plate,
        status: vehicle.status,
      })),
      slots,
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
    const { holdExpiresAt } = await this.database.$transaction(async (transaction) => {
      // Re-read inside tx to ensure no concurrent status change raced us.
      const booking = await transaction.booking.findFirst({ where: { id, deletedAt: null } });
      if (!booking) throw this.notFound();
      if (booking.status !== 'PENDING_VERIFICATION') {
        throw new ConflictException({
          code: 'HOLD_NOT_EXTENDABLE',
          message: 'Hold hanya dapat diperpanjang selama booking menunggu konfirmasi.',
        });
      }

      const base = booking.holdExpiresAt.getTime() > Date.now() ? booking.holdExpiresAt : new Date();
      const newExpiry = new Date(base.getTime() + minutes * MS_PER_MINUTE);

      await transaction.booking.update({ where: { id }, data: { holdExpiresAt: newExpiry } });
      await this.audit.recordBooking(transaction, {
        actorId: admin.user.id,
        action: 'BOOKING_HOLD_EXTENDED',
        objectId: id,
        before: { holdExpiresAt: booking.holdExpiresAt.toISOString() },
        after: { holdExpiresAt: newExpiry.toISOString() },
      });
      return { holdExpiresAt: newExpiry };
    });

    await this.jobs.scheduleHoldExpiry(id, holdExpiresAt);
    return { id, holdExpiresAt: holdExpiresAt.toISOString() };
  }

  /**
   * Perpanjangan atau pengubahan tanggal/sopir pada satu item booking.
   * Menghitung ulang tarif dan menerbitkan invoice versi baru (immutable).
   */
  async updateItem(
    bookingId: string,
    itemId: string,
    input: { startDate?: string; endDate?: string; withDriver?: boolean },
    admin: AuthenticatedAdmin,
  ) {
    return this.database.$transaction(
      async (transaction) => {
        const booking = await transaction.booking.findFirst({
          where: { id: bookingId, deletedAt: null },
          include: {
            items: { include: { vehicle: { include: { rate: true } } } },
            invoices: { orderBy: { version: 'desc' }, take: 1, include: { items: true } },
          },
        });
        if (!booking) throw this.notFound();
        if (booking.status !== 'PENDING_VERIFICATION' && booking.status !== 'ACTIVE') {
          throw new ConflictException({
            code: 'BOOKING_NOT_REVISABLE',
            message: 'Hanya booking Menunggu Verifikasi atau Aktif yang dapat diubah.',
          });
        }

        const target = booking.items.find((candidate) => candidate.id === itemId);
        if (!target) {
          throw new NotFoundException({
            code: 'ITEM_NOT_FOUND',
            message: 'Item armada tidak ditemukan pada booking ini.',
          });
        }

        const nextStartDate = input.startDate ? new Date(input.startDate) : target.startDate;
        const nextEndDate = input.endDate ? new Date(input.endDate) : target.endDate;
        const nextWithDriver = input.withDriver ?? target.withDriver;

        if (nextEndDate <= nextStartDate) {
          throw new ConflictException({
            code: 'INVALID_DATE_RANGE',
            message: 'Tanggal selesai harus setelah tanggal mulai.',
          });
        }

        // Kunci kendaraan & periksa jadwal bentrok vs booking lain
        await lockVehiclesForBooking(transaction, [target.vehicleId]);
        const conflicts = await transaction.bookingItem.findMany({
          where: {
            vehicleId: target.vehicleId,
            id: { not: target.id },
            booking: { status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }, deletedAt: null },
            startDate: { lt: nextEndDate },
            endDate: { gt: nextStartDate },
          },
          select: { id: true },
        });
        if (conflicts.length > 0) {
          throw new ConflictException({
            code: 'VEHICLE_UNAVAILABLE',
            message: 'Jadwal armada baru bentrok dengan booking lain.',
          });
        }

        const days = chargeableDays(nextStartDate, nextEndDate);
        const rate = target.vehicle.rate;
        if (!rate) {
          throw new ConflictException({
            code: 'RATE_NOT_CONFIGURED',
            message: 'Tarif armada belum diatur.',
          });
        }

        const priced = calculateRentalPrice({
          chargeableDays: days,
          ratePackages: ratePackagesFor(rate),
          driverPerDay: nextWithDriver ? (rate.driverPerDay ?? 0) : 0,
        });

        await transaction.bookingItem.update({
          where: { id: itemId },
          data: {
            startDate: nextStartDate,
            endDate: nextEndDate,
            withDriver: nextWithDriver,
            driverPerDay: priced.snapshot.driverPerDay,
            vehicleAmount: priced.breakdown.vehicleAmount,
            driverAmount: priced.breakdown.driverAmount,
            surchargeAmount: priced.breakdown.surchargeAmount,
            promoDiscount: priced.breakdown.promoDiscount,
            totalAmount: priced.breakdown.total,
            snapshot: jsonSnapshot({
              ...priced.snapshot,
              selectedRatePackages: priced.breakdown.selectedRatePackages,
              chargeableDays: days,
              vehicle: {
                plate: target.vehicle.plate,
                brand: target.vehicle.brand,
                model: target.vehicle.model,
              },
            }),
          },
        });

        const invoice = await this.createInvoiceRevision(transaction, booking);

        await this.audit.recordBooking(transaction, {
          actorId: admin.user.id,
          action: 'BOOKING_REVISED',
          objectId: bookingId,
          after: { itemId, action: 'UPDATE_ITEM', invoiceNumber: invoice.invoiceNumber },
        });

        const reloaded = await transaction.booking.findFirstOrThrow({
          where: { id: bookingId },
          include: { items: true, documents: true },
        });
        return {
          booking: this.toBookingDto(reloaded, reloaded.items, reloaded.documents),
          invoice: this.toInvoiceDto(invoice, invoice.items),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async replaceItems(
    bookingId: string,
    items: CreateBookingItemRequest[],
    actor: AuthenticatedAdmin,
  ): Promise<Awaited<ReturnType<typeof this.updateItem>>> {
    return this.database.$transaction(
      async (transaction) => {
        const booking = await transaction.booking.findFirst({
          where: { id: bookingId, deletedAt: null },
          include: {
            items: { include: { vehicle: { include: { rate: true } } } },
            invoices: { orderBy: { version: 'desc' }, take: 1, include: { items: true } },
          },
        });
        if (!booking) throw this.notFound();
        if (booking.status !== 'PENDING_VERIFICATION' && booking.status !== 'ACTIVE') {
          throw new ConflictException({
            code: 'BOOKING_NOT_REVISABLE',
            message: 'Hanya booking Menunggu Verifikasi atau Aktif yang dapat diubah.',
          });
        }

        const vehicleIds = items.map((item) => item.vehicleId);
        if (new Set(vehicleIds).size !== vehicleIds.length) {
          throw new ConflictException({
            code: 'DUPLICATE_VEHICLE',
            message: 'Satu mobil tidak boleh muncul dua kali dalam satu booking.',
          });
        }

        const requestedVehicles = await transaction.vehicle.findMany({
          where: { id: { in: vehicleIds }, deletedAt: null },
          include: { rate: true },
        });
        if (requestedVehicles.length !== vehicleIds.length) {
          throw new NotFoundException({
            code: 'VEHICLE_NOT_FOUND',
            message: 'Ada mobil yang tidak ditemukan.',
          });
        }

        // Kunci urutan ID agar deadlock tidak muncul ketika transaksi lain juga mengunci subset yang sama.
        await lockVehiclesForBooking(transaction, vehicleIds);

        // Buffer mobil mengikuti pola availability agar konsisten dengan pencarian customer.
        const bufferHours = await this.readBufferHours(transaction);

        const driverIds = new Set<string>();
        for (const item of items) {
          if (item.driverId) driverIds.add(item.driverId);
        }
        const sortedDriverIds = [...driverIds].sort();
        for (const did of sortedDriverIds) {
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${did}::text, 0))`;
        }

        const now = new Date();
        if (
          booking.status === 'PENDING_VERIFICATION' &&
          booking.holdExpiresAt <= now
        ) {
          throw new ConflictException({
            code: 'BOOKING_EXPIRED',
            message: 'Hold booking telah kedaluwarsa.',
          });
        }

        // Konflik armada: tolak jika ada booking lain (ACTIVE / PENDING_VERIFICATION dengan hold aktif) yang menumpang di rentang yang diminta.
        const vehicleConflicts = await transaction.bookingItem.findMany({
          where: {
            bookingId: { not: booking.id },
            vehicleId: { in: vehicleIds },
            ...blockedVehicleItemsWhere({
              from: items
                .map((i) => new Date(i.startDate))
                .reduce((min, cur) => (cur < min ? cur : min), new Date(items[0]!.startDate)),
              to: items
                .map((i) => new Date(i.endDate))
                .reduce((max, cur) => (cur > max ? cur : max), new Date(items[0]!.endDate)),
              bufferHours,
            }),
            OR: items.map((item) => ({
              startDate: { lt: new Date(item.endDate) },
              endDate: { gt: new Date(item.startDate) },
            })),
          },
          select: { vehicleId: true },
        });
        if (vehicleConflicts.length > 0) {
          throw new ConflictException({
            code: 'VEHICLE_UNAVAILABLE',
            message: 'Salah satu armada sudah dibooking pada rentang tanggal tersebut.',
          });
        }

        // Konflik sopir: cek tiap sopir terhadap assignment lain di luar booking ini.
        const driverIdsArray = [...driverIds];
        if (driverIdsArray.length > 0) {
          const driverConflicts = await transaction.bookingItem.findMany({
            where: {
              bookingId: { not: booking.id },
              driverId: { in: driverIdsArray },
              booking: { status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }, deletedAt: null },
              OR: items.map((item) => ({
                startDate: { lt: new Date(item.endDate) },
                endDate: { gt: new Date(item.startDate) },
              })),
            },
            select: { driverId: true, bookingId: true },
          });
          if (driverConflicts.length > 0) {
            throw new ConflictException({
              code: 'DRIVER_BUSY',
              message: 'Salah satu sopir sudah memiliki tugas pada rentang tanggal tersebut.',
            });
          }
        }

        // Beban atomic: hapus item lama, buat item baru dengan snapshot tarif.
        const incomingVehicleById = new Map(requestedVehicles.map((v) => [v.id, v]));

        const newItemRows = items.map((item) => {
          const vehicle = incomingVehicleById.get(item.vehicleId);
          if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND' });
          if (vehicle.status !== 'AVAILABLE') {
            throw new ConflictException({
              code: 'VEHICLE_UNAVAILABLE',
              message: 'Mobil sedang tidak tersedia untuk disewa.',
            });
          }
          if (!vehicle.rate) {
            throw new ConflictException({
              code: 'RATE_NOT_CONFIGURED',
              message: `Tarif untuk ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) belum diatur.`,
            });
          }
          const startDate = new Date(item.startDate);
          const endDate = new Date(item.endDate);
          if (endDate <= startDate) {
            throw new ConflictException({
              code: 'INVALID_DATE_RANGE',
              message: 'Tanggal selesai harus setelah tanggal mulai.',
            });
          }
          const days = chargeableDays(startDate, endDate);
          const priced = calculateRentalPrice({
            chargeableDays: days,
            ratePackages: ratePackagesFor(vehicle.rate),
            driverPerDay: item.withDriver ? (vehicle.rate.driverPerDay ?? 0) : 0,
          });
          return {
            data: {
              bookingId: booking.id,
              vehicleId: vehicle.id,
              startDate,
              endDate,
              withDriver: item.withDriver,
              driverId: item.driverId ?? null,
              driverPerDay: priced.snapshot.driverPerDay,
              vehicleAmount: priced.breakdown.vehicleAmount,
              driverAmount: priced.breakdown.driverAmount,
              surchargeAmount: priced.breakdown.surchargeAmount,
              promoDiscount: priced.breakdown.promoDiscount,
              totalAmount: priced.breakdown.total,
              snapshot: jsonSnapshot({
                ...priced.snapshot,
                selectedRatePackages: priced.breakdown.selectedRatePackages,
                chargeableDays: days,
                vehicle: { plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model },
              }),
            },
          };
        });

        await transaction.bookingItem.deleteMany({ where: { bookingId: booking.id } });
        await transaction.bookingItem.createMany({
          data: newItemRows.map((row) => row.data),
        });

        const invoice = await this.createInvoiceRevision(transaction, booking);

        await this.audit.recordBooking(transaction, {
          actorId: actor.user.id,
          action: 'BOOKING_REVISED',
          objectId: booking.id,
          after: {
            action: 'REPLACE_ITEMS',
            count: items.length,
            vehicleIds,
            invoiceNumber: invoice.invoiceNumber,
          },
        });

        const reloaded = await transaction.booking.findFirstOrThrow({
          where: { id: bookingId },
          include: { items: true, documents: true },
        });
        return {
          booking: this.toBookingDto(reloaded, reloaded.items, reloaded.documents),
          invoice: this.toInvoiceDto(invoice, invoice.items),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async readBufferHours(transaction: Prisma.TransactionClient): Promise<number> {
    const setting = await transaction.setting.findUnique({ where: { key: 'business' } });
    const val = setting?.value as Record<string, unknown> | null;
    if (typeof val?.bufferMinutes === 'number' && val.bufferMinutes >= 0) {
      return Math.ceil(val.bufferMinutes / 60);
    }
    return 0;
  }

  private async createInvoiceRevision(
    transaction: Prisma.TransactionClient,
    booking: {
      id: string;
      invoices: Array<{ version: number; status: string; totalAmount: number }>;
    },
  ) {
    const allItems = await transaction.bookingItem.findMany({
      where: { bookingId: booking.id },
      include: { vehicle: true },
    });
    const subtotal = allItems.reduce((sum, item) => sum + item.totalAmount, 0);

    const paidSum = await transaction.payment.aggregate({
      where: { invoice: { bookingId: booking.id } },
      _sum: { amount: true },
    });
    const paidTotal = paidSum._sum.amount ?? 0;
    if (subtotal < paidTotal) {
      throw new ConflictException({
        code: 'REVISION_BELOW_PAID',
        message: 'Total baru tidak boleh lebih kecil dari pembayaran yang sudah diterima.',
      });
    }

    const latestVersion = booking.invoices[0]?.version ?? 1;
    const now = new Date();
    return transaction.invoice.create({
      data: {
        invoiceNumber: randomCode('INV', now),
        bookingId: booking.id,
        version: latestVersion + 1,
        status: paidTotal >= subtotal ? 'PAID' : 'UNPAID',
        paidAt: paidTotal >= subtotal ? now : null,
        subtotal,
        totalAmount: subtotal,
        bankAccount: await this.bankAccount(transaction),
        items: {
          create: allItems.map((item) => {
            const days = chargeableDays(item.startDate, item.endDate);
            return {
              description: `${item.vehicle.brand} ${item.vehicle.model} (${item.vehicle.plate}) — ${days} hari`,
              quantity: days,
              unitPrice: Math.round(item.totalAmount / days),
              amount: item.totalAmount,
            };
          }),
        },
      },
      include: { items: true },
    });
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