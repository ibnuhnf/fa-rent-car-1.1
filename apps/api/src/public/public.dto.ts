import { createZodDto } from 'nestjs-zod';
import { priceEstimateRequestSchema, publicCreateBookingRequestSchema, publicVehicleListQuerySchema, validatePromoRequestSchema } from '@fa/shared';

export class PublicVehicleListQueryDto extends createZodDto(publicVehicleListQuerySchema) {}
export class PriceEstimateDto extends createZodDto(priceEstimateRequestSchema) {}
export class PublicCreateBookingDto extends createZodDto(publicCreateBookingRequestSchema) {}
export class ValidatePromoDto extends createZodDto(validatePromoRequestSchema) {}
