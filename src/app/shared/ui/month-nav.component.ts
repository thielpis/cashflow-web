import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { addMonths, currentMonth, YearMonth } from '../../core/i18n/dates';
import { monthLabel } from '../../core/i18n/months';

/** ‹ Σεπτέμβριος 2026 › — steps through months, or years with `unit="year"`. */
@Component({
  selector: 'app-month-nav',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button mat-icon-button (click)="step(-1)" [attr.aria-label]="previousLabel()" [matTooltip]="previousLabel()">
      <mat-icon>chevron_left</mat-icon>
    </button>
    <span class="label">{{ label() }}</span>
    <button mat-icon-button (click)="step(1)" [attr.aria-label]="nextLabel()" [matTooltip]="nextLabel()">
      <mat-icon>chevron_right</mat-icon>
    </button>
    @if (!isCurrent()) {
      <button mat-stroked-button class="today" (click)="valueChange.emit(today)">Σήμερα</button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border: 1px solid var(--cf-border);
        border-radius: 12px;
        background: white;
      }
      .label {
        min-width: 150px;
        text-align: center;
        font-weight: 700;
        font-size: 15px;
      }
      .today {
        margin: 0 4px;
        height: 32px;
      }
    `,
  ],
})
export class MonthNavComponent {
  readonly value = input.required<YearMonth>();
  readonly unit = input<'month' | 'year'>('month');
  readonly valueChange = output<YearMonth>();
  readonly today = currentMonth();

  readonly label = computed(() =>
    this.unit() === 'year' ? String(this.value().year) : monthLabel(this.value().year, this.value().month)
  );
  readonly previousLabel = computed(() => (this.unit() === 'year' ? 'Προηγούμενο έτος' : 'Προηγούμενος μήνας'));
  readonly nextLabel = computed(() => (this.unit() === 'year' ? 'Επόμενο έτος' : 'Επόμενος μήνας'));
  readonly isCurrent = computed(
    () =>
      this.value().year === this.today.year &&
      (this.unit() === 'year' || this.value().month === this.today.month)
  );

  step(direction: number): void {
    this.valueChange.emit(addMonths(this.value(), direction * (this.unit() === 'year' ? 12 : 1)));
  }
}
