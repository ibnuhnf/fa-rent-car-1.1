import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { ExpenseDto, ExpenseListResponse } from '@fa/shared';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { CreateExpenseDto } from './finances.dto';
import { FinancesService } from './finances.service';

@ApiTags('Admin finances')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/finances')
export class FinancesController {
  constructor(private readonly finances: FinancesService) {}

  @Get('expenses')
  listExpenses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ExpenseListResponse> {
    return this.finances.listExpenses(Number(page) || 1, Number(limit) || 50);
  }

  @Post('expenses')
  createExpense(
    @Body() body: CreateExpenseDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<ExpenseDto> {
    return this.finances.createExpense(body, admin.user.id);
  }
}
