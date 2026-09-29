import { Injectable } from '@nestjs/common';
import type { BookingStatus, Prisma } from '@fa/db';
import { PrismaService } from '../database/prisma.service';

const BLOCKING_STATUSES: BookingStatus[] = ['ACTIVE', 'PENDING_VERIFICATION'];
const MS_PER_HOUR = 60 * 60 * 1000;

export interface AvailabilityWindow {
  from: Date;
  to: Date;
  bufferHours: number;
}

/**
 * Overlap test for one booking item against the requested window.
 * Buffer shifts the query bound instead of the stored column, so it stays
 * expressible as a plain Prisma filter: item.endDate + buffer > from
 * is equivalent to item.endDate > from - buffer.
 */
export function blockedVehicleItemsWhere(
  window: AvailabilityWindow,
): Prisma.BookingItemWhereInput {
  return {
    booking: { status: { in: BLOCKING_STATUSES } },
    startDate: { lt: window.to },
    endDate: { gt: new Date(window.from.getTime() - window.bufferHours * MS_PER_HOUR) },
  };
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly database: PrismaService) {}

  async availableVehicleIds(window: AvailabilityWindow): Promise<string[]> {
    return this.database.$transaction(async (transaction) => {
      const items = await transaction.bookingItem.findMany({
        where: blockedVehicleItemsWhere(window),
        select: { vehicleId: true },
        distinct: ['vehicleId'],
      });
      const blocked = new Set(items.map((item) => item.vehicleId));
      const vehicles = await transaction.vehicle.findMany({
        where: {
          deletedAt: null,
          status: 'AVAILABLE',
          ...(blocked.size > 0 ? { id: { notIn: [...blocked] } } : {}),
        },
        select: { id: true },
      });
      return vehicles.map((vehicle) => vehicle.id);
    });
  }
}
