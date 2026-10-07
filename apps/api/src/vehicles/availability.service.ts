import { Injectable } from '@nestjs/common';
import type { BookingStatus, Prisma } from '@fa/db';
import { PrismaService } from '../database/prisma.service';

const BLOCKING_STATUSES: BookingStatus[] = ['ACTIVE', 'PENDING_VERIFICATION'];
const MS_PER_HOUR = 60 * 60 * 1000;
const DEFAULT_BUFFER_HOURS = 0;

export interface AvailabilityWindow {
  from: Date;
  to: Date;
  bufferHours?: number;
}

/**
 * Block booking items that overlap the window, applying buffer symmetrically
 * on both ends (shifted window = [from - buffer, to + buffer]).
 * PENDING_VERIFICATION items whose hold has already expired are excluded.
 */
export function blockedVehicleItemsWhere(
  window: AvailabilityWindow,
): Prisma.BookingItemWhereInput {
  const bufferMs = (window.bufferHours ?? DEFAULT_BUFFER_HOURS) * MS_PER_HOUR;
  const fromMinus = new Date(window.from.getTime() - bufferMs);
  const toPlus = new Date(window.to.getTime() + bufferMs);
  return {
    booking: {
      status: { in: BLOCKING_STATUSES },
      deletedAt: null,
      // Holds kedaluwarsa tidak lagi memblokir ketersediaan — selalu, buffer apa pun.
      OR: [
        { status: 'ACTIVE' },
        { status: 'PENDING_VERIFICATION', holdExpiresAt: { gt: new Date() } },
      ],
    },
    startDate: { lt: toPlus },
    endDate: { gt: fromMinus },
  };
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly database: PrismaService) {}

  /** Read bufferMinutes from business settings; default 0 if not set. */
  async defaultBufferHours(): Promise<number> {
    const setting = await this.database.setting.findUnique({ where: { key: 'business' } });
    const val = setting?.value as Record<string, unknown> | null;
    if (typeof val?.bufferMinutes === 'number' && val.bufferMinutes >= 0) {
      return Math.ceil((val.bufferMinutes as number) / 60);
    }
    return DEFAULT_BUFFER_HOURS;
  }

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
