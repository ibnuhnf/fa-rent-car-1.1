import { createZodDto } from 'nestjs-zod';
import {
  assignDriverRequestSchema,
  createDriverRequestSchema,
  driverDtoSchema,
  driverListResponseSchema,
  updateDriverRequestSchema,
} from '@fa/shared';

export class DriverDto extends createZodDto(driverDtoSchema) {}
export class DriverListResponseDto extends createZodDto(driverListResponseSchema) {}
export class CreateDriverDto extends createZodDto(createDriverRequestSchema) {}
export class UpdateDriverDto extends createZodDto(updateDriverRequestSchema) {}
export class AssignDriverDto extends createZodDto(assignDriverRequestSchema) {}
