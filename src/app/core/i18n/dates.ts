/** A calendar month; months are 1–12 as in the API. */
export interface YearMonth {
  year: number;
  month: number;
}

/** "2026-09-28" for a local date, the format the API uses for DateOnly. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A local date from "2026-09-28" (new Date("2026-09-28") would be UTC midnight). */
export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function currentMonth(): YearMonth {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export function addMonths({ year, month }: YearMonth, count: number): YearMonth {
  const date = new Date(year, month - 1 + count, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** The first and last day of the month, as API dates. */
export function monthRange({ year, month }: YearMonth): { from: string; to: string } {
  return { from: toIsoDate(new Date(year, month - 1, 1)), to: toIsoDate(new Date(year, month, 0)) };
}

/** A new entry defaults to today when viewing the current month, otherwise to that month's first day. */
export function defaultDateIn(ym: YearMonth): Date {
  const today = new Date();
  return today.getFullYear() === ym.year && today.getMonth() + 1 === ym.month
    ? today
    : new Date(ym.year, ym.month - 1, 1);
}
