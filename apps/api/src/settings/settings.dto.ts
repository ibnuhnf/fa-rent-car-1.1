import { createZodDto } from 'nestjs-zod';
import {
  auditLogListQuerySchema,
  auditLogListResponseSchema,
  businessSettingsSchema,
  createStaffRequestSchema,
  staffListResponseSchema,
  updateBusinessSettingsSchema,
  updateStaffRequestSchema,
} from '@fa/shared';

export class BusinessSettingsDto extends createZodDto(businessSettingsSchema) {}
export class UpdateBusinessSettingsDto extends createZodDto(updateBusinessSettingsSchema) {}
export class StaffListResponseDto extends createZodDto(staffListResponseSchema) {}
export class CreateStaffDto extends createZodDto(createStaffRequestSchema) {}
export class UpdateStaffDto extends createZodDto(updateStaffRequestSchema) {}
export class AuditLogListQueryDto extends createZodDto(auditLogListQuerySchema) {}
export class AuditLogListResponseDto extends createZodDto(auditLogListResponseSchema) {}
