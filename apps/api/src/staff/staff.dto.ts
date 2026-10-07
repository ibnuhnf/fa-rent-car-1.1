import { createZodDto } from 'nestjs-zod';
import {
  createStaffRequestSchema,
  staffListResponseSchema,
  staffUserSchema,
  updateStaffRequestSchema,
} from '@fa/shared';

export class CreateStaffDto extends createZodDto(createStaffRequestSchema) {}
export class UpdateStaffDto extends createZodDto(updateStaffRequestSchema) {}
export class StaffListResponseDto extends createZodDto(staffListResponseSchema) {}
export class StaffUserDto extends createZodDto(staffUserSchema) {}
