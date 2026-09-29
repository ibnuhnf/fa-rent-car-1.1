import { describe, expect, it } from 'vitest';

import {
  bookingDtoSchema,
  bookingStatusSchema,
  createBookingRequestSchema,
  createPaymentRequestSchema,
  customerDtoSchema,
  documentStatusSchema,
  documentTypeSchema,
  invoiceDtoSchema,
  invoiceStatusSchema,
  paymentDtoSchema,
  pricingRuleDtoSchema,
  pricingRuleTypeSchema,
} from './index';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const uuid2 = '123e4567-e89b-42d3-a456-426614174001';
const at = '2026-09-30T02:00:00.000Z';

describe('rental DTO contracts', () => {
  it('pins the rental enums to the schema values', () => {
    expect(bookingStatusSchema.options).toEqual([
      'PENDING_VERIFICATION',
      'ACTIVE',
      'COMPLETED',
      'EXPIRED',
      'CANCELLED',
    ]);
    expect(documentTypeSchema.options).toEqual(['KTP', 'SIM_A']);
    expect(documentStatusSchema.options).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
    expect(invoiceStatusSchema.options).toEqual([
      'UNPAID',
      'PAID',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
      'VOID',
    ]);
    expect(pricingRuleTypeSchema.options).toEqual([
      'WEEKEND',
      'HOLIDAY',
      'HIGH_SEASON',
      'LONG_DURATION',
    ]);
  });

  it('never exposes a deposit field on any rental DTO', () => {
    const shapes = [
      customerDtoSchema,
      bookingDtoSchema,
      invoiceDtoSchema,
      paymentDtoSchema,
      pricingRuleDtoSchema,
    ];

    for (const schema of shapes) {
      expect(Object.keys(schema.shape)).not.toContain('deposit');
      expect(Object.keys(schema.shape)).not.toContain('depositAmount');
    }
  });

  it('requires integer rupiah for every money field', () => {
    expect(paymentDtoSchema.safeParse(basePayment({ amount: 1_500_000.5 })).success).toBe(false);
    expect(paymentDtoSchema.safeParse(basePayment({ amount: -1 })).success).toBe(false);
    expect(paymentDtoSchema.safeParse(basePayment({ amount: 1_500_000 })).success).toBe(true);

    expect(invoiceDtoSchema.safeParse(baseInvoice({ totalAmount: 0.5 })).success).toBe(false);
    expect(invoiceDtoSchema.safeParse(baseInvoice({})).success).toBe(true);
  });

  it('validates customer identity and booking code formats', () => {
    expect(customerDtoSchema.safeParse(baseCustomer({ nik: '123' })).success).toBe(false);
    expect(customerDtoSchema.safeParse(baseCustomer({ nik: '3274010101010001' })).success).toBe(
      true,
    );
    expect(
      bookingDtoSchema.safeParse(baseBooking({ bookingCode: 'FA-20260930-0001' })).success,
    ).toBe(true);
    expect(bookingDtoSchema.safeParse(baseBooking({ bookingCode: 'BOOK-1' })).success).toBe(false);
    expect(invoiceDtoSchema.safeParse(baseInvoice({ invoiceNumber: 'INV-1' })).success).toBe(false);
  });

  it('rejects empty bookings and negative or reversed items', () => {
    const request = {
      customer: {
        nik: '3274010101010001',
        name: 'Budi',
        whatsapp: '628123456789',
        address: 'Cirebon',
      },
      items: [
        {
          vehicleId: uuid,
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-10-03T00:00:00.000Z',
        },
      ],
    };

    expect(createBookingRequestSchema.parse(request)).toMatchObject({
      items: [{ withDriver: false }],
    });
    expect(createBookingRequestSchema.safeParse({ ...request, items: [] }).success).toBe(false);
    expect(
      createBookingRequestSchema.safeParse({
        ...request,
        items: [{ ...request.items[0], endDate: '2026-09-30T00:00:00.000Z' }],
      }).success,
    ).toBe(false);
  });

  it('requires a positive payment amount and rejects unknown keys', () => {
    const request = {
      invoiceId: uuid,
      amount: 0,
      paymentDate: at,
      bankName: 'BCA',
      proofObjectKey: 'payments/proof.jpg',
    };

    expect(createPaymentRequestSchema.safeParse(request).success).toBe(false);
    expect(createPaymentRequestSchema.safeParse({ ...request, amount: 500_000 }).success).toBe(
      true,
    );
    expect(
      createPaymentRequestSchema.safeParse({ ...request, amount: 500_000, deposit: 0 }).success,
    ).toBe(false);
  });
});

function baseCustomer(overrides: Record<string, unknown>) {
  return {
    id: uuid,
    nik: '3274010101010001',
    name: 'Budi',
    whatsapp: '628123456789',
    email: null,
    address: 'Cirebon',
    isBlacklisted: false,
    blacklistReason: null,
    notes: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

function baseBooking(overrides: Record<string, unknown>) {
  return {
    id: uuid,
    bookingCode: 'FA-20260930-0001',
    customerId: uuid2,
    status: 'PENDING_VERIFICATION',
    holdExpiresAt: at,
    pickupOffice: 'Kantor FA RENT CAR, Kedawung',
    notes: null,
    internalNotes: null,
    items: [],
    documents: [],
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

function baseInvoice(overrides: Record<string, unknown>) {
  return {
    id: uuid,
    invoiceNumber: 'INV-20260930-0001',
    bookingId: uuid2,
    version: 1,
    status: 'UNPAID',
    subtotal: 1_000_000,
    discount: 0,
    totalAmount: 1_000_000,
    bankAccount: { bankName: 'BCA', accountNumber: '123' },
    terms: null,
    issuedAt: at,
    paidAt: null,
    pdfObjectKey: null,
    items: [],
    ...overrides,
  };
}

function basePayment(overrides: Record<string, unknown>) {
  return {
    id: uuid,
    invoiceId: uuid2,
    amount: 1_000_000,
    paymentDate: at,
    bankName: 'BCA',
    accountHolder: null,
    proofObjectKey: 'payments/proof.jpg',
    confirmedBy: uuid2,
    confirmedAt: at,
    notes: null,
    ...overrides,
  };
}
