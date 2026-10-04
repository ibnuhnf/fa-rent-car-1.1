import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type {
  BookingDetailResponse,
  BookingListResponse,
  CreateBookingResponse,
  ExtendHoldResponse,
} from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { BookingListQueryDto, CreateBookingDto, ExtendHoldDto } from './bookings.dto';
import { BookingsService } from './bookings.service';

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

  @Post()
  create(
    @Body() body: CreateBookingDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<CreateBookingResponse> {
    return this.bookings.create(body, admin);
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
}