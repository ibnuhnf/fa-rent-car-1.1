import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import type { PrismaService } from '../database/prisma.service';

interface MockDriverDb {
  driver: { findUnique: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  driverRating: { findMany: ReturnType<typeof vi.fn> };
}

describe('DriversService.ratings', () => {
  let service: DriversService;
  let db: MockDriverDb;

  beforeEach(() => {
    db = {
      driver: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
      driverRating: { findMany: vi.fn() },
    };
    service = new DriversService(db as unknown as PrismaService);
  });

  it('throws when driver not found', async () => {
    db.driver.findUnique.mockResolvedValue(null);
    await expect(service.ratings('d1')).rejects.toThrow(NotFoundException);
  });

  it('returns mapped ratings list', async () => {
    db.driver.findUnique.mockResolvedValue({ id: 'd1' });
    db.driverRating.findMany.mockResolvedValue([
      { id: 'r1', driverId: 'd1', bookingId: 'b1', score: 5, feedback: 'Bagus', createdAt: new Date('2026-10-01T00:00:00Z') },
    ]);
    const res = await service.ratings('d1');
    expect(res.ratings).toHaveLength(1);
    expect(res.ratings[0]?.score).toBe(5);
  });
});
