import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { CsrfGuard } from '../auth/csrf.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateMaintenanceDto, UpdateMaintenanceDto } from './maintenances.dto';
import { MaintenancesService } from './maintenances.service';

@ApiTags('Admin maintenance')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller()
export class MaintenancesController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Get('admin/vehicles/:vehicleId/maintenance')
  list(@Param('vehicleId') vehicleId: string) { return this.maintenances.list(vehicleId); }

  @Get('admin/vehicles/:vehicleId/documents')
  documents(@Param('vehicleId') vehicleId: string) { return this.maintenances.documents(vehicleId); }

  @Post('admin/vehicles/:vehicleId/maintenance')
  @Roles('SUPERADMIN')
  @UseGuards(CsrfGuard)
  create(@Param('vehicleId') vehicleId: string, @Body() body: CreateMaintenanceDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.maintenances.create(vehicleId, body, admin);
  }

  @Patch('admin/maintenances/:id')
  @Roles('SUPERADMIN')
  @UseGuards(CsrfGuard)
  update(@Param('id') id: string, @Body() body: UpdateMaintenanceDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.maintenances.update(id, body, admin);
  }

  @Delete('admin/maintenances/:id')
  @Roles('SUPERADMIN')
  @UseGuards(CsrfGuard)
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.maintenances.remove(id);
  }
}
