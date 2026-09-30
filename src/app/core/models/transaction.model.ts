import { TransactionType } from './category.model';

/** Matches CashFlow.Application.Transactions.TransactionResponse. Dates are "yyyy-MM-dd". */
export interface Transaction {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  notes: string | null;
  recurringTransactionId: string | null;
}

export interface TransactionRequest {
  categoryId: string;
  amount: number;
  date: string;
  description: string | null;
  notes: string | null;
}

export interface TransactionSearchParams {
  from?: string;
  to?: string;
  type?: TransactionType;
  categoryId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

/** A page of transactions with the totals of everything the filters match. */
export interface TransactionSearchResult {
  items: Transaction[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalIncome: number;
  totalExpenses: number;
}
