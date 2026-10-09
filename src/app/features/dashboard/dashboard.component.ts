import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { currentMonth, defaultDateIn, monthRange, toIsoDate, YearMonth } from '../../core/i18n/dates';
import { monthLabel } from '../../core/i18n/months';
import { TransactionType } from '../../core/models/category.model';
import { CategoryTotal, MonthDashboard } from '../../core/models/dashboard.model';
import { Goal } from '../../core/models/goal.model';
import { Celebration } from '../../core/models/person.model';
import { RecurringDue } from '../../core/models/recurring.model';
import { Transaction } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { GoalService } from '../../core/services/goal.service';
import { PersonService } from '../../core/services/person.service';
import { RecurringService } from '../../core/services/recurring.service';
import { celebrationLabel, doneLabel, dueLabel, RemindersStore } from '../../core/services/reminders.store';
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
    MatCheckboxModule,
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
  private readonly recurringService = inject(RecurringService);
  private readonly goalService = inject(GoalService);
  private readonly personService = inject(PersonService);
  private readonly reminders = inject(RemindersStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly firstName = inject(AuthService).displayName().split(/[\s@]/)[0];
  month: YearMonth = currentMonth();
  data: MonthDashboard | null = null;
  /** The month's recurring incomes and expenses, to tick off as they come in or are paid. */
  dues: RecurringDue[] = [];
  /** The due being ticked or unticked, to disable its checkbox meanwhile. */
  savingDue: RecurringDue | null = null;
  goals: Goal[] = [];
  /** Birthdays and name days of the month, for the gifts still to buy. */
  monthCelebrations: Celebration[] = [];
  /** The next 30 days' birthdays and name days. */
  comingCelebrations: Celebration[] = [];
  /** No categories yet: the page offers to create the default ones. */
  needsSetup = false;
  loading = true;
  creatingDefaults = false;
  errorMessage = '';

  constructor() {
    void this.load();
    // A tick anywhere enters or deletes a transaction, so the month's totals change along with its list.
    this.reminders.paidChanged.pipe(takeUntilDestroyed()).subscribe(() => void this.load());
  }

  get paidCount(): number {
    return this.dues.filter(x => x.paidOn).length;
  }

  /** Recurring expenses of the month not yet ticked as paid. */
  get unpaidTotal(): number {
    return this.pendingTotal('Expense');
  }

  /** Recurring income of the month not yet ticked as received. */
  get unreceivedTotal(): number {
    return this.pendingTotal('Income');
  }

  private pendingTotal(type: TransactionType): number {
    return this.dues.filter(x => !x.paidOn && x.type === type).reduce((sum, x) => sum + x.amount, 0);
  }

  done(due: RecurringDue): string {
    return doneLabel(due);
  }

  /** Recurring income still to come in the month. */
  get upcomingIncome(): number {
    return (this.data?.upcoming ?? []).filter(x => x.type === 'Income').reduce((sum, x) => sum + x.amount, 0);
  }

  /** Recurring expenses still to come in the month. */
  get upcomingExpenses(): number {
    return (this.data?.upcoming ?? []).filter(x => x.type === 'Expense').reduce((sum, x) => sum + x.amount, 0);
  }

  /** Gifts for the birthdays and name days still to come in the month. */
  get upcomingGifts(): number {
    return this.monthCelebrations.filter(x => x.daysLeft >= 0).reduce((sum, x) => sum + (x.giftBudget ?? 0), 0);
  }

  /** What the month should bring in: entered so far plus the recurring income to come. */
  get expectedIncome(): number {
    return (this.data?.income ?? 0) + this.upcomingIncome;
  }

  /** What the month should cost: spent so far plus the recurring expenses and gifts to come. */
  get expectedExpenses(): number {
    return (this.data?.expenses ?? 0) + this.upcomingExpenses + this.upcomingGifts;
  }

  get openGoals(): Goal[] {
    return this.goals.filter(x => !x.isReached).slice(0, 4);
  }

  /** A part of a whole as a bar width. */
  ratio(part: number, whole: number): number {
    return whole > 0 ? Math.min((part / whole) * 100, 100) : 0;
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
    // Another month's dues and gifts must not linger if this month's fail to load.
    this.dues = [];
    this.monthCelebrations = [];
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    // The side panels' failures must not take the month's figures down with them.
    void this.loadDues();
    void this.loadSidePanels();
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

  async loadDues(): Promise<void> {
    const month = this.month;
    try {
      const dues = await firstValueFrom(this.recurringService.dues(month));
      // A reply for a month the user has since left is dropped.
      if (month === this.month) this.dues = dues;
    } catch {
      // Keeps the list shown; the next full load retries.
    }
  }

  async loadSidePanels(): Promise<void> {
    const month = this.month;
    const { from, to } = monthRange(month);
    const today = new Date();
    const ahead = toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));
    await Promise.all([
      firstValueFrom(this.goalService.list()).then(goals => (this.goals = goals), () => undefined),
      firstValueFrom(this.personService.celebrations(from, to)).then(
        items => {
          if (month === this.month) this.monthCelebrations = items;
        },
        () => undefined
      ),
      firstValueFrom(this.personService.celebrations(toIsoDate(today), ahead)).then(
        items => (this.comingCelebrations = items.slice(0, 6)),
        () => undefined
      ),
    ]);
  }

  async togglePaid(due: RecurringDue, change: MatCheckboxChange): Promise<void> {
    this.savingDue = due;
    try {
      // The store reloads the reminders and signals paidChanged, which reloads this page.
      await this.reminders.setPaid(due, change.checked);
    } catch (error: unknown) {
      // The binding still holds the old value, so Angular would not reset the box by itself.
      change.source.checked = !change.checked;
      this.snackBar.open(apiErrorMessage(error, 'Η αλλαγή δεν αποθηκεύτηκε.'), 'Κλείσιμο', { duration: 5000 });
    } finally {
      this.savingDue = null;
    }
  }

  dueLabel(daysLeft: number): string {
    return dueLabel(daysLeft);
  }

  celebrationLabel(item: Celebration): string {
    return celebrationLabel(item);
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
