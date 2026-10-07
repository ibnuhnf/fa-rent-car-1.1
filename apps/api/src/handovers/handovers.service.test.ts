import { GUARDS_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { HandoversController } from './handovers.controller';
import { HandoversService } from './handovers.service';

describe('HandoversController guards', () => {
  it('protects writes with admin auth and CSRF', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, HandoversController)).toEqual([AdminAuthGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, HandoversController.prototype.create)).toEqual([CsrfGuard]);
  });
});

describe('HandoversService', () => {
  let service: HandoversService;
  let db: {
    bookingItem: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    handover: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    vehicle: { update: ReturnType<typeof vi.fn> };
    booking: { update: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    payment: { aggregate: ReturnType<typeof vi.fn> };
    invoice: { create: ReturnType<typeof vi.fn> };
    setting: { findUnique: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let audit: { recordBooking: ReturnType<typeof vi.fn>; recordHandover: ReturnType<typeof vi.fn> };

  const item = {
    id: 'item-1',
    bookingId: 'booking-1',
    vehicleId: 'vehicle-1',
    surchargeAmount: 0,
    totalAmount: 1000,
    startDate: new Date('2026-10-01T00:00:00Z'),
    endDate: new Date('2026-10-02T00:00:00Z'),
    booking: { id: 'booking-1', status: 'ACTIVE', invoices: [{ version: 1 }] },
    vehicle: { id: 'vehicle-1', mileage: 100, brand: 'Toyota', model: 'Yaris', plate: 'ABC-123' },
  };
  const input = {
    type: 'CHECKIN', odometer: 120, fuelLevel: 50, notes: null,
    photoKeys: [], extraFee: 200, signedByName: 'Rani',
  } as never;

  beforeEach(() => {
    const handover = {
      id: 'handover-1', bookingItemId: 'item-1', type: 'CHECKIN', odometer: 120,
      fuelLevel: 50, notes: null, damageReport: null, photoKeys: [], extraFee: 200,
      signedByName: 'Rani', signedAt: new Date(), recordedBy: 'admin-1', createdAt: new Date(),
    };
    db = {
      bookingItem: {
        findUnique: vi.fn().mockResolvedValue(item),
        findMany: vi.fn().mockResolvedValue([{ id: 'item-1', handovers: [] }]),
        update: vi.fn().mockResolvedValue({}),
      },
      handover: { create: vi.fn().mockResolvedValue(handover), findMany: vi.fn() },
      vehicle: { update: vi.fn().mockResolvedValue({}) },
      booking: { update: vi.fn().mockResolvedValue({}), findUnique: vi.fn() },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
      invoice: { create: vi.fn().mockResolvedValue({}) },
      setting: { findUnique: vi.fn().mockResolvedValue({ value: { bankAccount: {} } }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn((fn: (transaction: unknown) => unknown) => fn(db)),
    };
    audit = {
      recordBooking: vi.fn((tx, event) => tx.auditLog.create({ data: { ...event, objectType: 'BOOKING' } })),
      recordHandover: vi.fn((tx, event) => tx.auditLog.create({ data: { ...event, objectType: 'HANDOVER' } })),
    };
    service = new HandoversService(db as never, audit as never);
  });

  it('creates surcharge invoice revision, completes booking, and audits both actions', async () => {
    db.bookingItem.findMany
      .mockResolvedValueOnce([{ ...item, totalAmount: 1200, vehicle: item.vehicle }])
      .mockResolvedValueOnce([{ id: 'item-1', handovers: [] }]);
    const result = await service.create('item-1', input, 'admin-1');
    expect(result.type).toBe('CHECKIN');
    expect(db.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subtotal: 1200, version: 2,
        items: { create: expect.arrayContaining([expect.objectContaining({ description: expect.stringContaining('Biaya Tambahan'), amount: 200 })]) },
      }),
    }));
    expect(db.booking.update).toHaveBeenCalledWith({ where: { id: 'booking-1' }, data: { status: 'COMPLETED' } });
    expect(audit.recordHandover).toHaveBeenCalledWith(db, expect.objectContaining({ action: 'HANDOVER_CREATED' }));
    expect(audit.recordBooking).toHaveBeenCalledWith(db, expect.objectContaining({ action: 'BOOKING_COMPLETED' }));
  });

  it('does not complete booking until every item is checked in', async () => {
    db.bookingItem.findMany.mockResolvedValue([{ id: 'item-1', handovers: [] }, { id: 'item-2', handovers: [] }]);
    await service.create('item-1', {
      type: 'CHECKIN', odometer: 120, fuelLevel: 50, notes: null, photoKeys: [], extraFee: 0, signedByName: 'Rani',
    } as never, 'admin-1');
    expect(db.booking.update).not.toHaveBeenCalled();
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it('renders receipt HTML with handover details', async () => {
    db.booking.findUnique.mockResolvedValue({
      bookingCode: 'FA-1', customer: { name: 'Dewi', whatsapp: '0812' }, status: 'COMPLETED', pickupOffice: 'Kantor',
      items: [{ vehicle: item.vehicle, handovers: [
        { type: 'CHECKOUT', odometer: 100, fuelLevel: 70, notes: 'Mulai', extraFee: 0, signedByName: 'Dewi', signedAt: new Date() },
        { type: 'CHECKIN', odometer: 120, fuelLevel: 50, notes: 'Baret', extraFee: 200, signedByName: 'Dewi', signedAt: new Date() },
      ] }],
    });
    const html = await service.generatePdfHtml('booking-1');
    expect(html).toContain('FA RENT CAR');
    expect(html).toContain('ABC-123');
    expect(html).toContain('Baret');
    expect(html).toContain('Dewi');
  });
});
