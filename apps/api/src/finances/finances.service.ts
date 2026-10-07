import { Injectable } from '@nestjs/common';
import type { CreateExpenseRequest, ExpenseDto, ExpenseListResponse } from '@fa/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FinancesService {
  constructor(private readonly database: PrismaService) {}

  async listExpenses(page = 1, limit = 50): Promise<ExpenseListResponse> {
    const [total, sumRes, rows] = await this.database.$transaction([
      this.database.expense.count(),
      this.database.expense.aggregate({ _sum: { amount: true } }),
      this.database.expense.findMany({
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      expenses: rows.map((r) => ({
        id: r.id,
        category: r.category,
        amount: r.amount,
        expenseDate: r.expenseDate.toISOString(),
        description: r.description,
        proofObjectKey: r.proofObjectKey,
        recordedBy: r.recordedBy,
        createdAt: r.createdAt.toISOString(),
      })),
      totalAmount: sumRes._sum.amount ?? 0,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit),
      },
    };
  }

  async createExpense(input: CreateExpenseRequest, adminId: string): Promise<ExpenseDto> {
    const created = await this.database.expense.create({
      data: {
        category: input.category,
        amount: input.amount,
        expenseDate: new Date(input.expenseDate),
        description: input.description,
        proofObjectKey: input.proofObjectKey ?? null,
        recordedBy: adminId,
      },
    });

    return {
      id: created.id,
      category: created.category,
      amount: created.amount,
      expenseDate: created.expenseDate.toISOString(),
      description: created.description,
      proofObjectKey: created.proofObjectKey,
      recordedBy: created.recordedBy,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
