import { createZodDto } from 'nestjs-zod';
import {
  createExpenseRequestSchema,
  expenseDtoSchema,
  expenseListResponseSchema,
} from '@fa/shared';

export class CreateExpenseDto extends createZodDto(createExpenseRequestSchema) {}
export class ExpenseDto extends createZodDto(expenseDtoSchema) {}
export class ExpenseListResponseDto extends createZodDto(expenseListResponseSchema) {}
