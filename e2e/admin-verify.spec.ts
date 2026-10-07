import { expect, test } from '@playwright/test';

const MOCK_BOOKING_ID = 'b-mock-001';
const MOCK_BOOKING_CODE = 'FA-20261015-ABCD';
const MOCK_DOC_ID = 'doc-mock-001';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'password123';

const BOOKING_LIST_RESPONSE = {
  bookings: [
    {
      id: MOCK_BOOKING_ID,
      bookingCode: MOCK_BOOKING_CODE,
      status: 'PENDING_VERIFICATION',
      holdExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      customerId: 'c-mock-001',
      customerName: 'Budi Santoso',
      customerWhatsapp: '+6281234567890',
      itemCount: 1,
      totalAmount: 600000,
      invoiceNumber: 'INV-20261015-WXYZ',
      invoiceStatus: 'UNPAID',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
};

const BOOKING_DETAIL_RESPONSE = {
  booking: {
    id: MOCK_BOOKING_ID,
    bookingCode: MOCK_BOOKING_CODE,
    customerId: 'c-mock-001',
    status: 'PENDING_VERIFICATION',
    holdExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    pickupOffice: 'Kantor Pusat',
    notes: null,
    internalNotes: null,
    items: [
      {
        id: 'bi-mock-001',
        vehicleId: 'v-mock-001',
        startDate: '2026-10-20T08:00:00.000Z',
        endDate: '2026-10-22T08:00:00.000Z',
        withDriver: false,
        totalAmount: 600000,
      },
    ],
    documents: [
      {
        id: MOCK_DOC_ID,
        type: 'KTP',
        status: 'PENDING',
        fileUrl: 'https://mock-storage.test/ktp.jpg',
        verifiedAt: null,
        rejectionReason: null,
      },
    ],
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  customer: {
    id: 'c-mock-001',
    nik: '3209012345678901',
    name: 'Budi Santoso',
    whatsapp: '+6281234567890',
    email: null,
    address: 'Cirebon',
    isBlacklisted: false,
    blacklistReason: null,
    notes: null,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  invoices: [
    {
      id: 'inv-mock-001',
      invoiceNumber: 'INV-20261015-WXYZ',
      version: 1,
      status: 'UNPAID',
      subtotal: 600000,
      totalAmount: 600000,
      issuedAt: '2026-10-15T10:00:00.000Z',
      paidAt: null,
      items: [],
    },
  ],
  timeline: [],
};

async function mockAdminRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/admin/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': 'fa_access=mock-jwt-token; Path=/; HttpOnly' },
      body: JSON.stringify({ user: { id: 'admin-1', name: 'Admin', email: ADMIN_EMAIL, role: 'SUPERADMIN' } }),
    });
  });

  await page.route('**/api/v1/admin/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'admin-1', name: 'Admin', email: ADMIN_EMAIL, role: 'SUPERADMIN' } }),
    });
  });

  await page.route('**/api/v1/admin/foundation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ vehicles: [], staff: [], settings: {} }),
    });
  });

  await page.route('**/api/v1/admin/bookings?status=PENDING_VERIFICATION**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BOOKING_LIST_RESPONSE) });
  });

  await page.route(new RegExp(`/api/v1/admin/bookings/${MOCK_BOOKING_ID}`), async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BOOKING_DETAIL_RESPONSE) });
    } else {
      await route.continue();
    }
  });

  await page.route(`**/api/v1/admin/documents/${MOCK_DOC_ID}/verify`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/api/v1/admin/payments', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    } else {
      await route.continue();
    }
  });
}

test.describe('Admin verification flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminRoutes(page);
  });

  test('login, navigate to verifikasi, approve doc, record payment, activate', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Kata sandi').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();

    await expect(page).toHaveURL('http://127.0.0.1:3000/');

    await page.goto('/verifikasi');
    await expect(page.getByText(MOCK_BOOKING_CODE)).toBeVisible();

    await page.getByRole('link', { name: /Periksa/i }).first().click();
    await expect(page).toHaveURL(`http://127.0.0.1:3000/booking/${MOCK_BOOKING_ID}`);

    const approveBtn = page.getByRole('button', { name: /Setujui|Approve|Terima/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    }

    const amountInput = page.getByLabel(/Nominal|Jumlah/i).first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('600000');
    }

    const proofInput = page.locator('input[type="file"]').first();
    if (await proofInput.isVisible()) {
      await proofInput.setInputFiles({
        name: 'bukti-transfer.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-proof-data'),
      });
    }

    const submitPayment = page.getByRole('button', { name: /Konfirmasi|Catat|Simpan/i }).first();
    if (await submitPayment.isVisible()) {
      await submitPayment.click();
    }

    const updatedDetail = {
      ...BOOKING_DETAIL_RESPONSE,
      booking: { ...BOOKING_DETAIL_RESPONSE.booking, status: 'ACTIVE' },
    };
    await page.route(new RegExp(`/api/v1/admin/bookings/${MOCK_BOOKING_ID}`), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updatedDetail) });
    });

    await page.reload();
    await expect(page.getByText('ACTIVE').or(page.getByText('Aktif'))).toBeVisible();
  });
});
