import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@fa/db';
import {
  MAX_PAGINATION_SKIP,
  type AdminVehicleDetail,
  type VehicleCounts,
  type VehicleListQuery,
  type VehiclePhotoUploadResponse,
  type VehicleSummary,
  type VehicleUpdate,
} from '@fa/shared';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

type VehicleWithRate = Prisma.VehicleGetPayload<{ include: { rate: true } }>;

function notFound() {
  return new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Kendaraan tidak ditemukan.' });
}

function toSummary(vehicle: VehicleWithRate): VehicleSummary {
  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    variant: vehicle.variant,
    plate: vehicle.plate,
    year: vehicle.year,
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    capacity: vehicle.capacity,
    luggageCount: vehicle.luggageCount,
    mileage: vehicle.mileage,
    facilities: vehicle.facilities,
    status: vehicle.status,
    isDemo: vehicle.isDemo,
    dailyRate: vehicle.rate?.daily ?? null,
  };
}

function toRate(rate: Prisma.VehicleRateGetPayload<object> | null) {
  if (!rate) return null;
  return {
    daily: rate.daily,
    weekly: rate.weekly,
    monthly: rate.monthly,
    driverPerDay: rate.driverPerDay,
    overtimeHourly: rate.overtimeHourly,
    latePerDay: rate.latePerDay,
  };
}

function auditSnapshot(vehicle: VehicleWithRate): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify({ vehicle: toSummary(vehicle), rate: toRate(vehicle.rate) }));
}

/** Manual operators may hold or stop a unit; RENTED stays system-derived. */
export function assertManageableStatus(status: VehicleUpdate['status']) {
  if (status === 'RENTED') {
    throw new BadRequestException({
      code: 'INVALID_STATUS',
      message: 'Status disewa diturunkan dari booking aktif, tidak bisa diatur manual.',
    });
  }
}

function listOrderBy({ sort }: VehicleListQuery): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case 'brand':
      return [{ brand: 'asc' }, { model: 'asc' }, { id: 'asc' }];
    case 'rate_asc':
      return [{ rate: { daily: { sort: 'asc', nulls: 'last' } } }, { id: 'asc' }];
    case 'rate_desc':
      return [{ rate: { daily: { sort: 'desc', nulls: 'last' } } }, { id: 'asc' }];
    case 'year_desc':
      return [{ year: 'desc' }, { id: 'asc' }];
    case 'oldest':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}

