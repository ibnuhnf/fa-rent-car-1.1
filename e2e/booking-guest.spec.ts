import { expect, test } from '@playwright/test';

const MOCK_VEHICLE_ID = 'v-mock-001';
const MOCK_BOOKING_CODE = 'FA-20261015-ABCD';
const MOCK_TOKEN = 'a'.repeat(64);
const MOCK_INVOICE = 'INV-20261015-WXYZ';
const MOCK_HOLD = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const VEHICLE_LIST_RESPONSE = {
  vehicles: [
    {
      id: MOCK_VEHICLE_ID,
      brand: 'Toyota',
      model: 'Avanza',
      variant: '1.5 G',
      plate: 'E 1234 AA',
      status: 'AVAILABLE',
      rate: { daily: 300000, weekly: 1800000, monthly: null, driverPerDay: 100000 },
      imageUrl: null,
      seats: 7,
      transmission: 'MANUAL',
      fuelType: 'BENSIN',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
};

const CREATE_BOOKING_RESPONSE = {
  booking: {
    id: 'b-mock-001',
    bookingCode: MOCK_BOOKING_CODE,
    customerId: 'c-mock-001',
    status: 'PENDING_VERIFICATION',
    holdExpiresAt: MOCK_HOLD,
    pickupOffice: 'Kantor Pusat',
    notes: null,
    internalNotes: null,
    items: [
      {
        id: 'bi-mock-001',
        vehicleId: MOCK_VEHICLE_ID,
        startDate: '2026-10-20T08:00:00.000Z',
        endDate: '2026-10-22T08:00:00.000Z',
        withDriver: false,
        totalAmount: 600000,
      },
    ],
    documents: [],
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  invoice: {
    id: 'inv-mock-001',
    invoiceNumber: MOCK_INVOICE,
    bookingId: 'b-mock-001',
    version: 1,
    status: 'UNPAID',
    subtotal: 600000,
    totalAmount: 600000,
    issuedAt: '2026-10-15T10:00:00.000Z',
    paidAt: null,
    bankAccount: { bankName: 'BCA', accountNumber: '1234567890', accountHolder: 'FA RENT CAR' },
    items: [],
  },
};

const PORTAL_ME_RESPONSE = {
  booking: {
    id: 'b-mock-001',
    bookingCode: MOCK_BOOKING_CODE,
    status: 'PENDING_VERIFICATION',
    holdExpiresAt: MOCK_HOLD,
    items: [],
    documents: [],
  },
  invoices: [],
  timeline: [
    {
      id: 'log-1',
      action: 'BOOKING_CREATED',
      actorId: null,
      actorName: null,
      before: null,
      after: { bookingCode: MOCK_BOOKING_CODE },
      createdAt: '2026-10-15T10:00:00.000Z',
    },
  ],
};

async function mockGuestBookingRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/public/vehicles**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VEHICLE_LIST_RESPONSE) });
  });

  await page.route('**/api/v1/public/bookings', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(CREATE_BOOKING_RESPONSE) });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/public/upload-url**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uploadUrl: 'https://mock-storage.test/upload', fileUrl: 'https://mock-storage.test/file.jpg' }),
    });
  });

  await page.route('https://mock-storage.test/upload', async (route) => {
    await route.fulfill({ status: 200, body: 'ok' });
  });

  await page.route(`**/api/v1/portal/${MOCK_TOKEN}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PORTAL_ME_RESPONSE) });
  });
}

test.describe('Guest booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockGuestBookingRoutes(page);
  });

  test('browse, select, book, verify redirect, open portal', async ({ page }) => {
    await page.goto('http://127.0.0.1:3001/mobil');
    await expect(page.getByText('Toyota Avanza')).toBeVisible();

    await page.getByRole('link', { name: /Lihat Detail|Pilih/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/mobil/${MOCK_VEHICLE_ID}`));

    await page.getByRole('button', { name: /Pesan|Lanjut/i }).first().click();
    await expect(page).toHaveURL(/\/pesan/);

    await page.getByLabel(/Nama/i).fill('Budi Santoso');
    await page.getByLabel(/NIK/i).fill('3209012345678901');
    await page.getByLabel(/WhatsApp/i).fill('+6281234567890');
    await page.getByLabel(/Alamat/i).fill('Jl. Pilang Raya No. 10, Cirebon');

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'ktp.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });
    }

    await page.getByRole('button', { name: /Kirim|Pesan|Submit/i }).first().click();

    await expect(page).toHaveURL(/\/sukses/);
    await expect(page.getByText(MOCK_BOOKING_CODE)).toBeVisible();
    await expect(page.getByText('Pemesanan Berhasil Dibuat!')).toBeVisible();

    const portalLink = page.getByRole('link', { name: /Buka Portal/i });
    if (await portalLink.isVisible()) {
      await portalLink.click();
      await expect(page).toHaveURL(`http://127.0.0.1:3001/portal/${MOCK_TOKEN}`);
      await expect(page.getByText('PENDING_VERIFICATION')).toBeVisible();
    }
  });

  test('shows vehicle unavailable error on conflict', async ({ page }) => {
    await page.route('**/api/v1/public/bookings', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'VEHICLE_UNAVAILABLE', message: 'Mobil yang dipilih sudah dibooking pada rentang tanggal tersebut.', details: [] },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://127.0.0.1:3001/pesan');
    await page.getByLabel(/Nama/i).fill('Budi Santoso');
    await page.getByLabel(/NIK/i).fill('3209012345678901');
    await page.getByLabel(/WhatsApp/i).fill('+6281234567890');
    await page.getByLabel(/Alamat/i).fill('Cirebon');
    await page.getByRole('button', { name: /Kirim|Pesan|Submit/i }).first().click();

    await expect(page.getByText(/sudah dibooking|tidak tersedia/i)).toBeVisible();
  });
});
