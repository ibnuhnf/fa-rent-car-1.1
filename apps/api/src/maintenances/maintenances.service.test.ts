import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MaintenancesService } from './maintenances.service';
import type { PrismaService } from '../database/prisma.service';
import type { AuthenticatedAdmin } from '../auth/auth.types';

interface MockTx {
  vehicle: { findFirst: ReturnType<typeof vi.fn> };
  maintenance: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
}

interface MockMaintenanceDb {
  vehicle: { findFirst: ReturnType<typeof vi.fn> };
  maintenance: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction?: ReturnType<typeof vi.fn>;
}

const admin = { user: { id: 'a1', role: 'SUPERADMIN' } } as unknown as AuthenticatedAdmin;

describe('MaintenancesService', () => {
  let service: MaintenancesService;
  let db: MockMaintenanceDb;

  beforeEach(() => {
    db = {
      vehicle: { findFirst: vi.fn() },
      maintenance: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    service = new MaintenancesService(db as unknown as PrismaService);
  });

  it('list throws when vehicle missing', async () => {
    db.vehicle.findFirst.mockResolvedValue(null);
    await expect(service.list('v1')).rejects.toThrow(NotFoundException);
  });

  it('create audits and returns dto', async () => {
    const tx: MockTx = {
      vehicle: { findFirst: vi.fn().mockResolvedValue({ id: 'v1' }) },
      maintenance: { findUnique: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'm1', vehicleId: 'v1', serviceDate: new Date(), odometer: 1000, cost: 500000, description: 'Oil', nextServiceDate: null, nextOdometer: null, createdAt: new Date() }), update: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    db.$transaction = vi.fn((fn: (client: MockTx) => Promise<unknown>) => fn(tx)) as never;
    const result = await service.create(
      'v1',
      { serviceDate: new Date().toISOString(), odometer: 1000, cost: 500000, description: 'Oil' },
      admin,
    );
    expect(result.id).toBe('m1');
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('remove throws restricted', async () => {
    db.maintenance.findUnique.mockResolvedValue({ id: 'm1' });
    await expect(service.remove('m1')).rejects.toThrow(ConflictException);
  });
});
