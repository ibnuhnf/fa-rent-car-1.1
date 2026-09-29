import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AvailabilityResponse, VehiclePhotoUploadResponse } from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import { Roles } from '../auth/roles.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { AvailabilityService } from './availability.service';
import {
  AvailabilityQueryDto,
  PricingRuleCreateDto,
  VehicleUpsertDto,
  VehiclePhotoUploadDto,
  VehicleRateDto,
} from './vehicles.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Admin vehicles')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/vehicles')
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly availability: AvailabilityService,
  ) {}

  // Placed before :id so 'availability' is not captured as a vehicle id.
  @Get('availability')
  async checkAvailability(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResponse> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const availableVehicleIds = await this.availability.availableVehicleIds({
      from,
      to,
      bufferHours: query.bufferHours ?? 0,
    });
    return { from: query.from, to: query.to, bufferHours: query.bufferHours ?? 0, availableVehicleIds };
  }

  @Get()
  list(@Query() query: VehicleUpsertDto) {
    return this.vehicles.list(query as unknown as Parameters<VehiclesService['list']>[0]);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.vehicles.detail(id);
  }

  @Post()
  @Roles('SUPERADMIN')
  async create(@Body() body: VehicleUpsertDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.vehicles.create({ ...(body as VehicleUpsertDto), actorId: admin.user.id });
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  async update(@Param('id') id: string, @Body() body: VehicleUpsertDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.vehicles.update(id, { ...(body as VehicleUpsertDto), actorId: admin.user.id });
  }

  @Delete(':id')
  @Roles('SUPERADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin): Promise<void> {
    await this.vehicles.remove(id, admin);
  }

  @Post(':id/photos')
  @ApiParam({ name: 'id', type: String, description: 'Vehicle id' })
  async stagePhotos(
    @Param('id') id: string,
    @Body() body: VehiclePhotoUploadDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<VehiclePhotoUploadResponse> {
    return this.vehicles.stagePhotos(id, body.files, admin);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<void> {
    await this.vehicles.deletePhoto(id, photoId, admin);
  }

  @Put(':id/rate')
  @Roles('SUPERADMIN')
  async setRate(
    @Param('id') id: string,
    @Body() body: VehicleRateDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.vehicles.setRate(
      id,
      body as NonNullable<Awaited<ReturnType<VehiclesService['detail']>>['rate']>,
      admin,
    );
  }

  @Get(':id/pricing-rules')
  async listPricingRules(@Param('id') id: string) {
    const detail = await this.vehicles.detail(id);
    return detail.pricingRules;
  }

  @Post(':id/pricing-rules')
  @Roles('SUPERADMIN')
  async addPricingRule(
    @Param('id') id: string,
    @Body() body: PricingRuleCreateDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.vehicles.addPricingRule(id, body as Parameters<VehiclesService['addPricingRule']>[1], admin);
  }
}