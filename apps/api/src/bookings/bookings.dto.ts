import { createZodDto } from 'nestjs-zod';
import {
  bookingDetailResponseSchema,
  bookingDocumentsResponseSchema,
  bookingListQuerySchema,
  bookingListResponseSchema,
  adminCreatePaymentRequestSchema,
  adminPaymentResponseSchema,
  calendarQuerySchema,
  calendarResponseSchema,
  cancelBookingRequestSchema,
  cancelBookingResponseSchema,
  createBookingRequestSchema,
  createBookingResponseSchema,
  extendHoldRequestSchema,
  extendHoldResponseSchema,
  verifyDocumentRequestSchema,
  verifyDocumentResponseSchema,
  updateBookingItemRequestSchema,
  bookingRevisionResponseSchema,
  bookingExportQuerySchema,
} from '@fa/shared';

export class CreateBookingDto extends createZodDto(createBookingRequestSchema) {}
export class BookingListQueryDto extends createZodDto(bookingListQuerySchema) {}
export class ExtendHoldDto extends createZodDto(extendHoldRequestSchema) {}
export class CalendarQueryDto extends createZodDto(calendarQuerySchema) {}
export class VerifyDocumentDto extends createZodDto(verifyDocumentRequestSchema) {}
export class AdminCreatePaymentDto extends createZodDto(adminCreatePaymentRequestSchema) {}
export class CancelBookingDto extends createZodDto(cancelBookingRequestSchema) {}

export class BookingListResponseDto extends createZodDto(bookingListResponseSchema) {}
export class BookingDetailResponseDto extends createZodDto(bookingDetailResponseSchema) {}
export class CreateBookingResponseDto extends createZodDto(createBookingResponseSchema) {}
export class ExtendHoldResponseDto extends createZodDto(extendHoldResponseSchema) {}
export class CalendarResponseDto extends createZodDto(calendarResponseSchema) {}
export class BookingDocumentsResponseDto extends createZodDto(bookingDocumentsResponseSchema) {}
export class VerifyDocumentResponseDto extends createZodDto(verifyDocumentResponseSchema) {}
export class AdminPaymentResponseDto extends createZodDto(adminPaymentResponseSchema) {}
export class CancelBookingResponseDto extends createZodDto(cancelBookingResponseSchema) {}
export class UpdateBookingItemDto extends createZodDto(updateBookingItemRequestSchema) {}
export class BookingRevisionResponseDto extends createZodDto(bookingRevisionResponseSchema) {}
export class BookingExportQueryDto extends createZodDto(bookingExportQuerySchema) {}