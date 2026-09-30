import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { MONTH_NAMES, MONTH_SHORT } from '../../core/i18n/months';
import { MonthTotals } from '../../core/models/dashboard.model';

interface Tick {
  value: number;
  percent: number;
}

/**
 * Income vs expenses per month as paired columns. HTML rather than SVG so it scales with
 * its container and text stays crisp. Hovering (or focusing) a month shows both amounts.
 */
@Component({
  selector: 'app-finance-chart',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="legend" aria-hidden="true">
      <span><i class="swatch income"></i>{{ incomeLabel() }}</span>
      <span><i class="swatch expenses"></i>{{ expensesLabel() }}</span>
    </div>
    <div class="chart" role="img" [attr.aria-label]="summary()">
      <div class="axis">
        @for (tick of ticks(); track tick.value) {
          <span [style.bottom.%]="tick.percent">{{
            tick.value | currency: 'EUR' : 'symbol' : '1.0-0'
          }}</span>
        }
      </div>
      <div class="plot" [class.dense]="months().length > 8">
        @for (tick of ticks(); track tick.value) {
          <i class="grid" [style.bottom.%]="tick.percent"></i>
        }
        @for (month of months(); track month.year * 100 + month.month; let i = $index) {
          <div
            class="group"
            tabindex="0"
            (mouseenter)="active.set(i)"
            (mouseleave)="active.set(null)"
            (focus)="active.set(i)"
            (blur)="active.set(null)"
          >
            <div class="bars">
              <span class="bar income" [style.height.%]="percent(month.income)"></span>
              <span class="bar expenses" [style.height.%]="percent(month.expenses)"></span>
            </div>
            <span class="label">{{ short(month.month) }}</span>
            @if (active() === i) {
              <div class="tooltip" role="status">
                <strong>{{ long(month) }}</strong>
                <span
                  ><i class="swatch income"></i>{{ incomeLabel() }}
                  <b>{{ month.income | currency: 'EUR' }}</b></span
                >
                <span
                  ><i class="swatch expenses"></i>{{ expensesLabel() }}
                  <b>{{ month.expenses | currency: 'EUR' }}</b></span
                >
                <span class="net"
                  >Καθαρό <b>{{ month.income - month.expenses | currency: 'EUR' }}</b></span
                >
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        --income: #13866b;
        --expenses: #e8743b;
      }
      .legend {
        display: flex;
        justify-content: center;
        gap: 18px;
        margin-bottom: 14px;
        font-size: 13px;
        color: var(--cf-muted);
      }
      .legend span,
      .tooltip span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .swatch {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .swatch.income {
        background: var(--income);
      }
      .swatch.expenses {
        background: var(--expenses);
      }
      .chart {
        container-type: inline-size;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        height: 220px;
      }
      .axis {
        position: relative;
        width: 58px;
        margin-bottom: 22px;
      }
      .axis span {
        position: absolute;
        right: 0;
        transform: translateY(50%);
        font-size: 11px;
        color: var(--cf-muted);
        white-space: nowrap;
      }
      .plot {
        position: relative;
        display: flex;
        align-items: stretch;
        padding-bottom: 22px;
      }
      .grid {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: #eef0f4;
        transform: translateY(50%);
      }
      .group {
        position: relative;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        outline: none;
        border-radius: 8px;
      }
      .group:hover,
      .group:focus-visible {
        background: #f5f7fb;
      }
      .bars {
        position: relative;
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 2px;
      }
      .bar {
        width: min(24px, 32%);
        border-radius: 4px 4px 0 0;
        transition: height 0.3s ease;
      }
      .bar.income {
        background: var(--income);
      }
      .bar.expenses {
        background: var(--expenses);
      }
      .label {
        position: absolute;
        bottom: -20px;
        font-size: 12px;
        color: var(--cf-muted);
      }
      /* A year of months does not fit a phone: label every other one (tooltips keep all). */
      @container (max-width: 520px) {
        .plot.dense .group:nth-child(even of .group) .label {
          visibility: hidden;
        }
      }
      .tooltip {
        position: absolute;
        z-index: 5;
        bottom: 100%;
        left: 50%;
        transform: translate(-50%, -6px);
        display: grid;
        gap: 4px;
        min-width: 170px;
        padding: 10px 12px;
        border-radius: 10px;
        background: #111827;
        color: #fff;
        font-size: 12px;
        box-shadow: 0 8px 24px #0003;
        pointer-events: none;
      }
      .tooltip b {
        margin-left: auto;
        padding-left: 10px;
      }
      .tooltip .net {
        padding-top: 4px;
        border-top: 1px solid #ffffff26;
      }
    `,
  ],
})
export class FinanceChartComponent {
  readonly months = input.required<MonthTotals[]>();
  readonly incomeLabel = input('Έσοδα');
  readonly expensesLabel = input('Έξοδα');
  readonly active = signal<number | null>(null);

  /** A "nice" top of the scale (1, 2, 2.5 or 5 × 10ⁿ) split into four steps. */
  private readonly scaleMax = computed(() => {
    const max = Math.max(0, ...this.months().flatMap(m => [m.income, m.expenses]));
    if (max === 0) return 1000;
    const rawStep = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = [1, 2, 2.5, 5, 10].map(f => f * magnitude).find(s => s >= rawStep) ?? rawStep;
    return step * 4;
  });

  readonly ticks = computed<Tick[]>(() =>
    [0, 1, 2, 3, 4].map(i => ({ value: (this.scaleMax() / 4) * i, percent: i * 25 }))
  );

  readonly summary = computed(
    () =>
      `${this.incomeLabel()} και ${this.expensesLabel().toLowerCase()} ανά μήνα: ` +
      this.months()
        .map(
          m =>
            `${this.long(m)} ${this.incomeLabel().toLowerCase()} ${m.income.toFixed(0)} €, ` +
            `${this.expensesLabel().toLowerCase()} ${m.expenses.toFixed(0)} €`
        )
        .join('; ')
  );

  /** A zero month draws no bar; any other value is at least visible. */
  percent(value: number): number {
    if (value <= 0) return 0;
    return Math.min(100, Math.max(1, (value / this.scaleMax()) * 100));
  }

  short(month: number): string {
    return MONTH_SHORT[month - 1];
  }

  long(month: MonthTotals): string {
    return `${MONTH_NAMES[month.month - 1]} ${month.year}`;
  }
}
