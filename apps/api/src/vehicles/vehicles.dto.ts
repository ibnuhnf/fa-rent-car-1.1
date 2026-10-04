import { createZodDto } from 'nestjs-zod';
import {
  adminVehicleDetailSchema,
  adminVehicleSchema,
  availabilityQuerySchema,
  availabilityResponseSchema,
  pricingRuleCreateSchema,
  pricingRuleSchema,
  vehicleCountsSchema,
  vehicleCreateSchema,
  vehicleListQuerySchema,
  vehicleListResponseSchema,
  vehiclePhotoUploadRequestSchema,
  vehiclePhotoUploadResponseSchema,
  vehicleRateSchema,
  vehicleUpdateSchema,
} from '@fa/shared';

export class VehicleCreateDto extends createZodDto(vehicleCreateSchema) {}
export class VehicleUpdateDto extends createZodDto(vehicleUpdateSchema) {}
export class VehicleListQueryDto extends createZodDto(vehicleListQuerySchema) {}
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
export class VehicleCountsDto extends createZodDto(vehicleCountsSchema) {}
