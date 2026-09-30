import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { currentMonth, YearMonth } from '../../core/i18n/dates';
import { MONTH_NAMES } from '../../core/i18n/months';
import { CategoryTotal, YearReport } from '../../core/models/dashboard.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { FinanceChartComponent } from '../../shared/ui/finance-chart.component';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';

@Component({
  selector: 'app-year-report',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CategoryIconComponent,
    FinanceChartComponent,
    MonthNavComponent,
  ],
  templateUrl: './year-report.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './year-report.component.scss'],
})
export class YearReportComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly monthNames = MONTH_NAMES;
  period: YearMonth = currentMonth();
  report: YearReport | null = null;
  loading = true;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  onYearChange(period: YearMonth): void {
    this.period = period;
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.report = await firstValueFrom(this.dashboardService.year(this.period.year));
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Η ετήσια εικόνα δεν φορτώθηκε. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  /** A category's share of its side (income or expenses) for the year. */
  share(item: CategoryTotal): number {
    const total = item.type === 'Income' ? this.report?.income : this.report?.expenses;
    return total ? (item.amount / total) * 100 : 0;
  }

  /** Average per month, over the months that had any entries. */
  get monthlyAverageExpenses(): number {
    const months = this.report?.months.filter(m => m.income || m.expenses) ?? [];
    return months.length ? months.reduce((sum, m) => sum + m.expenses, 0) / months.length : 0;
  }
}
