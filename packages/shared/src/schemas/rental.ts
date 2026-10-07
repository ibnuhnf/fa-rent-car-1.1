import { z } from 'zod';

import { MAX_UPLOAD_BYTES } from '../constants';
import {
  isoDateTimeSchema,
  paginationMetadataSchema,
  pricingRuleSchema,
  pricingRuleTypeSchema,
  vehicleCategorySchema,
  vehicleFuelTypeSchema,
  vehiclePhotoSchema,
  vehicleRateSchema,
  vehicleStatusSchema,
  vehicleTransmissionSchema,
} from '../schemas';

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
    driverId: z.uuid().nullable().optional(),
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

const listPaginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const bookingListQuerySchema = z
  .object({
    ...listPaginationFields,
    status: bookingStatusSchema.optional(),
    search: z.string().trim().max(80).optional(),
    customerId: z.uuid().optional(),
    vehicleId: z.uuid().optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    sort: z.enum(['newest', 'oldest', 'hold_asc']).default('newest'),
  })
  .strict()
  .refine(({ from, to }) => from === undefined || to === undefined || new Date(to) > new Date(from), {
    path: ['to'],
    message: 'to must be after from',
  });

// Ringkasan list sengaja tidak membawa snapshot item penuh.
export const bookingSummarySchema = z.object({
  id: z.uuid(),
  bookingCode: bookingCodeSchema,
  status: bookingStatusSchema,
  holdExpiresAt: isoDateTimeSchema,
  customerId: z.uuid(),
  customerName: z.string(),
  customerWhatsapp: whatsappSchema,
  itemCount: z.number().int().positive(),
  totalAmount: moneySchema,
  invoiceNumber: invoiceNumberSchema.nullable(),
  invoiceStatus: invoiceStatusSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const bookingListResponseSchema = z.object({
  bookings: z.array(bookingSummarySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
  }),
});

export const bookingTimelineEntrySchema = z.object({
  id: z.uuid(),
  action: z.string(),
  actorId: z.uuid().nullable(),
  actorName: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  createdAt: isoDateTimeSchema,
});

export const bookingDetailResponseSchema = z.object({
  booking: bookingDtoSchema,
  customer: customerDtoSchema,
  invoices: z.array(invoiceDtoSchema),
  timeline: z.array(bookingTimelineEntrySchema),
});

export const createBookingResponseSchema = z.object({
  booking: bookingDtoSchema,
  invoice: invoiceDtoSchema,
});

export const extendHoldRequestSchema = z
  .object({
    minutes: z.number().int().min(15).max(24 * 60),
  })
  .strict();

export const extendHoldResponseSchema = z.object({
  id: z.uuid(),
  holdExpiresAt: isoDateTimeSchema,
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
export type BookingSummary = z.infer<typeof bookingSummarySchema>;
export type BookingListResponse = z.infer<typeof bookingListResponseSchema>;
export type BookingTimelineEntry = z.infer<typeof bookingTimelineEntrySchema>;
export type BookingDetailResponse = z.infer<typeof bookingDetailResponseSchema>;
export type CreateBookingResponse = z.infer<typeof createBookingResponseSchema>;
export type ExtendHoldRequest = z.infer<typeof extendHoldRequestSchema>;
export type ExtendHoldResponse = z.infer<typeof extendHoldResponseSchema>;

export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
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

export const calendarQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    vehicleId: z.uuid().optional(),
  })
  .refine(({ from, to }) => new Date(to) > new Date(from), {
    path: ['to'],
    message: 'to must be after from',
  });

export const calendarSlotSchema = z.object({
  vehicleId: z.uuid(),
  vehicleName: z.string(),
  plate: z.string(),
  bookingCode: z.string(),
  status: bookingStatusSchema,
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
});

export const calendarVehicleSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  plate: z.string(),
  status: z.enum(['AVAILABLE', 'RENTED', 'HELD', 'MAINTENANCE', 'INACTIVE']),
});

