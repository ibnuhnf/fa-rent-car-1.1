import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { createBookingItemRequestSchema, type BookingDetailResponse, type BookingListResponse, type BookingRevisionResponse, type CalendarResponse, type CreateBookingResponse, type ExtendHoldResponse } from '@fa/shared';
import { z } from 'zod';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { BookingListQueryDto, CalendarQueryDto, CreateBookingDto, ExtendHoldDto, UpdateBookingItemDto, BookingExportQueryDto } from './bookings.dto';
import { BookingsService } from './bookings.service';

export class ReplaceBookingItemsDto extends createZodDto(
  z.object({ items: z.array(createBookingItemRequestSchema).min(1) }).strict(),
) {}

@ApiTags('Admin bookings')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@Query() query: BookingListQueryDto): Promise<BookingListResponse> {
    return this.bookings.list(query);
  }

  @Get('calendar')
  calendar(@Query() query: CalendarQueryDto): Promise<CalendarResponse> {
    return this.bookings.calendar(query);
  }

  @Post()
  create(
    @Body() body: CreateBookingDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<CreateBookingResponse> {
    return this.bookings.create(body, admin);
  }

  @Get('export')
  async exportCsv(@Query() query: BookingExportQueryDto, @Res() res: Response): Promise<void> {
    const rows = await this.bookings.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
    res.send(rows);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<BookingDetailResponse> {
    return this.bookings.detail(id);
  }

  @Post(':id/extend-hold')
  extendHold(
    @Param('id') id: string,
    @Body() body: ExtendHoldDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<ExtendHoldResponse> {
    return this.bookings.extendHold(id, body.minutes, admin);
  }

  @UseGuards(CsrfGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Patch(':id/items')
  replaceItems(
    @Param('id') id: string,
    @Body() body: ReplaceBookingItemsDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<BookingRevisionResponse> {
    return this.bookings.replaceItems(id, body.items, admin);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateBookingItemDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<BookingRevisionResponse> {
    return this.bookings.updateItem(id, itemId, body, admin);
  }
}
