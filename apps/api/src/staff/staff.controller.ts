import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { adminRoleSchema } from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { CreateStaffDto, StaffListResponseDto, UpdateStaffDto } from './staff.dto';
import { StaffService } from './staff.service';

const staffRoleQuery = { enum: adminRoleSchema.options, required: false } as const;

@ApiTags('Staff')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@Controller('admin/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @ApiQuery({ name: 'role', ...staffRoleQuery })
  @ApiOkResponse({ type: StaffListResponseDto })
  list(@Query('role') role?: string) {
    return this.staff.list(role);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @ApiOkResponse({ type: StaffListResponseDto })
  create(@Body() body: CreateStaffDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.staff.create(body, admin.user.id);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @ApiParam({ name: 'id', type: String, description: 'Staff id' })
  @ApiOkResponse({ type: StaffListResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.staff.update(id, body, admin.user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  @ApiParam({ name: 'id', type: String, description: 'Staff id' })
  async disable(
    @Param('id') id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<void> {
    await this.staff.disable(id, admin.user.id);
  }
}