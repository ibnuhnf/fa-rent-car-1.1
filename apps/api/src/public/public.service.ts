import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { Prisma } from '@fa/db';
import {
  calculateRentalPrice,
  type PriceEstimateRequest,
  type PriceEstimateResponse,
  type PublicCreateBookingRequest,
  type PublicCreateBookingResponse,
  type PublicVehicleDetailResponse,
  type PublicVehicleListQuery,
  type PublicVehicleListResponse,
  type ValidatePromoRequest,
  type ValidatePromoResponse,
} from '@fa/shared';
import {
  chargeableDays,
  randomCode,
  ratePackagesFor,
} from '../bookings/bookings.service';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { StorageService } from '../storage/storage.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_HOLD_MINUTES = 120;
const PORTAL_TOKEN_TTL_DAYS = 30;

interface PromoEntry {
  code: string;
  type: 'fixed' | 'basisPoints';
  amount?: number;
  basisPoints?: number;
  isActive?: boolean;
}

function jsonSnapshot(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

async function lockVehiclesForBooking(
  transaction: Prisma.TransactionClient,
  vehicleIds: string[],
): Promise<void> {
  const sorted = [...vehicleIds].sort();
  for (const vid of sorted) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${vid}::text, 0))`;
  }
}

async function readHoldMinutes(transaction: Prisma.TransactionClient): Promise<number> {
  const setting = await transaction.setting.findUnique({ where: { key: 'business' } });
  const val = setting?.value as Record<string, unknown> | null;
  if (typeof val?.holdMinutes === 'number' && val.holdMinutes > 0) return val.holdMinutes as number;
  return DEFAULT_HOLD_MINUTES;
}

/** Setting key 'promos': [{code, type:'fixed'|'basisPoints', amount|basisPoints, isActive}]. */
function readPromos(settingValue: unknown): PromoEntry[] {
  if (!Array.isArray(settingValue)) return [];
  return settingValue.filter(
    (entry): entry is PromoEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as PromoEntry).code === 'string' &&
      ((entry as PromoEntry).type === 'fixed' || (entry as PromoEntry).type === 'basisPoints'),
  );
}

export function promoDiscountFor(
  promo: PromoEntry | undefined,
  subtotal: number,
): number {
  if (!promo || promo.isActive === false) return 0;
  if (promo.type === 'fixed') {
    return Math.min(promo.amount ?? 0, subtotal);
  }
  const basisPoints = promo.basisPoints ?? 0;
  return Math.min(subtotal, Math.floor((subtotal * basisPoints) / 10_000));
}

export function findActivePromo(
  settingValue: unknown,
  code: string | undefined,
): PromoEntry | undefined {
  if (!code) return undefined;
  const wanted = code.trim().toLowerCase();
  if (!wanted) return undefined;
  return readPromos(settingValue).find(
    (promo) => promo.isActive !== false && promo.code.trim().toLowerCase() === wanted,
  );
}

export function publicVehicleOrderBy(sort: PublicVehicleListQuery['sort']): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ rate: { daily: 'asc' } }, { id: 'asc' }];
    case 'price_desc':
      return [{ rate: { daily: 'desc' } }, { id: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}

export function publicVehicleWhere(query: PublicVehicleListQuery): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    status: 'AVAILABLE',
    isDemo: false,
  };
  if (query.category) where.category = query.category;
  if (query.transmission) where.transmission = query.transmission;
  if (query.minCapacity) where.capacity = { gte: query.minCapacity };
  if (query.maxPrice) where.rate = { daily: { lte: query.maxPrice } };
  return where;
}

type VehicleWithRate = Prisma.VehicleGetPayload<{ include: { rate: true } }>;

function notFound() {
  return new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Kendaraan tidak ditemukan.' });
}

function toPublicVehicle(
  vehicle: VehicleWithRate & {
    primaryPhoto?: { objectKey: string } | null;
    _count?: { photos: number };
  },
  photoUrl: string | null,
) {
  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    plate: vehicle.plate,
    color: vehicle.color,
    transmission: vehicle.transmission,
    category: vehicle.category,
    fuelType: vehicle.fuelType,
    capacity: vehicle.capacity,
    luggageCount: vehicle.luggageCount,
    mileage: vehicle.mileage,
    facilities: vehicle.facilities,
    description: vehicle.description,
    status: vehicle.status,
    featured: vehicle.featured,
    isDemo: vehicle.isDemo,
    dailyRate: vehicle.rate?.daily ?? null,
    rate: vehicle.rate
      ? {
          daily: vehicle.rate.daily,
          weekly: vehicle.rate.weekly,
          monthly: vehicle.rate.monthly,
          driverPerDay: vehicle.rate.driverPerDay,
          overtimeHourly: vehicle.rate.overtimeHourly,
          latePerDay: vehicle.rate.latePerDay,
        }
      : null,
    primaryPhotoUrl: photoUrl,
    photoCount: vehicle._count?.photos ?? 0,
  };
}

@Injectable()
export class PublicService {
  constructor(
    private readonly database: PrismaService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
  ) {}

  async listVehicles(query: PublicVehicleListQuery): Promise<PublicVehicleListResponse> {
    const where = publicVehicleWhere(query);
    const [vehicles, total] = await this.database.$transaction([
      this.database.vehicle.findMany({
        where,
        include: {
          rate: true,
          photos: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 1 },
          _count: { select: { photos: true } },
        },
        orderBy: publicVehicleOrderBy(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.vehicle.count({ where }),
    ]);

    const vehiclesDto = await Promise.all(
      vehicles.map(async (vehicle) => {
        const primaryPhoto = vehicle.photos[0];
        const photoUrl = primaryPhoto
          ? await this.storage.createDownload(primaryPhoto.objectKey)
          : null;
        return toPublicVehicle(
          vehicle as VehicleWithRate & { primaryPhoto?: { objectKey: string } | null },
          photoUrl,
        );
      }),
    );

    const totalPages = Math.ceil(total / query.limit);
    return {
      vehicles: vehiclesDto,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page * query.limit < total,
      },
    };
  }

  async vehicleDetail(id: string): Promise<PublicVehicleDetailResponse> {
    const vehicle = await this.database.vehicle.findFirst({
      where: { id, deletedAt: null, status: 'AVAILABLE', isDemo: false },
      include: { rate: true },
    });
    if (!vehicle) throw notFound();

    const [photos, pricingRules] = await Promise.all([
      this.database.vehiclePhoto.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.database.pricingRule.findMany({
        where: { OR: [{ vehicleId: vehicle.id }, { vehicleId: null }], isActive: true },
        orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const photoUrls = await Promise.all(
      photos.map((photo) => this.storage.createDownload(photo.objectKey)),
    );

    return {
      ...toPublicVehicle(vehicle, photos[0] ? (photoUrls[0] ?? null) : null),
      photos: photos.map((photo, index) => ({
        id: photo.id,
        objectKey: photo.objectKey,
        sortOrder: photo.sortOrder,
        url: photoUrls[index] ?? null,
      })),
      pricingRules: pricingRules.map((rule) => ({
        id: rule.id,
        vehicleId: rule.vehicleId,
        name: rule.name,
        type: rule.type,
        startDate: rule.startDate.toISOString(),
        endDate: rule.endDate.toISOString(),
        multiplierBasisPoints: rule.multiplierBasisPoints,
        fixedSurcharge: rule.fixedSurcharge,
        isActive: rule.isActive,
      })),
    };
  }

  async priceEstimate(input: PriceEstimateRequest): Promise<PriceEstimateResponse> {
    const vehicle = await this.database.vehicle.findFirst({
      where: { id: input.vehicleId, deletedAt: null, status: 'AVAILABLE', isDemo: false },
      include: { rate: true },
    });
    if (!vehicle) throw notFound();
    if (!vehicle.rate) {
      throw new ConflictException({
        code: 'RATE_NOT_CONFIGURED',
        message: `Tarif untuk ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) belum diatur.`,
      });
    }

    const days = chargeableDays(new Date(input.startDate), new Date(input.endDate));
    const result = calculateRentalPrice({
      chargeableDays: days,
      ratePackages: ratePackagesFor(vehicle.rate),
      driverPerDay: input.withDriver ? (vehicle.rate.driverPerDay ?? 0) : 0,
    });

    return { days, breakdown: { ...result.breakdown, selectedRatePackages: [...result.breakdown.selectedRatePackages] } };
  }

  async createBooking(input: PublicCreateBookingRequest): Promise<PublicCreateBookingResponse> {
    const created = await this.database.$transaction(
      async (transaction) => {
        const customer = await this.resolveCustomer(transaction, input.customer);

        const vehicleIds = input.items.map((item) => item.vehicleId);
        if (new Set(vehicleIds).size !== vehicleIds.length) {
          throw new ConflictException({
            code: 'DUPLICATE_VEHICLE',
            message: 'Satu mobil tidak boleh muncul dua kali dalam satu booking.',
          });
        }

        const vehicles = await transaction.vehicle.findMany({
          where: { id: { in: vehicleIds }, deletedAt: null, isDemo: false },
          include: { rate: true },
        });
        if (vehicles.length !== vehicleIds.length) {
          throw new NotFoundException({
            code: 'VEHICLE_NOT_FOUND',
            message: 'Ada mobil yang tidak ditemukan.',
          });
        }

        await lockVehiclesForBooking(transaction, vehicleIds);

        const conflicts = await transaction.bookingItem.findMany({
          where: {
            vehicleId: { in: vehicleIds },
            booking: { status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }, deletedAt: null },
            OR: input.items.map((item) => ({
              vehicleId: item.vehicleId,
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

        const priced = input.items.map((item) => {
          const vehicle = vehicles.find((candidate) => candidate.id === item.vehicleId);
          if (!vehicle) throw notFound();
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

          const days = chargeableDays(new Date(item.startDate), new Date(item.endDate));
          const result = calculateRentalPrice({
            chargeableDays: days,
            ratePackages: ratePackagesFor(vehicle.rate),
            driverPerDay: item.withDriver ? (vehicle.rate.driverPerDay ?? 0) : 0,
          });
          return { item, vehicle, days, result };
        });

        const subtotal = priced.reduce((total, entry) => total + entry.result.breakdown.total, 0);

        const promoSetting = input.promoCode
          ? await transaction.setting.findUnique({ where: { key: 'promos' } })
          : null;
        const activePromo = findActivePromo(promoSetting?.value, input.promoCode);
        const discount = promoDiscountFor(activePromo, subtotal);

        const now = new Date();
        const holdMinutes = await readHoldMinutes(transaction);
        const holdExpiresAt = new Date(now.getTime() + holdMinutes * MS_PER_MINUTE);

        const booking = await transaction.booking.create({
          data: {
            bookingCode: randomCode('FA', now),
            customerId: customer.id,
            holdExpiresAt,
            notes: input.notes ?? null,
            items: {
              create: priced.map(({ item, vehicle, days, result }) => {
                const itemDiscount = discountPerItemShare(result.breakdown.total, subtotal) * discount;
                return {
                  vehicleId: item.vehicleId,
                  startDate: new Date(item.startDate),
                  endDate: new Date(item.endDate),
                  withDriver: item.withDriver,
                  driverPerDay: result.snapshot.driverPerDay,
                  vehicleAmount: result.breakdown.vehicleAmount,
                  driverAmount: result.breakdown.driverAmount,
                  surchargeAmount: result.breakdown.surchargeAmount,
                  promoDiscount: Math.round(itemDiscount),
                  totalAmount: result.breakdown.total - Math.round(itemDiscount),
                  snapshot: jsonSnapshot({
                    ...result.snapshot,
                    selectedRatePackages: result.breakdown.selectedRatePackages,
                    chargeableDays: days,
                    vehicle: { plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model },
                  }),
                };
              }),
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
            discount,
            totalAmount: subtotal - discount,
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

        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        const tokenExpiresAt = new Date(now.getTime() + PORTAL_TOKEN_TTL_DAYS * MS_PER_DAY);
        await transaction.bookingAccessToken.create({
          data: { bookingId: booking.id, tokenHash, expiresAt: tokenExpiresAt },
        });

        await this.database.auditLog.create({
          data: {
            actorId: null,
            action: 'BOOKING_CREATED',
            objectType: 'BOOKING',
            objectId: booking.id,
            after: jsonSnapshot({
              bookingCode: booking.bookingCode,
              invoiceNumber: invoice.invoiceNumber,
              source: 'PUBLIC_GUEST',
            }),
          },
        });

        return { booking, invoice, holdExpiresAt, portalToken: rawToken };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    await this.jobs.scheduleHoldExpiry(created.booking.id, created.holdExpiresAt);

    return {
      bookingCode: created.booking.bookingCode,
      invoice: {
        ...created.invoice,
        issuedAt: created.invoice.issuedAt.toISOString(),
        paidAt: created.invoice.paidAt ? created.invoice.paidAt.toISOString() : null,
      } as never,
      portalUrl: `/portal/${created.portalToken}`,
      holdExpiresAt: created.holdExpiresAt.toISOString(),
    };
  }

  async validatePromo(input: ValidatePromoRequest): Promise<ValidatePromoResponse> {
    const setting = await this.database.setting.findUnique({ where: { key: 'promos' } });
    const promo = findActivePromo(setting?.value, input.code);
    if (!promo) return { valid: false, discount: 0 };
    return { valid: true, discount: promoDiscountFor(promo, input.subtotal) };
  }

  /**
   * Publik tidak boleh menimpa PII customer yang sudah ada hanya bermodal NIK.
   * NIK yang dikenal dipakai apa adanya; pembuatan baru hanya saat benar-benar baru.
   */
  private async resolveCustomer(
    transaction: Prisma.TransactionClient,
    customer: PublicCreateBookingRequest['customer'],
  ) {
    const existing = await transaction.customer.findUnique({ where: { nik: customer.nik } });
    if (existing) return existing;

    const whatsappTaken = await transaction.customer.findUnique({
      where: { whatsapp: customer.whatsapp },
    });
    if (whatsappTaken) {
      throw new ConflictException({
        code: 'CUSTOMER_CONTACT_IN_USE',
        message: 'Nomor WhatsApp sudah terdaftar pada data penyewa lain.',
      });
    }

    return transaction.customer.create({
      data: {
        nik: customer.nik,
        name: customer.name,
        whatsapp: customer.whatsapp,
        email: customer.email ?? null,
        address: customer.address,
        notes: customer.notes ?? null,
      },
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
}

function discountPerItemShare(itemTotal: number, subtotal: number): number {
  if (subtotal <= 0) return 0;
  return itemTotal / subtotal;
}
