import { TransactionType } from './category.model';

/** Matches CashFlow.Application.Recurring.RecurringTransactionResponse. */
export interface RecurringTransaction {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  lastIssuedOn: string | null;
  nextDate: string | null;
}

export interface RecurringTransactionRequest {
  categoryId: string;
  amount: number;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
}
