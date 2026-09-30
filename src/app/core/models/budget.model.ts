/** Matches CashFlow.Application.Budgets.BudgetResponse. */
export interface Budget {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  monthlyLimit: number;
  /** Spent in the requested month. */
  spent: number;
}
