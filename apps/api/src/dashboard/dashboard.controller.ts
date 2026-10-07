import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { DashboardOverviewResponse } from '@fa/shared';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin dashboard')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  getOverview(): Promise<DashboardOverviewResponse> {
    return this.dashboard.getOverview();
  }
}
