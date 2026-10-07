import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { DriverDto, DriverListResponse, DriverRatingsResponse, DriverScheduleResponse } from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { AssignDriverDto, CreateDriverDto, UpdateDriverDto } from './drivers.dto';
import { DriversService } from './drivers.service';

@ApiTags('Admin drivers')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('admin/drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  list(@Query('activeOnly') activeOnly?: string): Promise<DriverListResponse> {
    return this.drivers.list(activeOnly === 'true');
  }

  @Post()
  @Roles('SUPERADMIN')
  @UseGuards(CsrfGuard)
  create(@Body() body: CreateDriverDto, @CurrentAdmin() admin: AuthenticatedAdmin): Promise<DriverDto> {
    return this.drivers.create(body, admin.user.id);
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  @UseGuards(CsrfGuard)
  update(
    @Param('id') id: string,
    @Body() body: UpdateDriverDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<DriverDto> {
    return this.drivers.update(id, body, admin.user.id);
  }

  @Post('assign/:itemId')
  @UseGuards(CsrfGuard)
  async assign(
    @Param('itemId') itemId: string,
    @Body() body: AssignDriverDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<{ success: true }> {
    await this.drivers.assignToItem(itemId, body.driverId, admin.user.id);
    return { success: true };
  }

  @Get(':id/ratings')
  ratings(@Param('id') id: string): Promise<DriverRatingsResponse> {
    return this.drivers.ratings(id);
  }

  @Get(':id/schedule')
  schedule(@Param('id') id: string): Promise<DriverScheduleResponse> {
    return this.drivers.schedule(id);
  }
}
