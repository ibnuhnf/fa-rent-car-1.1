import { describe, expect, it } from 'vitest';
import {
  bookingCodeSchema,
  createBookingRequestSchema,
  extendHoldRequestSchema,
  invoiceNumberSchema,
} from '@fa/shared';
import {
  chargeableDays,
  formatCode,
  randomCode,
  ratePackagesFor,
} from './bookings.service';

describe('Bookings business primitives', () => {
  it('generates schema-valid booking codes and invoice numbers', () => {
    const now = new Date('2026-09-30T10:00:00.000Z');
    const bookingCode = randomCode('FA', now);
    const invoiceNumber = randomCode('INV', now);

    expect(bookingCodeSchema.safeParse(bookingCode).success).toBe(true);
    expect(invoiceNumberSchema.safeParse(invoiceNumber).success).toBe(true);
    expect(bookingCode.startsWith('FA-20260930-')).toBe(true);
    expect(invoiceNumber.startsWith('INV-20260930-')).toBe(true);
  });

  it('calculates chargeable days rounded up to 24h intervals', () => {
    const start = new Date('2026-10-01T08:00:00.000Z');
    const sameDay = new Date('2026-10-01T12:00:00.000Z');
    const nextDay = new Date('2026-10-02T08:00:00.000Z');
    const threeDaysLater = new Date('2026-10-04T08:00:00.000Z');

    expect(chargeableDays(start, sameDay)).toBe(1);
    expect(chargeableDays(start, nextDay)).toBe(1);
    expect(chargeableDays(start, threeDaysLater)).toBe(3);
  });

  it('builds rate packages combining daily, weekly, and monthly', () => {
    const rate = {
      daily: 350_000,
      weekly: 2_100_000,
      monthly: 7_500_000,
    };

    expect(ratePackagesFor(rate)).toEqual([
      { days: 1, amount: 350_000 },
      { days: 7, amount: 2_100_000 },
      { days: 30, amount: 7_500_000 },
    ]);
  });

  it('validates booking request schema and rejects invalid NIK/period', () => {
    const valid = {
      customer: {
        nik: '3209123456780001',
        name: 'Budi Santoso',
        whatsapp: '+6281234567890',
        address: 'Cirebon',
      },
      items: [
        {
          vehicleId: '123e4567-e89b-42d3-a456-426614174000',
          startDate: '2026-10-01T08:00:00.000Z',
          endDate: '2026-10-03T08:00:00.000Z',
          withDriver: true,
        },
      ],
    };

    expect(createBookingRequestSchema.safeParse(valid).success).toBe(true);

    const invalidNik = {
      ...valid,
      customer: { ...valid.customer, nik: '123' },
    };
    expect(createBookingRequestSchema.safeParse(invalidNik).success).toBe(false);

    const invalidDate = {
      ...valid,
      items: [
        {
          ...valid.items[0],
          startDate: '2026-10-05T08:00:00.000Z',
          endDate: '2026-10-01T08:00:00.000Z',
        },
      ],
    };
    expect(createBookingRequestSchema.safeParse(invalidDate).success).toBe(false);
  });

  it('validates extend hold bounds', () => {
    expect(extendHoldRequestSchema.safeParse({ minutes: 60 }).success).toBe(true);
    expect(extendHoldRequestSchema.safeParse({ minutes: 5 }).success).toBe(false);
    expect(extendHoldRequestSchema.safeParse({ minutes: 3000 }).success).toBe(false);
  });
});
