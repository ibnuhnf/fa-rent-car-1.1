import { z } from 'zod';

import { isoDateTimeSchema } from '../schemas';

/**
 * Rental DTO contracts (PRD §12). Money is always a non-negative integer rupiah —
 * never a float/decimal — and there is no deposit field anywhere by design.
 */

export const bookingStatusSchema = z.enum([
  'PENDING_VERIFICATION',
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
]);

export const documentTypeSchema = z.enum(['KTP', 'SIM_A']);

export const documentStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const invoiceStatusSchema = z.enum([
  'UNPAID',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'VOID',
]);

export const pricingRuleTypeSchema = z.enum(['WEEKEND', 'HOLIDAY', 'HIGH_SEASON', 'LONG_DURATION']);

const moneySchema = z.number().int().nonnegative();
const bankAccountSchema = z.record(z.string(), z.unknown());

export const bookingCodeSchema = z.string().regex(/^FA-\d{8}-[A-Z0-9]{4}$/);
export const invoiceNumberSchema = z.string().regex(/^INV-\d{8}-[A-Z0-9]{4}$/);
export const nikSchema = z.string().regex(/^\d{16}$/);
export const whatsappSchema = z.string().regex(/^\+?\d{8,15}$/);

export const customerDtoSchema = z.object({
  id: z.uuid(),
  nik: nikSchema,
  name: z.string(),
  whatsapp: whatsappSchema,
  email: z.string().email().nullable(),
  address: z.string(),
  isBlacklisted: z.boolean(),
  blacklistReason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const bookingItemDtoSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  vehicleId: z.uuid(),
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  withDriver: z.boolean(),
  driverPerDay: moneySchema,
  driverId: z.uuid().nullable(),
  vehicleAmount: moneySchema,
  driverAmount: moneySchema,
  surchargeAmount: moneySchema,
  promoDiscount: moneySchema,
  totalAmount: moneySchema,
  snapshot: z.record(z.string(), z.unknown()),
});

export const bookingDocumentDtoSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  type: documentTypeSchema,
  objectKey: z.string(),
  status: documentStatusSchema,
  rejectionReason: z.string().nullable(),
  verifiedBy: z.uuid().nullable(),
  verifiedAt: isoDateTimeSchema.nullable(),
});

export const bookingDtoSchema = z.object({
  id: z.uuid(),
  bookingCode: bookingCodeSchema,
  customerId: z.uuid(),
  status: bookingStatusSchema,
  holdExpiresAt: isoDateTimeSchema,
  pickupOffice: z.string(),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  items: z.array(bookingItemDtoSchema),
  documents: z.array(bookingDocumentDtoSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const invoiceItemDtoSchema = z.object({
  id: z.uuid(),
  invoiceId: z.uuid(),
  description: z.string(),
  quantity: z.number().int().nonnegative(),
  unitPrice: moneySchema,
  amount: moneySchema,
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const invoiceDtoSchema = z.object({
  id: z.uuid(),
  invoiceNumber: invoiceNumberSchema,
  bookingId: z.uuid(),
  version: z.number().int().positive(),
  status: invoiceStatusSchema,
  subtotal: moneySchema,
  discount: moneySchema,
  totalAmount: moneySchema,
  bankAccount: bankAccountSchema,
  terms: z.string().nullable(),
  issuedAt: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.nullable(),
  pdfObjectKey: z.string().nullable(),
  items: z.array(invoiceItemDtoSchema),
});

export const paymentDtoSchema = z.object({
  id: z.uuid(),
  invoiceId: z.uuid(),
  amount: moneySchema,
  paymentDate: isoDateTimeSchema,
  bankName: z.string(),
  accountHolder: z.string().nullable(),
  proofObjectKey: z.string(),
  confirmedBy: z.uuid(),
  confirmedAt: isoDateTimeSchema,
  notes: z.string().nullable(),
});

export const pricingRuleDtoSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid().nullable(),
  name: z.string(),
  type: pricingRuleTypeSchema,
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  multiplierBasisPoints: moneySchema.nullable(),
  fixedSurcharge: moneySchema.nullable(),
  isActive: z.boolean(),
});

export const createCustomerRequestSchema = z
  .object({
    nik: nikSchema,
    name: z.string().trim().min(1),
    whatsapp: whatsappSchema,
    email: z.string().trim().toLowerCase().email().nullable().optional(),
    address: z.string().trim().min(1),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const createBookingItemRequestSchema = z
  .object({
    vehicleId: z.uuid(),
    startDate: isoDateTimeSchema,
    endDate: isoDateTimeSchema,
    withDriver: z.boolean().default(false),
  })
  .strict()
  .refine(({ startDate, endDate }) => new Date(endDate) >= new Date(startDate), {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  });

export const createBookingRequestSchema = z
  .object({
    customer: createCustomerRequestSchema,
    items: z.array(createBookingItemRequestSchema).min(1),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const createPaymentRequestSchema = z
  .object({
    invoiceId: z.uuid(),
    amount: z.number().int().positive(),
    paymentDate: isoDateTimeSchema,
    bankName: z.string().trim().min(1),
    accountHolder: z.string().trim().min(1).nullable().optional(),
    proofObjectKey: z.string().trim().min(1),
    notes: z.string().nullable().optional(),
  })
  .strict();

export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type PricingRuleType = z.infer<typeof pricingRuleTypeSchema>;
export type CustomerDto = z.infer<typeof customerDtoSchema>;
export type BookingItemDto = z.infer<typeof bookingItemDtoSchema>;
export type BookingDocumentDto = z.infer<typeof bookingDocumentDtoSchema>;
export type BookingDto = z.infer<typeof bookingDtoSchema>;
export type InvoiceItemDto = z.infer<typeof invoiceItemDtoSchema>;
export type InvoiceDto = z.infer<typeof invoiceDtoSchema>;
export type PaymentDto = z.infer<typeof paymentDtoSchema>;
export type PricingRuleDto = z.infer<typeof pricingRuleDtoSchema>;
export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;
export type CreateBookingItemRequest = z.infer<typeof createBookingItemRequestSchema>;
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;
export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;
