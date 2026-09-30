/** Matches CashFlow.Domain.Entities.TransactionType, serialized by name. */
export type TransactionType = 'Income' | 'Expense';

export const TYPE_LABELS: Record<TransactionType, string> = {
  Income: 'Έσοδο',
  Expense: 'Έξοδο',
};

/** Matches CashFlow.Application.Categories.CategoryResponse. */
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  transactionCount: number;
}

export interface CreateCategoryRequest {
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  displayOrder: number | null;
}

/** The type is fixed at creation. */
export interface UpdateCategoryRequest {
  name: string;
  color: string | null;
  icon: string | null;
  displayOrder: number | null;
  isActive: boolean;
}

export interface CategorySearchParams {
  type?: TransactionType;
  isActive?: boolean;
}

/** DELETE answer: a category with transactions is archived rather than deleted. */
export interface CategoryDeleteResponse {
  archived: boolean;
}
