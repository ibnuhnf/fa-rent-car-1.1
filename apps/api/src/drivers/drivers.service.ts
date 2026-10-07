import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Driver } from '@fa/db';
import type {
  CreateDriverRequest,
  DriverDto,
  DriverListResponse,
  DriverRatingsResponse,
  DriverScheduleResponse,
  UpdateDriverRequest,
} from '@fa/shared';
import { PrismaService } from '../database/prisma.service';
import { blockedVehicleItemsWhere } from '../vehicles/availability.service';

function toDto(driver: Driver): DriverDto {
  return { ...driver, createdAt: driver.createdAt.toISOString(), updatedAt: driver.updatedAt.toISOString() };
}

@Injectable()
export class DriversService {
  constructor(private readonly database: PrismaService) {}

  async list(activeOnly = false): Promise<DriverListResponse> {
    const where = activeOnly ? { isActive: true } : {};
    const [total, rows] = await this.database.$transaction([
      this.database.driver.count({ where }),
      this.database.driver.findMany({ where, orderBy: [{ name: 'asc' }] }),
    ]);
    return {
      drivers: rows.map(toDto),
      pagination: { page: 1, limit: 100, total, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
    };
  }

  async create(input: CreateDriverRequest, actorId: string): Promise<DriverDto> {
    try {
      return await this.database.$transaction(async (transaction) => {
        const driver = await transaction.driver.create({ data: input });
        await transaction.auditLog.create({
          data: { actorId, action: 'DRIVER_CREATED', objectType: 'DRIVER', objectId: driver.id,
            after: { dailyRate: driver.dailyRate, isActive: driver.isActive } },
        });
        return toDto(driver);
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: string, input: UpdateDriverRequest, actorId: string): Promise<DriverDto> {
    try {
      return await this.database.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}::text, 0))`;
        const driver = await transaction.driver.findUnique({ where: { id } });
        if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Sopir tidak ditemukan.' });
        const updated = await transaction.driver.update({ where: { id }, data: input });
        await transaction.auditLog.create({
          data: { actorId, action: 'DRIVER_UPDATED', objectType: 'DRIVER', objectId: id,
            before: { dailyRate: driver.dailyRate, isActive: driver.isActive },
            after: { dailyRate: updated.dailyRate, isActive: updated.isActive, fields: Object.keys(input) } },
        });
        return toDto(updated);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async assignToItem(bookingItemId: string, driverId: string | null, actorId: string): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const reference = await transaction.bookingItem.findUnique({ where: { id: bookingItemId } });
      if (!reference) throw new NotFoundException({ code: 'ITEM_NOT_FOUND', message: 'Item booking tidak ditemukan.' });
      await transaction.$queryRaw`SELECT id FROM bookings WHERE id = ${reference.bookingId}::uuid FOR UPDATE`;
      const item = await transaction.bookingItem.findUnique({
        where: { id: bookingItemId }, include: { booking: true },
      });
      if (!item || item.booking.deletedAt) {
        throw new NotFoundException({ code: 'ITEM_NOT_FOUND', message: 'Item booking tidak ditemukan.' });
      }
      const driverIds = [...new Set([item.driverId, driverId].filter((id): id is string => id !== null))].sort();
      for (const id of driverIds) {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}::text, 0))`;
      }
      const now = new Date();
      if (!['ACTIVE', 'PENDING_VERIFICATION'].includes(item.booking.status)) {
        throw new ConflictException({ code: 'BOOKING_NOT_ASSIGNABLE', message: 'Status booking tidak dapat ditugaskan.' });
      }
      if (item.booking.status === 'PENDING_VERIFICATION' && item.booking.holdExpiresAt <= now) {
        throw new ConflictException({ code: 'BOOKING_EXPIRED', message: 'Hold booking telah kedaluwarsa.' });
      }
      if (driverId !== null) {
        if (!item.withDriver) {
          throw new ConflictException({ code: 'DRIVER_NOT_REQUIRED', message: 'Item booking tidak menggunakan sopir.' });
        }
        const driver = await transaction.driver.findUnique({ where: { id: driverId } });
        if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Sopir tidak ditemukan.' });
        if (!driver.isActive) throw new ConflictException({ code: 'DRIVER_INACTIVE', message: 'Sopir tidak aktif.' });
        const setting = await transaction.setting.findUnique({ where: { key: 'business' } });
        const value = setting?.value as Record<string, unknown> | null;
        const minutes = value?.bufferMinutes;
        const bufferHours = typeof minutes === 'number' && Number.isFinite(minutes) && minutes >= 0
          ? Math.ceil(minutes / 60)
          : 0;
        const conflict = await transaction.bookingItem.findFirst({
          where: {
            ...blockedVehicleItemsWhere({
              from: item.startDate,
              to: item.endDate,
              bufferHours: bufferHours,
            }),
            driverId,
            id: { not: bookingItemId },
          },
        });
        if (conflict) throw new ConflictException({ code: 'DRIVER_BUSY', message: 'Sopir sudah memiliki tugas pada rentang tanggal tersebut.' });
      }
      await transaction.bookingItem.update({ where: { id: bookingItemId }, data: { driverId } });
      await transaction.auditLog.create({
        data: { actorId, action: 'DRIVER_ASSIGNED', objectType: 'BOOKING', objectId: item.bookingId,
          before: { itemId: bookingItemId, driverId: item.driverId },
          after: { itemId: bookingItemId, driverId } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({ code: 'DRIVER_EXISTS', message: 'Nomor HP atau Nomor SIM sudah terdaftar pada sopir lain.' });
    }
    throw error;
  }

  async ratings(driverId: string): Promise<DriverRatingsResponse> {
    const driver = await this.database.driver.findUnique({ where: { id: driverId }, select: { id: true } });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Sopir tidak ditemukan.' });
    const rows = await this.database.driverRating.findMany({ where: { driverId }, orderBy: { createdAt: 'desc' } });
    return { ratings: rows.map((r) => ({ id: r.id, driverId: r.driverId, bookingId: r.bookingId, score: r.score, feedback: r.feedback, createdAt: r.createdAt.toISOString() })) };
  }

  async schedule(driverId: string): Promise<DriverScheduleResponse> {
    const driver = await this.database.driver.findUnique({ where: { id: driverId }, select: { id: true } });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Sopir tidak ditemukan.' });

    const items = await this.database.bookingItem.findMany({
      where: { driverId, booking: { deletedAt: null } },
      include: {
        booking: {
          select: { id: true, bookingCode: true, status: true, customer: { select: { name: true, whatsapp: true } } },
        },
        vehicle: { select: { brand: true, model: true, plate: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return {
      schedule: items.map((item) => ({
        id: item.id,
        bookingId: item.bookingId,
        bookingCode: item.booking.bookingCode,
        bookingStatus: item.booking.status,
        customerName: item.booking.customer.name,
        customerWhatsapp: item.booking.customer.whatsapp,
        vehicleName: `${item.vehicle.brand} ${item.vehicle.model}`,
        plate: item.vehicle.plate,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString(),
        totalAmount: item.totalAmount,
      })),
    };
  }
}
