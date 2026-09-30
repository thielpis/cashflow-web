import { addMonths, fromIsoDate, monthRange, toIsoDate } from './dates';

describe('dates', () => {
  it('formats and parses API dates in local time', () => {
    const date = fromIsoDate('2026-03-05');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(5);
    expect(toIsoDate(date)).toBe('2026-03-05');
  });

  it('moves across year boundaries', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('gives the first and last day of a month', () => {
    expect(monthRange({ year: 2028, month: 2 })).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});
