import { Injectable } from '@nestjs/common';
import type { DashboardOverviewResponse } from '@fa/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly database: PrismaService) {}

  async getOverview(): Promise<DashboardOverviewResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activeBookings,
      pendingVerifications,
      totalVehicles,
      availableVehicles,
      revenueRes,
      expensesRes,
      todayCheckouts,
      todayCheckins,
    ] = await this.database.$transaction([
      this.database.booking.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.database.booking.count({ where: { status: 'PENDING_VERIFICATION', deletedAt: null } }),
      this.database.vehicle.count({ where: { deletedAt: null, isDemo: false } }),
      this.database.vehicle.count({ where: { status: 'AVAILABLE', deletedAt: null, isDemo: false } }),
      this.database.payment.aggregate({
        where: { confirmedAt: { gte: firstDayOfMonth } },
        _sum: { amount: true },
      }),
      this.database.expense.aggregate({
        where: { expenseDate: { gte: firstDayOfMonth } },
        _sum: { amount: true },
      }),
      this.database.bookingItem.count({
        where: {
          startDate: { gte: today, lt: tomorrow },
          booking: { status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] } },
        },
      }),
      this.database.bookingItem.count({
        where: {
          endDate: { gte: today, lt: tomorrow },
          booking: { status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] } },
        },
      }),
    ]);

    const monthlyRevenue = revenueRes._sum.amount ?? 0;
    const monthlyExpenses = expensesRes._sum.amount ?? 0;

    return {
      activeBookings,
      pendingVerifications,
      totalVehicles,
      availableVehicles,
      monthlyRevenue,
      monthlyExpenses,
      netIncome: monthlyRevenue - monthlyExpenses,
      todayCheckouts,
      todayCheckins,
    };
  }
}
