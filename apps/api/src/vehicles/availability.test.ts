import { describe, expect, it } from 'vitest';
import { blockedVehicleItemsWhere, type AvailabilityWindow } from './availability.service';

describe('blockedVehicleItemsWhere', () => {
  const makeWindow = (overrides: Partial<AvailabilityWindow> = {}): AvailabilityWindow => ({
    from: new Date('2026-10-01T08:00:00.000Z'),
    to: new Date('2026-10-03T08:00:00.000Z'),
    bufferHours: 0,
    ...overrides,
  });

  it('excludes ACTIVE bookings that overlap the window', () => {
    const w = makeWindow();
    const where = blockedVehicleItemsWhere(w);
    // ACTIVE status is in the blocking set.
    expect(where.booking).toMatchObject({ status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] } });
    expect(where.booking).toMatchObject({ deletedAt: null });
  });

  it('applies symmetric buffer by shifting both window bounds', () => {
    const w = makeWindow({ from: new Date('2026-10-01T08:00:00.000Z'), to: new Date('2026-10-03T08:00:00.000Z'), bufferHours: 2 });
    const where = blockedVehicleItemsWhere(w);
    // With 2h buffer: from - 2h = Oct 1 06:00, to + 2h = Oct 3 10:00
    expect(where.startDate).toMatchObject({ lt: new Date('2026-10-03T10:00:00.000Z') });
    expect(where.endDate).toMatchObject({ gt: new Date('2026-10-01T06:00:00.000Z') });
  });

  it('uses default buffer of 0 when not specified', () => {
    const w = makeWindow({ bufferHours: undefined });
    const where = blockedVehicleItemsWhere(w);
    // Zero buffer: from - 0 = Oct 1 08:00, to + 0 = Oct 3 08:00
    expect(where.startDate).toMatchObject({ lt: new Date('2026-10-03T08:00:00.000Z') });
    expect(where.endDate).toMatchObject({ gt: new Date('2026-10-01T08:00:00.000Z') });
  });

  it('always filters out expired holds via OR clause regardless of buffer', () => {
    const w = makeWindow({ bufferHours: 0 });
    const where = blockedVehicleItemsWhere(w);
    expect(where.booking).toHaveProperty('OR');
    const or = (where.booking as Record<string, unknown>).OR as Array<Record<string, unknown>>;
    expect(or).toHaveLength(2);
    expect(or[0]).toMatchObject({ status: 'ACTIVE' });
    expect(or[1]).toMatchObject({
      status: 'PENDING_VERIFICATION',
      holdExpiresAt: { gt: expect.any(Date) },
    });
  });
});
