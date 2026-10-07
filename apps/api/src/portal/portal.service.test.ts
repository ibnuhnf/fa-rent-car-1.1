import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PortalService } from './portal.service';
import type { PrismaService } from '../database/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { AuditService } from '../audit/audit.service';

interface MockPortalDb {
  booking: { findFirst: ReturnType<typeof vi.fn> };
  driverRating: { create: ReturnType<typeof vi.fn> };
}

describe('PortalService.submitDriverRating', () => {
  let service: PortalService;
  let db: MockPortalDb;

  beforeEach(() => {
    db = {
      booking: { findFirst: vi.fn() },
      driverRating: { create: vi.fn() },
    };
    service = new PortalService(
      db as unknown as PrismaService,
      {} as unknown as StorageService,
      {} as unknown as AuditService,
    );
  });

  it('rejects non-completed booking', async () => {
    db.booking.findFirst.mockResolvedValue({ status: 'ACTIVE', items: [] });
    await expect(service.submitDriverRating('b1', { driverId: 'd1', score: 5 })).rejects.toThrow(BadRequestException);
  });

  it('rejects driver not in booking', async () => {
    db.booking.findFirst.mockResolvedValue({ status: 'COMPLETED', items: [{ driverId: 'd2' }] });
    await expect(service.submitDriverRating('b1', { driverId: 'd1', score: 5 })).rejects.toThrow(BadRequestException);
  });

  it('creates rating on valid input', async () => {
    db.booking.findFirst.mockResolvedValue({ status: 'COMPLETED', items: [{ driverId: 'd1' }] });
    db.driverRating.create.mockResolvedValue({ id: 'r1', driverId: 'd1', bookingId: 'b1', score: 5, feedback: null, createdAt: new Date() });
    const result = await service.submitDriverRating('b1', { driverId: 'd1', score: 5 });
    expect(result.id).toBe('r1');
  });

  it('throws conflict on duplicate', async () => {
    db.booking.findFirst.mockResolvedValue({ status: 'COMPLETED', items: [{ driverId: 'd1' }] });
    db.driverRating.create.mockRejectedValue(Object.assign(new Error(), { code: 'P2002' }));
    await expect(service.submitDriverRating('b1', { driverId: 'd1', score: 5 })).rejects.toThrow(ConflictException);
  });
});