function listWhere({ search, status, category, transmission, fuelType }: VehicleListQuery) {
  const where: Prisma.VehicleWhereInput = { deletedAt: null };
  if (status) where.status = status;
  if (category) where.category = category;
  if (transmission) where.transmission = transmission;
  if (fuelType) where.fuelType = fuelType;
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { plate: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

@Injectable()
export class VehiclesService {
  constructor(
    private readonly database: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  private async requireVehicle(id: string): Promise<VehicleWithRate> {
    const vehicle = await this.database.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { rate: true },
    });
    if (!vehicle) throw notFound();
    return vehicle;
  }

  async list(query: VehicleListQuery) {
    const where = listWhere(query);
    const [vehicles, total, groups] = await this.database.$transaction(
      [
        this.database.vehicle.findMany({
          where,
          include: { rate: true, _count: { select: { photos: true } } },
          orderBy: listOrderBy(query),
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.database.vehicle.count({ where }),
        this.database.vehicle.groupBy({
          by: ['status', 'isDemo'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const counts: VehicleCounts = {
      total: 0,
      demo: 0,
      byStatus: { AVAILABLE: 0, RENTED: 0, HELD: 0, MAINTENANCE: 0, INACTIVE: 0 },
    };
    for (const group of groups) {
      const count = group._count._all;
      counts.total += count;
      counts.demo += group.isDemo ? count : 0;
      counts.byStatus[group.status] += count;
    }

    return {
      vehicles: vehicles.map((vehicle) => ({
        ...vehicle,
        photoCount: vehicle._count.photos,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasPreviousPage: query.page > 1,
        hasNextPage:
          query.page * query.limit < total && query.page * query.limit <= MAX_PAGINATION_SKIP,
      },
      counts,
    };
  }

  async detail(id: string): Promise<AdminVehicleDetail> {
    const [vehicle, photos, pricingRules] = await this.database.$transaction(
      async (transaction) => {
        const found = await transaction.vehicle.findFirst({
          where: { id, deletedAt: null },
          include: { rate: true },
        });
        if (!found) throw notFound();
        return Promise.all([
          transaction.vehicle.findUniqueOrThrow({
            where: { id: found.id },
            include: { rate: true, _count: { select: { photos: true } } },
          }),
          transaction.vehiclePhoto.findMany({
            where: { vehicleId: found.id },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          }),
          transaction.pricingRule.findMany({
            where: { OR: [{ vehicleId: found.id }, { vehicleId: null }], isActive: true },
            orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          }),
        ]);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const photoUrls = await Promise.all(
      photos.map((photo) => this.storage.createDownload(photo.objectKey)),
    );

    return {
      ...vehicle,
      dailyRate: vehicle.rate?.daily ?? null,
      rate: toRate(vehicle.rate),
      photoCount: vehicle._count.photos,
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
    } as AdminVehicleDetail;
  }

  async create(input: VehicleSummary & Actor): Promise<AdminVehicleDetail> {
    assertManageableStatus(input.status);
    try {
      const vehicle = await this.database.$transaction(async (transaction) => {
        const created = await transaction.vehicle.create({
          data: {
            brand: input.brand,
            model: input.model,
            variant: input.variant,
            year: input.year,
            plate: input.plate,
            color: input.color,
            transmission: input.transmission,
            category: input.category,
            fuelType: input.fuelType,
            capacity: input.capacity,
            luggageCount: input.luggageCount,
            mileage: input.mileage,
            facilities: input.facilities,
            description: input.description,
            status: input.status,
            featured: input.featured,
          },
          include: { rate: true },
        });
        await this.audit.record(transaction, {
          actorId: input.actorId,
          action: 'VEHICLE_CREATED',
          objectType: 'VEHICLE',
          objectId: created.id,
          after: auditSnapshot(created),
        });
        return created;
      });
      return this.detail(vehicle.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'PLATE_TAKEN',
          message: 'Plat nomor sudah terdaftar pada armada lain.',
        });
      }
      throw error;
    }
  }

  async update(id: string, input: VehicleUpdate & Actor): Promise<AdminVehicleDetail> {
    if (input.status !== undefined) assertManageableStatus(input.status);
    const before = await this.requireVehicle(id);
    try {
      await this.database.$transaction(async (transaction) => {
        const updated = await transaction.vehicle.update({
          where: { id },
          data: {
            ...(input.brand !== undefined && { brand: input.brand }),
            ...(input.model !== undefined && { model: input.model }),
            ...(input.variant !== undefined && { variant: input.variant }),
            ...(input.year !== undefined && { year: input.year }),
            ...(input.plate !== undefined && { plate: input.plate }),
            ...(input.color !== undefined && { color: input.color }),
            ...(input.transmission !== undefined && { transmission: input.transmission }),
            ...(input.category !== undefined && { category: input.category }),
            ...(input.fuelType !== undefined && { fuelType: input.fuelType }),
            ...(input.capacity !== undefined && { capacity: input.capacity }),
            ...(input.luggageCount !== undefined && { luggageCount: input.luggageCount }),
            ...(input.mileage !== undefined && { mileage: input.mileage }),
            ...(input.facilities !== undefined && { facilities: input.facilities }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.featured !== undefined && { featured: input.featured }),
          },
          include: { rate: true },
        });
        await this.audit.record(transaction, {
          actorId: input.actorId,
          action: 'VEHICLE_UPDATED',
          objectType: 'VEHICLE',
          objectId: id,
          before: auditSnapshot(before),
          after: auditSnapshot(updated),
        });
      });
      return this.detail(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException({
            code: 'PLATE_TAKEN',
            message: 'Plat nomor sudah terdaftar pada armada lain.',
          });
        }
        if (error.code === 'P2025') throw notFound();
      }
      throw error;
    }
  }

  async remove(id: string, admin: AuthenticatedAdmin): Promise<void> {
    const before = await this.requireVehicle(id);
    await this.database.$transaction(async (transaction) => {
      await transaction.vehicle.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      });
      await this.audit.record(transaction, {
        actorId: admin.user.id,
        action: 'VEHICLE_DELETED',
        objectType: 'VEHICLE',
        objectId: id,
        before: auditSnapshot(before),
      });
    });
  }

  async stagePhotos(
    id: string,
    files: ReadonlyArray<{ contentType: 'image/jpeg' | 'image/png'; byteLength: number }>,
    admin: AuthenticatedAdmin,
  ): Promise<VehiclePhotoUploadResponse> {
    const vehicle = await this.requireVehicle(id);
    const lastPhoto = await this.database.vehiclePhoto.findFirst({
      where: { vehicleId: vehicle.id },
      orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
      select: { sortOrder: true },
    });
    const firstSortOrder = (lastPhoto?.sortOrder ?? -1) + 1;

    const staged = await Promise.all(
      files.map((file) =>
        this.storage.createStagingUpload({
          ownerId: vehicle.id,
          contentType: file.contentType,
          byteLength: file.byteLength,
        }),
      ),
    );

    const uploads = await this.database.$transaction(async (transaction) => {
      const created = [];
      for (const [index, upload] of staged.entries()) {
        created.push(
          await transaction.vehiclePhoto.create({
            data: { vehicleId: vehicle.id, objectKey: upload.objectKey, sortOrder: firstSortOrder + index },
          }),
        );
      }
      await this.audit.record(transaction, {
        actorId: admin.user.id,
        action: 'VEHICLE_PHOTOS_UPLOADED',
        objectType: 'VEHICLE',
        objectId: vehicle.id,
        after: {
          photoIds: created.map((photo) => photo.id),
          sortOrderFrom: firstSortOrder,
          count: created.length,
        },
      });
      return created.map((photo, index) => ({
        photoId: photo.id,
        objectKey: photo.objectKey,
        url: staged[index]?.url ?? '',
        expiresIn: staged[index]?.expiresIn ?? 0,
        sortOrder: photo.sortOrder,
      }));
    });
    return { uploads };
  }

  async deletePhoto(vehicleId: string, photoId: string, admin: AuthenticatedAdmin): Promise<void> {
    const vehicle = await this.requireVehicle(vehicleId);
    await this.database.$transaction(async (transaction) => {
      const deleted = await transaction.vehiclePhoto.deleteMany({
        where: { id: photoId, vehicleId: vehicle.id },
      });
      if (deleted.count === 0) {
        throw new NotFoundException({
          code: 'PHOTO_NOT_FOUND',
          message: 'Foto kendaraan tidak ditemukan.',
        });
      }
      await this.audit.record(transaction, {
        actorId: admin.user.id,
        action: 'VEHICLE_PHOTO_DELETED',
        objectType: 'VEHICLE_PHOTO',
        objectId: photoId,
        before: { vehicleId: vehicle.id },
      });
    });
  }

  async setRate(
    id: string,
    rate: NonNullable<AdminVehicleDetail['rate']>,
    admin: AuthenticatedAdmin,
  ): Promise<AdminVehicleDetail> {
    const vehicle = await this.requireVehicle(id);
    await this.database.$transaction(async (transaction) => {
      const previous = await transaction.vehicleRate.findUnique({ where: { vehicleId: vehicle.id } });
      await transaction.vehicleRate.upsert({
        where: { vehicleId: vehicle.id },
        create: { vehicleId: vehicle.id, ...rate },
        update: rate,
      });
      await this.audit.record(transaction, {
        actorId: admin.user.id,
        action: 'VEHICLE_RATE_UPDATED',
        objectType: 'VEHICLE',
        objectId: vehicle.id,
        ...(previous ? { before: toRate(previous) as Prisma.InputJsonObject } : {}),
        after: rate as Prisma.InputJsonObject,
      });
    });
    return this.detail(id);
  }

  async addPricingRule(id: string, input: PricingRuleInput, admin: AuthenticatedAdmin) {
    const vehicle = await this.requireVehicle(id);
    const rule = await this.database.$transaction(async (transaction) => {
      const created = await transaction.pricingRule.create({
        data: {
          vehicleId: vehicle.id,
          name: input.name,
          type: input.type,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          multiplierBasisPoints: input.multiplierBasisPoints,
          fixedSurcharge: input.fixedSurcharge,
          isActive: input.isActive,
        },
      });
      await this.audit.record(transaction, {
        actorId: admin.user.id,
        action: 'PRICING_RULE_CREATED',
        objectType: 'PRICING_RULE',
        objectId: created.id,
        after: {
          vehicleId: vehicle.id,
          name: created.name,
          type: created.type,
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
          multiplierBasisPoints: created.multiplierBasisPoints,
          fixedSurcharge: created.fixedSurcharge,
          isActive: created.isActive,
        },
      });
      return created;
    });
    return {
      id: rule.id,
      vehicleId: rule.vehicleId,
      name: rule.name,
      type: rule.type,
      startDate: rule.startDate.toISOString(),
      endDate: rule.endDate.toISOString(),
      multiplierBasisPoints: rule.multiplierBasisPoints,
      fixedSurcharge: rule.fixedSurcharge,
      isActive: rule.isActive,
    };
  }
}

interface Actor {
  actorId: string;
}

interface PricingRuleInput {
  name: string;
  type: 'WEEKEND' | 'HOLIDAY' | 'HIGH_SEASON' | 'LONG_DURATION';
  startDate: string;
  endDate: string;
  multiplierBasisPoints: number | null;
  fixedSurcharge: number | null;
  isActive: boolean;
}
