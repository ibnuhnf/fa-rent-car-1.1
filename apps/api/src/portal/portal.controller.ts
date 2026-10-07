import { Body, Controller, Get, Header, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type {
  PortalDocumentConfirmResponse,
  PortalDocumentStagingResponse,
  PortalMeResponse,
  PortalRequestChangeResponse,
} from '@fa/shared';
import { CurrentPortal, PortalTokenGuard } from './portal-token.guard';
import {
  PortalDocumentConfirmDto,
  PortalDocumentStagingDto,
  PortalRequestChangeDto,
  SubmitDriverRatingDto,
} from './portal.dto';
import type { AuthenticatedPortal } from './portal-token.guard';
import { PortalService } from './portal.service';

@ApiTags('Customer portal')
@ApiCookieAuth()
@UseGuards(PortalTokenGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('me')
  me(@CurrentPortal() session: AuthenticatedPortal): Promise<PortalMeResponse> {
    return this.portal.me(session.bookingId);
  }

  @Post('documents/staging')
  stageDocument(
    @CurrentPortal() session: AuthenticatedPortal,
    @Body() body: PortalDocumentStagingDto,
  ): Promise<PortalDocumentStagingResponse> {
    return this.portal.stageDocument(session.bookingId, body);
  }

  @Post('documents/confirm')
  confirmDocument(
    @CurrentPortal() session: AuthenticatedPortal,
    @Body() body: PortalDocumentConfirmDto,
  ): Promise<PortalDocumentConfirmResponse> {
    return this.portal.confirmDocument(session.bookingId, body);
  }

  @Post('requests')
  @HttpCode(200)
  requestChange(
    @CurrentPortal() session: AuthenticatedPortal,
    @Body() body: PortalRequestChangeDto,
  ): Promise<PortalRequestChangeResponse> {
    return this.portal.requestChange(session.bookingId, body);
  }

  @Post('ratings')
  @HttpCode(201)
  submitRating(
    @CurrentPortal() session: AuthenticatedPortal,
    @Body() body: SubmitDriverRatingDto,
  ) {
    return this.portal.submitDriverRating(session.bookingId, body);
  }

  @Get('invoices/:version/download')
  @Header('content-type', 'text/html; charset=utf-8')
  async downloadInvoice(
    @CurrentPortal() session: AuthenticatedPortal,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<string> {
    return this.portal.generateInvoiceHtml(session.bookingId, version);
  }
}