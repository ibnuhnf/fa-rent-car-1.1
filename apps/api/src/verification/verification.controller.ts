import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type {
  AdminPaymentResponse,
  BookingDocumentsResponse,
  CancelBookingResponse,
  VerifyDocumentResponse,
} from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { CsrfGuard } from '../auth/csrf.guard';
import {
  AdminCreatePaymentDto,
  CancelBookingDto,
  VerifyDocumentDto,
} from '../bookings/bookings.dto';
import { VerificationService } from './verification.service';

@ApiTags('Admin verification & payments')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/bookings')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get(':id/documents')
  listDocuments(@Param('id') id: string): Promise<BookingDocumentsResponse> {
    return this.verification.listDocuments(id);
  }

  @Post(':id/documents/:docId/verify')
  @UseGuards(CsrfGuard)
  verifyDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() body: VerifyDocumentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<VerifyDocumentResponse> {
    return this.verification.verifyDocument(id, docId, body, admin);
  }

  @Post(':id/payments')
  @UseGuards(CsrfGuard)
  createPayment(
    @Param('id') id: string,
    @Body() body: AdminCreatePaymentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<AdminPaymentResponse> {
    return this.verification.createPayment(id, body, admin);
  }

  @Post(':id/cancel')
  @UseGuards(CsrfGuard)
  cancel(
    @Param('id') id: string,
    @Body() body: CancelBookingDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<CancelBookingResponse> {
    return this.verification.cancel(id, body, admin);
  }
}
