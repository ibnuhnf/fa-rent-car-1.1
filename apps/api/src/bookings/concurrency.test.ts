import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingsService } from './bookings.service';

describe('Booking Concurrency & Atomicity', () => {
  let service: BookingsService;
  let database: {
    customer: { upsert: ReturnType<typeof vi.fn> };
    vehicle: { findMany: ReturnType<typeof vi.fn> };
    bookingItem: { findMany: ReturnType<typeof vi.fn> };
    booking: { create: ReturnType<typeof vi.fn> };
    invoice: { create: ReturnType<typeof vi.fn> };
    setting: { findUnique: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let audit: { recordBooking: ReturnType<typeof vi.fn> };
  let jobs: { scheduleHoldExpiry: ReturnType<typeof vi.fn> };

  const dummyAdmin = {
    sessionId: '00000000-0000-0000-0000-000000000001',
    expiresAt: '2026-10-07T00:00:00.000Z',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin Test',
      email: 'admin@test.com',
      role: 'STAFF' as const,
    },
  };

  beforeEach(() => {
    database = {
      customer: {
        upsert: vi.fn().mockResolvedValue({ id: 'c-1', nik: '3209012345678901' }),
      },
      vehicle: {
        findMany: vi.fn(),
      },
      bookingItem: {
        findMany: vi.fn(),
      },
      booking: {
        create: vi.fn(),
      },
      invoice: {
        create: vi.fn(),
      },
      setting: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(database)),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    audit = { recordBooking: vi.fn().mockResolvedValue({}) };
    jobs = { scheduleHoldExpiry: vi.fn().mockResolvedValue(undefined) };

    service = new BookingsService(database as never, audit as never, jobs as never);
  });

  it('menolak request kedua saat terjadi race condition pada unit mobil yang sama', async () => {
    database.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        brand: 'Toyota',
        model: 'Avanza',
        plate: 'E 1001 AA',
        status: 'AVAILABLE',
        rate: { daily: 300000, weekly: null, monthly: null, driverPerDay: 100000 },
      },
    ]);

    // Simulasi: request pertama melihat kosong, request kedua melihat bookingItem bentrok
    database.bookingItem.findMany.mockResolvedValueOnce([{ vehicleId: 'v-1' }]);

    await expect(
      service.create(
        {
          customer: {
            nik: '3209012345678901',
            name: 'Budi',
            whatsapp: '+628111111111',
            address: 'Cirebon',
          },
          items: [
            {
              vehicleId: 'v-1',
              startDate: '2026-10-15T08:00:00.000Z',
              endDate: '2026-10-18T08:00:00.000Z',
              withDriver: false,
            },
          ],
        },
        dummyAdmin,
      ),
    ).rejects.toThrow(ConflictException);

    // Pastikan tidak ada booking yang sempat dibuat
    expect(database.booking.create).not.toHaveBeenCalled();
  });

  it('menggagalkan seluruh transaksi multi-mobil secara atomik jika salah satu mobil bentrok', async () => {
    database.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-1',
        brand: 'Toyota',
        model: 'Avanza',
        plate: 'E 1001 AA',
        status: 'AVAILABLE',
        rate: { daily: 300000 },
      },
      {
        id: 'v-2',
        brand: 'Honda',
        model: 'Brio',
        plate: 'E 2002 BB',
        status: 'AVAILABLE',
        rate: { daily: 250000 },
      },
    ]);

    // Mobil v-2 bentrok di database
    database.bookingItem.findMany.mockResolvedValue([{ vehicleId: 'v-2' }]);

    await expect(
      service.create(
        {
          customer: {
            nik: '3209012345678901',
            name: 'Siti',
            whatsapp: '+628222222222',
            address: 'Kedawung',
          },
          items: [
            {
              vehicleId: 'v-1',
              startDate: '2026-10-20T08:00:00.000Z',
              endDate: '2026-10-22T08:00:00.000Z',
              withDriver: false,
            },
            {
              vehicleId: 'v-2',
              startDate: '2026-10-20T08:00:00.000Z',
              endDate: '2026-10-22T08:00:00.000Z',
              withDriver: false,
            },
          ],
        },
        dummyAdmin,
      ),
    ).rejects.toThrow(ConflictException);

    // Keduanya gagal bersamaan — tidak ada booking parsial untuk v-1
    expect(database.booking.create).not.toHaveBeenCalled();
    expect(database.invoice.create).not.toHaveBeenCalled();
  });
});
