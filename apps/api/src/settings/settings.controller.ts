import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { updateBusinessSettingsSchema, businessSettingsSchema } from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { SettingsService } from './settings.service';

class UpdateBusinessDto extends createZodDto(updateBusinessSettingsSchema) {}
class BusinessSettingsDto extends createZodDto(businessSettingsSchema) {}

@ApiTags('Settings')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('business')
  @ApiOkResponse({ type: BusinessSettingsDto })
  getBusiness() {
    return this.settings.getBusiness();
  }

  @Put('business')
  @Roles('SUPERADMIN')
  @UseGuards(CsrfGuard)
  @ApiOkResponse({ type: BusinessSettingsDto })
  updateBusiness(@Body() body: UpdateBusinessDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.settings.updateBusiness(body, admin.user.id);
  }
}
