import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { currentMonth, defaultDateIn, YearMonth } from '../../core/i18n/dates';
import { monthLabel } from '../../core/i18n/months';
import { TransactionType } from '../../core/models/category.model';
import { CategoryTotal, MonthDashboard } from '../../core/models/dashboard.model';
import { Transaction } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { FinanceChartComponent } from '../../shared/ui/finance-chart.component';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';
import { TransactionDialogComponent } from '../transactions/transaction-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CategoryIconComponent,
    FinanceChartComponent,
    MonthNavComponent,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './dashboard.component.scss'],
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly firstName = inject(AuthService).displayName().split(/[\s@]/)[0];
  month: YearMonth = currentMonth();
  data: MonthDashboard | null = null;
  /** No categories yet: the page offers to create the default ones. */
  needsSetup = false;
  loading = true;
  creatingDefaults = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  get monthName(): string {
    return monthLabel(this.month.year, this.month.month);
  }

  get previousLabel(): string {
    const previous = this.data?.previous;
    return previous ? monthLabel(previous.year, previous.month) : '';
  }

  onMonthChange(month: YearMonth): void {
    this.month = month;
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [data, categories] = await Promise.all([
        firstValueFrom(this.dashboardService.month(this.month)),
        firstValueFrom(this.categoryService.list()),
      ]);
      this.data = data;
      this.needsSetup = categories.length === 0;
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Η εικόνα του μήνα δεν φορτώθηκε. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  async createDefaults(): Promise<void> {
    this.creatingDefaults = true;
    try {
      const added = await firstValueFrom(this.categoryService.createDefaults());
      this.snackBar.open(`Δημιουργήθηκαν ${added.length} κατηγορίες.`, 'Κλείσιμο', { duration: 3000 });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Οι κατηγορίες δεν δημιουργήθηκαν.'), 'Κλείσιμο', { duration: 5000 });
    } finally {
      this.creatingDefaults = false;
    }
  }

  add(type: TransactionType): void {
    this.dialog
      .open(TransactionDialogComponent, { data: { type, date: defaultDateIn(this.month) }, autoFocus: 'dialog' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.load();
      });
  }

  edit(transaction: Transaction): void {
    this.dialog
      .open(TransactionDialogComponent, { data: { transaction }, autoFocus: 'dialog' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.load();
      });
  }

  /** Change against the previous month as a percentage; null when there is nothing to compare. */
  change(current: number, previous: number): number | null {
    return previous > 0 ? ((current - previous) / previous) * 100 : null;
  }

  /** A category's share of the month's expenses, for the bar width. */
  share(item: CategoryTotal): number {
    const total = this.data?.expenses ?? 0;
    return total > 0 ? (item.amount / total) * 100 : 0;
  }

  budgetUse(item: CategoryTotal): number {
    return item.monthlyBudget ? (item.amount / item.monthlyBudget) * 100 : 0;
  }
}
