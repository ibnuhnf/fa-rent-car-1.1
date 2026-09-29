import { z } from 'zod';

import { MAX_UPLOAD_BYTES, TIMEZONE } from './constants';

function utf8ByteLength(value: string): number {
  let length = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x7f) {
      length += 1;
    } else if (codePoint <= 0x7ff) {
      length += 2;
    } else if (codePoint <= 0xffff) {
      length += 3;
    } else {
      length += 4;
    }
  }

  return length;
}

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const adminRoleSchema = z.enum(['STAFF', 'SUPERADMIN']);

export const emptyRequestSchema = z.strictObject({});

export const adminUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string().email(),
  role: adminRoleSchema,
});

export const loginRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(1)
      .refine((value) => utf8ByteLength(value) <= 72, {
        message: 'Password must be at most 72 UTF-8 bytes',
      }),
  })
  .strict();

export const authResponseSchema = z.object({
  user: adminUserSchema,
  expiresAt: isoDateTimeSchema,
});

export const csrfResponseSchema = z.object({
  csrfToken: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('fa-rent-car-api'),
  time: isoDateTimeSchema,
});

export const apiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(apiErrorDetailSchema),
  }),
});

export const MAX_PAGINATION_SKIP = 100_000;

function paginationInteger(maximum: number) {
  const number = z.number().int().min(1).max(maximum);
  return z.union([
    number,
    z
      .string()
      .regex(/^[1-9]\d*$/)
      .pipe(z.coerce.number<string>().pipe(number)),
  ]);
}

const paginationFields = {
  page: paginationInteger(MAX_PAGINATION_SKIP + 1).default(1),
  limit: paginationInteger(100).default(20),
};

export const paginationSchema = z
  .strictObject(paginationFields)
  .refine(({ page, limit }) => (page - 1) * limit <= MAX_PAGINATION_SKIP, {
    path: ['page'],
    message: 'Pagination offset exceeds the supported range',
  });

export const paginationMetadataSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasPreviousPage: z.boolean(),
  hasNextPage: z.boolean(),
});

export const businessProfileSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  operatingHours: z.string(),
  timezone: z.literal(TIMEZONE),
  holdMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0),
});

export const vehicleCategorySchema = z.enum(['MPV', 'SUV', 'CITY_CAR', 'SEDAN', 'VAN']);
export const vehicleTransmissionSchema = z.enum(['MANUAL', 'AUTOMATIC']);
export const vehicleFuelTypeSchema = z.enum(['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC']);
export const vehicleStatusSchema = z.enum([
  'AVAILABLE',
  'RENTED',
  'HELD',
  'MAINTENANCE',
  'INACTIVE',
]);

export const pricingRuleTypeSchema = z.enum(['WEEKEND', 'HOLIDAY', 'HIGH_SEASON', 'LONG_DURATION']);

export const pricingRuleSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid().nullable(),
  name: z.string(),
  type: pricingRuleTypeSchema,
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  multiplierBasisPoints: z.number().int().positive().nullable(),
  fixedSurcharge: z.number().int().nonnegative().nullable(),
  isActive: z.boolean(),
});

// Exactly one pricing lever must be set; both empty (or both set) is not a rule.
export const pricingRuleCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(80),
    type: pricingRuleTypeSchema,
    startDate: isoDateTimeSchema,
    endDate: isoDateTimeSchema,
    multiplierBasisPoints: z.number().int().min(10_000).max(100_000).nullable().default(null),
    fixedSurcharge: z.number().int().min(0).max(50_000_000).nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .refine(({ endDate, startDate }) => new Date(endDate).getTime() >= new Date(startDate).getTime(), {
    path: ['endDate'],
    message: 'The end date must not precede the start date',
  })
  .refine(
    ({ multiplierBasisPoints, fixedSurcharge }) =>
      (multiplierBasisPoints !== null) !== (fixedSurcharge !== null),
    { path: ['multiplierBasisPoints'], message: 'Set either a multiplier or a surcharge, not both' },
  );

