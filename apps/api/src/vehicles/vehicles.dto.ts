import { createZodDto } from 'nestjs-zod';
import {
  adminVehicleDetailSchema,
  adminVehicleSchema,
  availabilityQuerySchema,
  availabilityResponseSchema,
  pricingRuleCreateSchema,
  pricingRuleSchema,
  vehicleCreateSchema,
  vehicleListResponseSchema,
  vehiclePhotoUploadRequestSchema,
  vehiclePhotoUploadResponseSchema,
  vehicleRateSchema,
  vehicleUpdateSchema,
} from '@fa/shared';

// Upsert shares one DTO class for create and update: the service validates the
// exact shape per operation via the shared Zod schemas.
export class VehicleUpsertDto extends createZodDto(vehicleCreateSchema) {}
export class VehicleCreateDto extends createZodDto(vehicleCreateSchema) {}
export class VehicleUpdateDto extends createZodDto(vehicleUpdateSchema) {}
export class VehiclePhotoUploadDto extends createZodDto(vehiclePhotoUploadRequestSchema) {}
export class AvailabilityQueryDto extends createZodDto(availabilityQuerySchema) {}
export class PricingRuleCreateDto extends createZodDto(pricingRuleCreateSchema) {}
export class VehicleRateDto extends createZodDto(vehicleRateSchema) {}

export class VehicleAdminDto extends createZodDto(adminVehicleSchema) {}
export class VehicleDetailDto extends createZodDto(adminVehicleDetailSchema) {}
export class VehicleListResponseDto extends createZodDto(vehicleListResponseSchema) {}
export class VehiclePhotoUploadResponseDto extends createZodDto(
  vehiclePhotoUploadResponseSchema,
) {}
export class AvailabilityResponseDto extends createZodDto(availabilityResponseSchema) {}
export class PricingRuleDto extends createZodDto(pricingRuleSchema) {}
export class VehicleCountsDto extends createZodDto(adminVehicleDetailSchema) {}
