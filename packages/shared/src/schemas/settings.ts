import { z } from 'zod';

import { adminRoleSchema, isoDateTimeSchema, paginationMetadataSchema } from '../schemas';

const bankAccountSettingSchema = z.object({
  bankName: z.string(),
  accountNumber: z.string(),
  accountHolder: z.string(),
});

export const businessSettingsSchema = z.object({
  name: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  phone: z.string(),
  email: z.string(),
  holdMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0),
  bankAccount: bankAccountSettingSchema,
  waTemplate: z.string(),
  pickupInstructions: z.string().optional(),
});

export const updateBusinessSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    whatsapp: z.string().trim().min(1).max(32).optional(),
    phone: z.string().trim().max(32).optional(),
    email: z.string().trim().email().max(254).optional(),
    holdMinutes: z.number().int().min(15).max(1440).optional(),
    bufferMinutes: z.number().int().min(0).max(1440).optional(),
    bankAccount: z
      .object({
        bankName: z.string().trim().min(1).max(100),
        accountNumber: z.string().trim().min(1).max(50),
        accountHolder: z.string().trim().min(1).max(100),
      })
      .optional(),
    waTemplate: z.string().trim().max(2000).optional(),
    pickupInstructions: z.string().trim().max(2000).optional(),
  })
  .strict();

export const staffUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string().email(),
  role: adminRoleSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const staffListResponseSchema = z.object({
  staff: z.array(staffUserSchema),
});

export const createStaffRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(72),
    role: adminRoleSchema,
  })
  .strict();

export const updateStaffRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    role: adminRoleSchema.optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .strict();

export const auditLogEntrySchema = z.object({
  id: z.uuid(),
  actorId: z.uuid().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  objectType: z.string(),
  objectId: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

export const auditLogListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().trim().max(50).optional(),
  })
  .strict();

export const auditLogListResponseSchema = z.object({
  logs: z.array(auditLogEntrySchema),
  pagination: paginationMetadataSchema,
});

export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type UpdateBusinessSettings = z.infer<typeof updateBusinessSettingsSchema>;
export type StaffUser = z.infer<typeof staffUserSchema>;
export type StaffListResponse = z.infer<typeof staffListResponseSchema>;
export type CreateStaffRequest = z.infer<typeof createStaffRequestSchema>;
export type UpdateStaffRequest = z.infer<typeof updateStaffRequestSchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