export const vehicleSummarySchema = z.object({
  id: z.uuid(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  variant: z.string().nullable(),
  plate: z.string(),
  year: z.number().int(),
  category: vehicleCategorySchema,
  transmission: vehicleTransmissionSchema,
  fuelType: vehicleFuelTypeSchema,
  capacity: z.number().int(),
  luggageCount: z.number().int(),
  mileage: z.number().int(),
  facilities: z.array(z.string()),
  status: vehicleStatusSchema,
  isDemo: z.boolean(),
  dailyRate: z.number().int().nonnegative().nullable(),
});

export const vehicleCountsSchema = z
  .object({
    total: z.number().int().nonnegative(),
    demo: z.number().int().nonnegative(),
    byStatus: z.object({
      AVAILABLE: z.number().int().nonnegative(),
      RENTED: z.number().int().nonnegative(),
      HELD: z.number().int().nonnegative(),
      MAINTENANCE: z.number().int().nonnegative(),
      INACTIVE: z.number().int().nonnegative(),
    }),
  })
  .refine(
    ({ total, demo, byStatus }) =>
      demo <= total && Object.values(byStatus).reduce((sum, count) => sum + count, 0) === total,
  );

export const foundationResponseSchema = z
  .object({
    business: businessProfileSchema,
    vehicles: z.array(vehicleSummarySchema),
    pagination: paginationMetadataSchema,
    vehicleCounts: vehicleCountsSchema,
    phase: z.literal('FOUNDATION'),
    checkedAt: isoDateTimeSchema,
  })
  .refine(
    ({ vehicles, pagination, vehicleCounts }) =>
      vehicles.length <= pagination.limit && pagination.total === vehicleCounts.total,
  );

export const systemResponseSchema = z.object({
  database: z.literal('connected'),
  queue: z.literal('connected'),
  storage: z.literal('connected'),
  checkedAt: isoDateTimeSchema,
});

export const vehiclePhotoSchema = z.object({
  id: z.uuid(),
  objectKey: z.string(),
  sortOrder: z.number().int().nonnegative(),
  url: z.string().nullable(),
});

export const vehicleRateSchema = z.object({
  daily: z.number().int().nonnegative(),
  weekly: z.number().int().nonnegative().nullable(),
  monthly: z.number().int().nonnegative().nullable(),
  driverPerDay: z.number().int().nonnegative().nullable(),
  overtimeHourly: z.number().int().nonnegative().nullable(),
  latePerDay: z.number().int().nonnegative().nullable(),
});

export const vehiclePlateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(16)
  .regex(/^[A-Z0-9 -]+$/);

export const vehicleCreateSchema = z
  .strictObject({
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    variant: z.string().trim().max(60).default(''),
    year: z.number().int().min(1980).max(2100),
    plate: vehiclePlateSchema,
    color: z.string().trim().min(1).max(40),
    transmission: vehicleTransmissionSchema,
    category: vehicleCategorySchema,
    fuelType: vehicleFuelTypeSchema,
    capacity: z.number().int().min(1).max(60),
    luggageCount: z.number().int().min(0).max(60),
    mileage: z.number().int().min(0).max(2_000_000),
    facilities: z
      .array(z.string().trim().min(1).max(40))
      .max(30)
      .refine((items) => new Set(items).size === items.length, {
        message: 'Facilities must be unique',
      })
      .default([]),
    description: z.string().trim().max(2000).default(''),
    status: vehicleStatusSchema.default('AVAILABLE'),
    featured: z.boolean().default(false),
  })
  .refine(({ status }) => status === 'AVAILABLE' || status !== 'RENTED', {
    path: ['status'],
    message: 'RENTED is derived from bookings, not set manually',
  });

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

export const adminVehicleSchema = z.object({
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
  dailyRate: z.number().int().nonnegative().nullable(),
  photoCount: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const vehicleListQuerySchema = z
  .object({
    ...paginationFields,
    search: z.string().trim().max(80).optional(),
    status: vehicleStatusSchema.optional(),
    category: vehicleCategorySchema.optional(),
    transmission: vehicleTransmissionSchema.optional(),
    fuelType: vehicleFuelTypeSchema.optional(),
    sort: z
      .enum(['newest', 'oldest', 'brand', 'rate_asc', 'rate_desc', 'year_desc'])
      .default('newest'),
  })
  .refine(({ page, limit }) => (page - 1) * limit <= MAX_PAGINATION_SKIP, {
    path: ['page'],
    message: 'Pagination offset exceeds the supported range',
  });

export const vehicleListResponseSchema = z.object({
  vehicles: z.array(adminVehicleSchema),
  pagination: paginationMetadataSchema,
  counts: vehicleCountsSchema,
});

export const adminVehicleDetailSchema = adminVehicleSchema.extend({
  photos: z.array(vehiclePhotoSchema),
  rate: vehicleRateSchema.nullable(),
  pricingRules: z.array(pricingRuleSchema),
});

export const vehiclePhotoUploadRequestSchema = z.strictObject({
  files: z
    .array(
      z.strictObject({
        contentType: z.enum(['image/jpeg', 'image/png']),
        byteLength: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
      }),
    )
    .min(1)
    .max(10),
});

export const vehiclePhotoUploadResponseSchema = z.object({
  uploads: z.array(
    z.object({
      photoId: z.uuid(),
      objectKey: z.string(),
      url: z.string(),
      expiresIn: z.number().int().positive(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
});

export const availabilityQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    bufferHours: z.coerce.number().int().min(0).max(72).default(0),
  })
  .refine(({ from, to }) => new Date(to).getTime() > new Date(from).getTime(), {
    path: ['to'],
    message: 'The end of the range must be after its start',
  });

export const availabilityResponseSchema = z.object({
  from: isoDateTimeSchema,
  to: isoDateTimeSchema,
  bufferHours: z.number().int().nonnegative(),
  availableVehicleIds: z.array(z.uuid()),
});

export const logoutResponseSchema = z.object({
  success: z.literal(true),
});

export type AdminRole = z.infer<typeof adminRoleSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type CsrfResponse = z.infer<typeof csrfResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type VehicleCategory = z.infer<typeof vehicleCategorySchema>;
export type VehicleTransmission = z.infer<typeof vehicleTransmissionSchema>;
export type VehicleFuelType = z.infer<typeof vehicleFuelTypeSchema>;
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;
export type VehicleSummary = z.infer<typeof vehicleSummarySchema>;
export type VehicleCounts = z.infer<typeof vehicleCountsSchema>;
export type FoundationResponse = z.infer<typeof foundationResponseSchema>;
export type SystemResponse = z.infer<typeof systemResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type VehiclePhoto = z.infer<typeof vehiclePhotoSchema>;
export type VehicleRate = z.infer<typeof vehicleRateSchema>;
export type VehicleCreate = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdate = z.infer<typeof vehicleUpdateSchema>;
export type AdminVehicle = z.infer<typeof adminVehicleSchema>;
export type AdminVehicleDetail = z.infer<typeof adminVehicleDetailSchema>;
export type VehicleListQuery = z.infer<typeof vehicleListQuerySchema>;
export type VehicleListResponse = z.infer<typeof vehicleListResponseSchema>;
export type VehiclePhotoUploadRequest = z.infer<typeof vehiclePhotoUploadRequestSchema>;
export type VehiclePhotoUploadResponse = z.infer<typeof vehiclePhotoUploadResponseSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
export type PricingRuleType = z.infer<typeof pricingRuleTypeSchema>;
export type PricingRule = z.infer<typeof pricingRuleSchema>;
export type PricingRuleCreate = z.infer<typeof pricingRuleCreateSchema>;
