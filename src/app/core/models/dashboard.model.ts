import { TransactionType } from './category.model';
import { Transaction } from './transaction.model';

export interface MonthTotals {
  year: number;
  month: number;
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: TransactionType;
  amount: number;
  monthlyBudget: number | null;
}

export interface UpcomingTransaction {
  recurringTransactionId: string;
  description: string | null;
  categoryName: string;
  categoryIcon: string | null;
  type: TransactionType;
  amount: number;
  date: string;
}

/** Matches CashFlow.Application.Dashboard.MonthDashboardResponse. */
export interface MonthDashboard {
  year: number;
  month: number;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
  previous: MonthTotals;
  expenseCategories: CategoryTotal[];
  incomeCategories: CategoryTotal[];
  trend: MonthTotals[];
  upcoming: UpcomingTransaction[];
  recent: Transaction[];
}

/** Matches CashFlow.Application.Dashboard.YearReportResponse. */
export interface YearReport {
  year: number;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
  months: MonthTotals[];
  expenseCategories: CategoryTotal[];
  incomeCategories: CategoryTotal[];
}
