import { Body, Controller, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { HandoverDto } from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { CreateHandoverDto } from './handovers.dto';
import { HandoversService } from './handovers.service';

@ApiTags('Admin handovers')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/handovers')
export class HandoversController {
  constructor(private readonly handovers: HandoversService) {}

  @Post(':bookingItemId')
  @UseGuards(CsrfGuard)
  create(
    @Param('bookingItemId') bookingItemId: string,
    @Body() body: CreateHandoverDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<HandoverDto> {
    return this.handovers.create(bookingItemId, body, admin.user.id);
  }

  @Get('booking/:bookingId')
  listByBooking(@Param('bookingId') bookingId: string): Promise<HandoverDto[]> {
    return this.handovers.listByBooking(bookingId);
  }

  @Get([':bookingId/pdf', 'booking/:bookingId/pdf'])
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiProduces('text/html')
  getPdfHtml(@Param('bookingId') bookingId: string): Promise<string> {
    return this.handovers.generatePdfHtml(bookingId);
  }
}
