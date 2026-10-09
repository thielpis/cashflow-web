/** Matches CashFlow.Application.Goals.ContributionResponse; negative when money was taken back out. */
export interface Contribution {
  id: string;
  amount: number;
  date: string;
  note: string | null;
}

/** Matches CashFlow.Application.Goals.GoalResponse. */
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
  notes: string | null;
  createdOn: string;
  saved: number;
  remaining: number;
  /** Percentage saved, 0–100. */
  progress: number;
  isReached: boolean;
  /** Months left to save in, counting the current one; null without a target date. */
  monthsLeft: number | null;
  /** To put aside each month to make the target date; null without one or once reached. */
  monthlyNeeded: number | null;
  contributions: Contribution[];
}

export interface GoalRequest {
  name: string;
  targetAmount: number;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
  notes: string | null;
}

export interface ContributionRequest {
  amount: number;
  date: string;
  note: string | null;
}