export const calendarResponseSchema = z.object({
  vehicles: z.array(calendarVehicleSchema),
  slots: z.array(calendarSlotSchema),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CalendarSlot = z.infer<typeof calendarSlotSchema>;
export type CalendarVehicle = z.infer<typeof calendarVehicleSchema>;
export type CalendarResponse = z.infer<typeof calendarResponseSchema>;

export const verifyDocumentRequestSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(({ decision, reason }) => decision !== 'REJECTED' || (reason && reason.length > 0), {
    path: ['reason'],
    message: 'Alasan penolakan wajib diisi',
  });

export const adminCreatePaymentRequestSchema = z
  .object({
    amount: z.number().int().positive(),
    paidAt: isoDateTimeSchema,
    bank: z.string().trim().min(1),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const cancelBookingRequestSchema = z
  .object({
    reason: z.string().trim().min(1),
  })
  .strict();

export const documentWithUrlSchema = bookingDocumentDtoSchema.extend({
  viewUrl: z.string().nullable(),
});

export const bookingDocumentsResponseSchema = z.object({
  documents: z.array(documentWithUrlSchema),
});

export const paymentSummarySchema = z.object({
  id: z.uuid(),
  amount: moneySchema,
  paymentDate: isoDateTimeSchema,
  bankName: z.string(),
  accountHolder: z.string().nullable(),
  confirmedBy: z.uuid(),
  confirmedAt: isoDateTimeSchema,
  notes: z.string().nullable(),
});

export const cancelBookingResponseSchema = z.object({
  id: z.uuid(),
  status: bookingStatusSchema,
});

export const verifyDocumentResponseSchema = z.object({
  document: bookingDocumentDtoSchema,
  bookingStatus: bookingStatusSchema,
});

export const adminPaymentResponseSchema = z.object({
  payment: paymentSummarySchema,
  bookingStatus: bookingStatusSchema,
  paidTotal: moneySchema,
  invoiceTotal: moneySchema,
  invoiceStatus: invoiceStatusSchema,
});

export type VerifyDocumentRequest = z.infer<typeof verifyDocumentRequestSchema>;
export type AdminCreatePaymentRequest = z.infer<typeof adminCreatePaymentRequestSchema>;
export type CancelBookingRequest = z.infer<typeof cancelBookingRequestSchema>;
export type DocumentWithUrl = z.infer<typeof documentWithUrlSchema>;
export type BookingDocumentsResponse = z.infer<typeof bookingDocumentsResponseSchema>;
export type PaymentSummary = z.infer<typeof paymentSummarySchema>;
export type CancelBookingResponse = z.infer<typeof cancelBookingResponseSchema>;
export type VerifyDocumentResponse = z.infer<typeof verifyDocumentResponseSchema>;
export type AdminPaymentResponse = z.infer<typeof adminPaymentResponseSchema>;

// Revisi booking (Fase 1.4): perpanjangan, ganti/jumlah mobil. Invoice baru immutable.
export const updateBookingItemRequestSchema = z
  .object({
    startDate: isoDateTimeSchema.optional(),
    endDate: isoDateTimeSchema.optional(),
    withDriver: z.boolean().optional(),
  })
  .strict()
  .refine(({ startDate, endDate }) => startDate === undefined || endDate === undefined || new Date(endDate) > new Date(startDate), {
    path: ['endDate'],
    message: 'endDate must be after startDate',
  });

export const addBookingItemRequestSchema = createBookingItemRequestSchema;

export const invoiceRevisionDtoSchema = invoiceDtoSchema;

export const bookingRevisionResponseSchema = z.object({
  booking: bookingDtoSchema,
  invoice: invoiceDtoSchema,
});

export type UpdateBookingItemRequest = z.infer<typeof updateBookingItemRequestSchema>;
export type AddBookingItemRequest = z.infer<typeof addBookingItemRequestSchema>;
export type BookingRevisionResponse = z.infer<typeof bookingRevisionResponseSchema>;

// --- Public & Portal Schemas (Fase 2) ---

export const publicVehicleSortSchema = z.enum(['price_asc', 'price_desc', 'newest']);

export const publicVehicleListQuerySchema = z
  .object({
    ...listPaginationFields,
    category: vehicleCategorySchema.optional(),
    transmission: vehicleTransmissionSchema.optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
    maxPrice: z.coerce.number().int().positive().optional(),
    sort: publicVehicleSortSchema.default('newest'),
  })
  .strict();

export const publicVehicleDtoSchema = z.object({
  id: z.uuid(),
  brand: z.string(),
  model: z.string(),
  variant: z.string(),
  year: z.number().int(),
  plate: z.string(),
  color: z.string(),
  transmission: vehicleTransmissionSchema,
  category: vehicleCategorySchema,
  fuelType: vehicleFuelTypeSchema,
  capacity: z.number().int(),
  luggageCount: z.number().int(),
  mileage: z.number().int(),
  facilities: z.array(z.string()),
  description: z.string(),
  status: vehicleStatusSchema,
  featured: z.boolean(),
  isDemo: z.boolean(),
  dailyRate: moneySchema.nullable(),
  rate: vehicleRateSchema.nullable(),
  primaryPhotoUrl: z.string().nullable(),
  photoCount: z.number().int().nonnegative(),
});

export const publicVehicleListResponseSchema = z.object({
  vehicles: z.array(publicVehicleDtoSchema),
  pagination: paginationMetadataSchema,
});

export const publicVehicleDetailResponseSchema = publicVehicleDtoSchema.extend({
  photos: z.array(vehiclePhotoSchema),
  pricingRules: z.array(pricingRuleSchema),
});

export const priceEstimateRequestSchema = z
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

export const priceEstimateBreakdownSchema = z.object({
  selectedRatePackages: z.array(
    z.object({
      days: z.number().int().positive(),
      amount: moneySchema,
      quantity: z.number().int().positive(),
    }),
  ),
  vehicleAmount: moneySchema,
  driverAmount: moneySchema,
  surchargeAmount: moneySchema,
  subtotal: moneySchema,
  promoDiscount: moneySchema,
  total: moneySchema,
});

export const priceEstimateResponseSchema = z.object({
  days: z.number().int().positive(),
  breakdown: priceEstimateBreakdownSchema,
});

export const publicCreateBookingRequestSchema = z
  .object({
    customer: createCustomerRequestSchema,
    items: z.array(createBookingItemRequestSchema).min(1),
    promoCode: z.string().trim().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const publicCreateBookingResponseSchema = z.object({
  bookingCode: bookingCodeSchema,
  invoice: invoiceDtoSchema,
  portalUrl: z.string(),
  holdExpiresAt: isoDateTimeSchema,
});

export const validatePromoRequestSchema = z
  .object({
    code: z.string().trim().min(1),
    subtotal: moneySchema,
  })
  .strict();

export const validatePromoResponseSchema = z.object({
  valid: z.boolean(),
  discount: moneySchema,
});

// Portal read-only: tanpa catatan internal staf dan tanpa object key mentah.
export const portalMeResponseSchema = z.object({
  booking: bookingDtoSchema
    .omit({ internalNotes: true, documents: true })
    .extend({
      items: z.array(
        bookingItemDtoSchema.extend({
          vehicle: z
            .object({
              id: z.uuid(),
              brand: z.string(),
              model: z.string(),
              variant: z.string(),
              plate: z.string(),
              category: vehicleCategorySchema,
              transmission: vehicleTransmissionSchema,
            })
            .optional(),
        }),
      ),
      documents: z.array(bookingDocumentDtoSchema.omit({ objectKey: true })),
    }),
  invoices: z.array(invoiceDtoSchema.omit({ pdfObjectKey: true })),
  payments: z.array(paymentDtoSchema.omit({ proofObjectKey: true, confirmedBy: true })),
});

export const portalDocumentStagingRequestSchema = z
  .object({
    type: documentTypeSchema,
    contentType: z.enum(['image/jpeg', 'image/png']),
    byteLength: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  })
  .strict();

export const portalDocumentStagingResponseSchema = z.object({
  objectKey: z.string(),
  uploadUrl: z.string(),
  expiresIn: z.number().int().positive(),
});

export const portalDocumentConfirmRequestSchema = z
  .object({
    type: documentTypeSchema,
    objectKey: z.string().min(1),
  })
  .strict();

export const portalDocumentConfirmResponseSchema = z.object({
  document: bookingDocumentDtoSchema,
});

export const portalRequestChangeSchema = z
  .object({
    kind: z.enum(['EXTEND', 'CHANGE']),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const portalRequestChangeResponseSchema = z.object({
  success: z.literal(true),
});

export type PublicVehicleSort = z.infer<typeof publicVehicleSortSchema>;
export type PublicVehicleListQuery = z.infer<typeof publicVehicleListQuerySchema>;
export type PublicVehicleDto = z.infer<typeof publicVehicleDtoSchema>;
export type PublicVehicleListResponse = z.infer<typeof publicVehicleListResponseSchema>;
export type PublicVehicleDetailResponse = z.infer<typeof publicVehicleDetailResponseSchema>;
export type PriceEstimateRequest = z.infer<typeof priceEstimateRequestSchema>;
export type PriceEstimateBreakdown = z.infer<typeof priceEstimateBreakdownSchema>;
export type PriceEstimateResponse = z.infer<typeof priceEstimateResponseSchema>;
export type PublicCreateBookingRequest = z.infer<typeof publicCreateBookingRequestSchema>;
export type PublicCreateBookingResponse = z.infer<typeof publicCreateBookingResponseSchema>;
export type ValidatePromoRequest = z.infer<typeof validatePromoRequestSchema>;
export type ValidatePromoResponse = z.infer<typeof validatePromoResponseSchema>;
export type PortalMeResponse = z.infer<typeof portalMeResponseSchema>;
export type PortalDocumentStagingRequest = z.infer<typeof portalDocumentStagingRequestSchema>;
export type PortalDocumentStagingResponse = z.infer<typeof portalDocumentStagingResponseSchema>;
export type PortalDocumentConfirmRequest = z.infer<typeof portalDocumentConfirmRequestSchema>;
export type PortalDocumentConfirmResponse = z.infer<typeof portalDocumentConfirmResponseSchema>;
export type PortalRequestChange = z.infer<typeof portalRequestChangeSchema>;
export type PortalRequestChangeResponse = z.infer<typeof portalRequestChangeResponseSchema>;

// --- Fase 3: Operasional (Sopir, Serah-Terima, Keuangan, Servis) ---

export const driverDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: whatsappSchema,
  simNumber: z.string(),
  dailyRate: moneySchema,
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const driverListResponseSchema = z.object({
  drivers: z.array(driverDtoSchema),
  pagination: paginationMetadataSchema,
});

export const createDriverRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: whatsappSchema,
    simNumber: z.string().trim().min(1).max(64),
    dailyRate: moneySchema.default(150000),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const updateDriverRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: whatsappSchema.optional(),
    simNumber: z.string().trim().min(1).max(64).optional(),
    dailyRate: moneySchema.optional(),
    isActive: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const assignDriverRequestSchema = z
  .object({
    driverId: z.uuid().nullable(),
  })
  .strict();

export const handoverTypeSchema = z.enum(['CHECKOUT', 'CHECKIN']);

export const handoverDtoSchema = z.object({
  id: z.uuid(),
  bookingItemId: z.uuid(),
  type: handoverTypeSchema,
  odometer: z.number().int().nonnegative(),
  fuelLevel: z.number().int().min(0).max(100),
  notes: z.string().nullable(),
  damageReport: z.record(z.string(), z.unknown()).nullable(),
  photoKeys: z.array(z.string()),
  extraFee: moneySchema,
  signedByName: z.string(),
  signedAt: isoDateTimeSchema,
  recordedBy: z.uuid(),
  createdAt: isoDateTimeSchema,
});

export const createHandoverRequestSchema = z
  .object({
    type: handoverTypeSchema,
    odometer: z.number().int().nonnegative(),
    fuelLevel: z.number().int().min(0).max(100),
    notes: z.string().nullable().optional(),
    damageReport: z.record(z.string(), z.unknown()).nullable().optional(),
    photoKeys: z.array(z.string()).default([]),
    extraFee: moneySchema.default(0),
    signedByName: z.string().trim().min(1),
  })
  .strict();

export const expenseCategorySchema = z.enum([
  'FUEL',
  'MAINTENANCE',
  'CLEANING',
  'SALARY',
  'OFFICE',
  'PARKING_TOLL',
  'OTHER',
]);

export const expenseDtoSchema = z.object({
  id: z.uuid(),
  category: expenseCategorySchema,
  amount: moneySchema,
  expenseDate: isoDateTimeSchema,
  description: z.string(),
  proofObjectKey: z.string().nullable(),
  recordedBy: z.uuid(),
  createdAt: isoDateTimeSchema,
});

export const expenseListResponseSchema = z.object({
  expenses: z.array(expenseDtoSchema),
  totalAmount: moneySchema,
  pagination: paginationMetadataSchema,
});

export const createExpenseRequestSchema = z
  .object({
    category: expenseCategorySchema,
    amount: z.number().int().positive(),
    expenseDate: isoDateTimeSchema,
    description: z.string().trim().min(1),
    proofObjectKey: z.string().nullable().optional(),
  })
  .strict();

export const maintenanceDtoSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  serviceDate: isoDateTimeSchema,
  odometer: z.number().int().nonnegative(),
  cost: moneySchema,
  description: z.string(),
  nextServiceDate: isoDateTimeSchema.nullable(),
  nextOdometer: z.number().int().nonnegative().nullable(),
  createdAt: isoDateTimeSchema,
});

export const createMaintenanceRequestSchema = z
  .object({
    serviceDate: isoDateTimeSchema,
    odometer: z.number().int().nonnegative(),
    cost: moneySchema,
    description: z.string().trim().min(1),
    nextServiceDate: isoDateTimeSchema.nullable().optional(),
    nextOdometer: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const updateMaintenanceRequestSchema = createMaintenanceRequestSchema.partial().refine(
  (value) => Object.keys(value).length > 0, { message: 'At least one field is required.' },
);
export const maintenanceListResponseSchema = z.object({ maintenances: z.array(maintenanceDtoSchema) });
export const vehicleDocumentsResponseSchema = z.object({ documents: z.object({
  PAJAK: z.array(maintenanceDtoSchema), STNK: z.array(maintenanceDtoSchema), ASURANSI: z.array(maintenanceDtoSchema),
}) });
export const submitDriverRatingRequestSchema = z.object({
  driverId: z.uuid(), score: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(2000).nullable().optional(),
}).strict();
export const driverRatingDtoSchema = z.object({
  id: z.uuid(), driverId: z.uuid(), bookingId: z.uuid(), score: z.number().int().min(1).max(5),
  feedback: z.string().nullable(), createdAt: isoDateTimeSchema,
});
export const driverRatingsResponseSchema = z.object({ ratings: z.array(driverRatingDtoSchema) });
export const driverScheduleItemSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  bookingCode: z.string(),
  bookingStatus: bookingStatusSchema,
  customerName: z.string(),
  customerWhatsapp: z.string(),
  vehicleName: z.string(),
  plate: z.string(),
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  totalAmount: moneySchema,
});
export const driverScheduleResponseSchema = z.object({
  schedule: z.array(driverScheduleItemSchema),
});
export const bookingExportQuerySchema = z.object({
  from: isoDateTimeSchema.optional(), to: isoDateTimeSchema.optional(),
}).strict().refine((value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to), {
  message: 'from must not exceed to.', path: ['to'],
});
export type UpdateMaintenanceRequest = z.infer<typeof updateMaintenanceRequestSchema>;
export type SubmitDriverRatingRequest = z.infer<typeof submitDriverRatingRequestSchema>;
export type DriverRatingDto = z.infer<typeof driverRatingDtoSchema>;
export type DriverRatingsResponse = z.infer<typeof driverRatingsResponseSchema>;
export type DriverScheduleItem = z.infer<typeof driverScheduleItemSchema>;
export type DriverScheduleResponse = z.infer<typeof driverScheduleResponseSchema>;
export type BookingExportQuery = z.infer<typeof bookingExportQuerySchema>;

export const dashboardOverviewResponseSchema = z.object({
  activeBookings: z.number().int().nonnegative(),
  pendingVerifications: z.number().int().nonnegative(),
  availableVehicles: z.number().int().nonnegative(),
  totalVehicles: z.number().int().nonnegative(),
  monthlyRevenue: moneySchema,
  monthlyExpenses: moneySchema,
  netIncome: z.number().int(),
  todayCheckouts: z.number().int().nonnegative(),
  todayCheckins: z.number().int().nonnegative(),
});

export type DriverDto = z.infer<typeof driverDtoSchema>;
export type DriverListResponse = z.infer<typeof driverListResponseSchema>;
export type CreateDriverRequest = z.infer<typeof createDriverRequestSchema>;
export type UpdateDriverRequest = z.infer<typeof updateDriverRequestSchema>;
export type AssignDriverRequest = z.infer<typeof assignDriverRequestSchema>;
export type HandoverType = z.infer<typeof handoverTypeSchema>;
export type HandoverDto = z.infer<typeof handoverDtoSchema>;
export type CreateHandoverRequest = z.infer<typeof createHandoverRequestSchema>;
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type ExpenseDto = z.infer<typeof expenseDtoSchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
export type CreateExpenseRequest = z.infer<typeof createExpenseRequestSchema>;
export type MaintenanceDto = z.infer<typeof maintenanceDtoSchema>;
export type MaintenanceListResponse = z.infer<typeof maintenanceListResponseSchema>;
export type VehicleDocumentsResponse = z.infer<typeof vehicleDocumentsResponseSchema>;
export type CreateMaintenanceRequest = z.infer<typeof createMaintenanceRequestSchema>;
export type DashboardOverviewResponse = z.infer<typeof dashboardOverviewResponseSchema>;

