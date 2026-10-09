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
  /** The next due date from today on; null when paused or ended. */
  nextDate: string | null;
}

/**
 * Matches CashFlow.Application.Recurring.RecurringDueResponse: a month's entry of a recurring income
 * or expense. Ticking it enters it as a transaction; until then it is pending, overdue once its day passes.
 */
export interface RecurringDue {
  recurringTransactionId: string;
  type: TransactionType;
  description: string | null;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  amount: number;
  dueDate: string;
  /** Negative when overdue. */
  daysLeft: number;
  /** When it was ticked, which is the date of its transaction; null while pending. */
  paidOn: string | null;
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
