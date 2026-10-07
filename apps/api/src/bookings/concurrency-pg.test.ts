import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@fa/db';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { BookingsService } from './bookings.service';

const INTEGRATION = process.env.INTEGRATION === 'true';

(INTEGRATION ? describe : describe.skip)('Booking Concurrency (PostgreSQL)', () => {
  let prisma: PrismaClient;
  let service: BookingsService;
  let vehicleId: string;
  let adminSession: {
    sessionId: string;
    expiresAt: string;
    user: { id: string; name: string; email: string; role: 'STAFF' };
  };

  beforeAll(async () => {
    if (!INTEGRATION) return;

    prisma = new PrismaClient();

    const vehicle = await prisma.vehicle.create({
      data: {
        brand: 'Toyota',
        model: 'Avanza',
        variant: '1.5 G',
        year: 2023,
        color: 'Hitam',
        category: 'MPV',
        capacity: 7,
        luggageCount: 2,
        mileage: 10000,
        description: 'Test car',
        plate: `TEST-${Date.now()}`,
        status: 'AVAILABLE',
        transmission: 'MANUAL',
        fuelType: 'GASOLINE',
        rate: {
          create: { daily: 300000, weekly: null, monthly: null, driverPerDay: 100000 },
        },
      },
    });
    vehicleId = vehicle.id;

    const adminUser = await prisma.adminUser.create({
      data: {
        email: `test-admin-${Date.now()}@test.local`,
        name: 'Test Admin',
        passwordHash: 'bcrypt$dummy',
        role: 'STAFF',
        isActive: true,
      },
    });

    adminSession = {
      sessionId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'STAFF' as const,
      },
    };

    const audit = {
      recordBooking: async () => {},
    } as never;

    const jobs = {
      scheduleHoldExpiry: async () => {},
    } as never;

    service = new BookingsService(prisma as never, audit, jobs);
  });

  afterAll(async () => {
    if (!INTEGRATION || !prisma) return;
    await prisma.bookingItem.deleteMany({ where: { vehicleId } });
    await prisma.booking.deleteMany({ where: { items: { some: { vehicleId } } } });
    await prisma.invoice.deleteMany({ where: { booking: { items: { some: { vehicleId } } } } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.$disconnect();
  });

  it('exactly one of two simultaneous creates succeeds for the same vehicle', async () => {
    if (!INTEGRATION) return;

    const input = {
      customer: {
        nik: `32090${Date.now()}`,
        name: 'Race Tester',
        whatsapp: '+628111111111',
        address: 'Cirebon',
      },
      items: [
        {
          vehicleId,
          startDate: '2026-11-01T08:00:00.000Z',
          endDate: '2026-11-03T08:00:00.000Z',
          withDriver: false,
        },
      ],
    };

    const results = await Promise.allSettled([
      service.create(input, adminSession),
      service.create(input, adminSession),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejectedReason = (rejected[0] as PromiseRejectedResult | undefined)?.reason;
    expect(rejectedReason).toBeInstanceOf(ConflictException);
  });

  it('allows sequential creates for different date ranges on the same vehicle', async () => {
    if (!INTEGRATION) return;

    const base = {
      customer: {
        nik: `32090${Date.now() + 1}`,
        name: 'Sequential Tester',
        whatsapp: '+628222222222',
        address: 'Cirebon',
      },
    };

    const first = await service.create(
      {
        ...base,
        items: [{ vehicleId, startDate: '2026-12-01T08:00:00.000Z', endDate: '2026-12-03T08:00:00.000Z', withDriver: false }],
      },
      adminSession,
    );
    expect(first.booking.status).toBe('PENDING_VERIFICATION');

    const second = await service.create(
      {
        ...base,
        items: [{ vehicleId, startDate: '2026-12-10T08:00:00.000Z', endDate: '2026-12-12T08:00:00.000Z', withDriver: false }],
      },
      adminSession,
    );
    expect(second.booking.status).toBe('PENDING_VERIFICATION');
  });
});
