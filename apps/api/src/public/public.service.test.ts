import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicService } from './public.service';

describe('PublicService', () => {
  let service: PublicService;
  let database: {
    vehicle: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
    customer: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    bookingItem: { findMany: ReturnType<typeof vi.fn> };
    booking: { create: ReturnType<typeof vi.fn> };
    invoice: { create: ReturnType<typeof vi.fn> };
    bookingAccessToken: { create: ReturnType<typeof vi.fn> };
    setting: { findUnique: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let storage: { createDownload: ReturnType<typeof vi.fn> };
  let jobs: { scheduleHoldExpiry: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    database = {
      vehicle: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
      customer: { findUnique: vi.fn(), create: vi.fn() },
      bookingItem: { findMany: vi.fn().mockResolvedValue([]) },
      booking: { create: vi.fn() },
      invoice: { create: vi.fn() },
      bookingAccessToken: { create: vi.fn() },
      setting: { findUnique: vi.fn().mockResolvedValue(null) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(database) : Promise.all(arg as Promise<unknown>[]),
      ),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    storage = { createDownload: vi.fn().mockResolvedValue('https://storage.local/photo.jpg') };
    jobs = { scheduleHoldExpiry: vi.fn().mockResolvedValue(undefined) };

    service = new PublicService(
      database as never,
      storage as never,
      jobs as never,
    );
  });

  describe('listVehicles', () => {
    it('mengembalikan daftar mobil AVAILABLE beserta paginasi', async () => {
      database.vehicle.count.mockResolvedValue(1);
      database.vehicle.findMany.mockResolvedValue([
        {
          id: 'v-1',
          brand: 'Toyota',
          model: 'Avanza',
          variant: '1.5 G MT',
          year: 2023,
          plate: 'E 1234 AB',
          color: 'Hitam',
          transmission: 'MANUAL',
          category: 'MPV',
          fuelType: 'GASOLINE',
          capacity: 7,
          luggageCount: 2,
          mileage: 15000,
          facilities: ['AC', 'Audio'],
          description: 'Nyaman untuk keluarga',
          status: 'AVAILABLE',
          featured: true,
          isDemo: false,
          rate: { daily: 350000, weekly: null, monthly: null, driverPerDay: 150000 },
          photos: [{ objectKey: 'photos/1.jpg' }],
          _count: { photos: 1 },
        },
      ]);

      const res = await service.listVehicles({ page: 1, limit: 10, sort: 'newest' });
      expect(res.vehicles).toHaveLength(1);
      expect(res.vehicles[0]?.brand).toBe('Toyota');
      expect(res.vehicles[0]?.dailyRate).toBe(350000);
      expect(res.pagination.total).toBe(1);
    });
  });

  describe('priceEstimate', () => {
    it('menghitung estimasi harga murni dengan benar', async () => {
      database.vehicle.findFirst.mockResolvedValue({
        id: 'v-1',
        status: 'AVAILABLE',
        rate: { daily: 300000, weekly: 1800000, monthly: 6000000, driverPerDay: 100000 },
      });

      const res = await service.priceEstimate({
        vehicleId: '00000000-0000-0000-0000-000000000001',
        startDate: '2026-10-10T08:00:00.000Z',
        endDate: '2026-10-13T08:00:00.000Z',
        withDriver: true,
      });

      expect(res.days).toBe(3);
      expect(res.breakdown.vehicleAmount).toBe(900000);
      expect(res.breakdown.driverAmount).toBe(300000);
      expect(res.breakdown.total).toBe(1200000);
    });

    it('melempar NotFoundException jika mobil tidak ditemukan atau status bukan AVAILABLE', async () => {
      database.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.priceEstimate({
          vehicleId: '00000000-0000-0000-0000-000000000001',
          startDate: '2026-10-10T08:00:00.000Z',
          endDate: '2026-10-11T08:00:00.000Z',
          withDriver: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBooking', () => {
    it('membuat booking, invoice v1, access token dan menjadwalkan hold expiry', async () => {
      database.customer.findUnique.mockResolvedValue(null);
      database.customer.create.mockResolvedValue({
        id: 'c-1',
        nik: '3209012345678901',
        name: 'Ahmad',
        whatsapp: '+6281234567890',
        email: null,
        address: 'Cirebon',
        notes: null,
      });
      database.vehicle.findMany.mockResolvedValue([
        {
          id: 'v-1',
          status: 'AVAILABLE',
          brand: 'Toyota',
          model: 'Avanza',
          plate: 'E 1234 AB',
          rate: { daily: 300000, weekly: null, monthly: null, driverPerDay: 100000 },
        },
      ]);
      database.bookingItem.findMany.mockResolvedValue([]);
      database.booking.create.mockResolvedValue({
        id: 'b-1',
        bookingCode: 'FA-20261007-TEST',
      });
      database.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-20261007-TEST',
        bookingId: 'b-1',
        version: 1,
        status: 'UNPAID',
        subtotal: 300000,
        discount: 0,
        totalAmount: 300000,
        bankAccount: {},
        terms: null,
        issuedAt: new Date(),
        paidAt: null,
        pdfObjectKey: null,
        items: [],
      });
      database.bookingAccessToken.create.mockResolvedValue({});

      const res = await service.createBooking({
        customer: {
          nik: '3209012345678901',
          name: 'Ahmad',
          whatsapp: '+6281234567890',
          address: 'Cirebon',
        },
        items: [
          {
            vehicleId: 'v-1',
            startDate: '2026-10-10T08:00:00.000Z',
            endDate: '2026-10-11T08:00:00.000Z',
            withDriver: false,
          },
        ],
      });

      expect(res.bookingCode).toBe('FA-20261007-TEST');
      expect(res.portalUrl).toMatch(/^\/portal\/[a-f0-9]{64}$/);
      expect(jobs.scheduleHoldExpiry).toHaveBeenCalled();
    });

    it('menolak booking bila jadwal mobil bentrok', async () => {
      database.customer.findUnique.mockResolvedValue({ id: 'c-1' });
      database.vehicle.findMany.mockResolvedValue([
        { id: 'v-1', status: 'AVAILABLE', rate: { daily: 300000 } },
      ]);
      database.bookingItem.findMany.mockResolvedValue([{ vehicleId: 'v-1' }]);

      await expect(
        service.createBooking({
          customer: {
            nik: '3209012345678901',
            name: 'Ahmad',
            whatsapp: '+6281234567890',
            address: 'Cirebon',
          },
          items: [
            {
              vehicleId: 'v-1',
              startDate: '2026-10-10T08:00:00.000Z',
              endDate: '2026-10-11T08:00:00.000Z',
              withDriver: false,
            },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validatePromo', () => {
    it('memberikan diskon untuk promo aktif', async () => {
      database.setting.findUnique.mockResolvedValue({
        key: 'promos',
        value: [{ code: 'HEMAT50', type: 'fixed', amount: 50000, isActive: true }],
      });

      const res = await service.validatePromo({ code: 'HEMAT50', subtotal: 300000 });
      expect(res.valid).toBe(true);
      expect(res.discount).toBe(50000);
    });

    it('menolak promo yang tidak ditemukan atau tidak aktif', async () => {
      database.setting.findUnique.mockResolvedValue(null);

      const res = await service.validatePromo({ code: 'INVALID', subtotal: 300000 });
      expect(res.valid).toBe(false);
      expect(res.discount).toBe(0);
    });
  });
});
