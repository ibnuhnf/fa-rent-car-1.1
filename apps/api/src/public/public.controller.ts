import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  PriceEstimateResponse,
  PublicCreateBookingResponse,
  PublicVehicleDetailResponse,
  PublicVehicleListResponse,
  ValidatePromoResponse,
} from '@fa/shared';
import {
  PriceEstimateDto,
  PublicCreateBookingDto,
  PublicVehicleListQueryDto,
  ValidatePromoDto,
} from './public.dto';
import { PublicService } from './public.service';

@ApiTags('Public')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('vehicles')
  listVehicles(@Query() query: PublicVehicleListQueryDto): Promise<PublicVehicleListResponse> {
    return this.publicService.listVehicles(query);
  }

  @Get('vehicles/:id')
  vehicleDetail(@Param('id') id: string): Promise<PublicVehicleDetailResponse> {
    return this.publicService.vehicleDetail(id);
  }

  @Post('price-estimate')
  priceEstimate(@Body() body: PriceEstimateDto): Promise<PriceEstimateResponse> {
    return this.publicService.priceEstimate(body);
  }

  @Post('bookings')
  createBooking(@Body() body: PublicCreateBookingDto): Promise<PublicCreateBookingResponse> {
    return this.publicService.createBooking(body);
  }

  @Post('bookings/validate-promo')
  validatePromo(@Body() body: ValidatePromoDto): Promise<ValidatePromoResponse> {
    return this.publicService.validatePromo(body);
  }
}
