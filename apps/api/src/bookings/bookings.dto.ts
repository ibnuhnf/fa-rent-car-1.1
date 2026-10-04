import { createZodDto } from 'nestjs-zod';
import {
  bookingDetailResponseSchema,
  bookingListQuerySchema,
  bookingListResponseSchema,
  createBookingRequestSchema,
  createBookingResponseSchema,
  extendHoldRequestSchema,
  extendHoldResponseSchema,
} from '@fa/shared';

export class CreateBookingDto extends createZodDto(createBookingRequestSchema) {}
export class BookingListQueryDto extends createZodDto(bookingListQuerySchema) {}
export class ExtendHoldDto extends createZodDto(extendHoldRequestSchema) {}

export class BookingListResponseDto extends createZodDto(bookingListResponseSchema) {}
export class BookingDetailResponseDto extends createZodDto(bookingDetailResponseSchema) {}
export class CreateBookingResponseDto extends createZodDto(createBookingResponseSchema) {}
export class ExtendHoldResponseDto extends createZodDto(extendHoldResponseSchema) {}