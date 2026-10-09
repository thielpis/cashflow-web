import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { saveBlob } from '../../core/http/download';
import { currentMonth, defaultDateIn, monthRange, YearMonth } from '../../core/i18n/dates';
import { formatEuro } from '../../core/i18n/format';
import { GreekPaginatorIntl } from '../../core/i18n/greek-paginator-intl';
import { Category, TransactionType } from '../../core/models/category.model';
import { Transaction, TransactionSearchParams } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { RemindersStore } from '../../core/services/reminders.store';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';
import { TransactionDialogComponent, TransactionDialogData } from './transaction-dialog.component';

type Period = 'month' | 'year' | 'all';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    CategoryIconComponent,
    MonthNavComponent,
  ],
  // Provided here rather than at the root so the paginator stays out of the initial bundle.
  providers: [{ provide: MatPaginatorIntl, useClass: GreekPaginatorIntl }],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './transactions.component.scss'],
})
export class TransactionsComponent {
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly reminders = inject(RemindersStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly search$ = new Subject<string>();

  readonly displayedColumns = ['date', 'category', 'description', 'amount', 'actions'];
  transactions: Transaction[] = [];
  categories: Category[] = [];
  totalCount = 0;
  totalIncome = 0;
  totalExpenses = 0;
  pageIndex = 0;
  pageSize = 25;

  period: Period = 'month';
  month: YearMonth = currentMonth();
  type: TransactionType | '' = '';
  categoryId = '';
  query = '';

  loading = true;
  hasLoaded = false;
  exporting = false;
  errorMessage = '';

  constructor() {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(query => {
        this.query = query;
        this.onFilterChange();
      });
    void this.loadCategories();
    void this.load();
  }

  get net(): number {
    return this.totalIncome - this.totalExpenses;
  }

  /** Categories offered by the filter: those of the chosen type. */
  get categoryOptions(): Category[] {
    return this.type ? this.categories.filter(c => c.type === this.type) : this.categories;
  }

  onSearch(value: string): void {
    this.search$.next(value.trim());
  }

  onMonthChange(month: YearMonth): void {
    this.month = month;
    this.onFilterChange();
  }

  onTypeChange(): void {
    if (this.categoryId && !this.categoryOptions.some(c => c.id === this.categoryId)) this.categoryId = '';
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    void this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await firstValueFrom(
        this.transactionService.search({
          ...this.filters(),
          page: this.pageIndex + 1,
          pageSize: this.pageSize,
        })
      );
      this.transactions = result.items;
      this.totalCount = result.totalCount;
      this.totalIncome = result.totalIncome;
      this.totalExpenses = result.totalExpenses;
      this.hasLoaded = true;
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Οι κινήσεις δεν φορτώθηκαν. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  add(type: TransactionType): void {
    this.openDialog({ type, date: this.period === 'month' ? defaultDateIn(this.month) : new Date() });
  }

  edit(transaction: Transaction): void {
    this.openDialog({ transaction });
  }

  async remove(transaction: Transaction): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: '420px',
          data: {
            title: 'Διαγραφή κίνησης',
            message: `Να διαγραφεί η κίνηση «${transaction.description || transaction.categoryName}» των ${formatEuro(transaction.amount)};`,
          },
        })
        .afterClosed()
    );
    if (!confirmed) return;
    try {
      await firstValueFrom(this.transactionService.delete(transaction.id));
      this.snackBar.open('Η κίνηση διαγράφηκε.', 'Κλείσιμο', { duration: 3000 });
      // Deleting a recurring entry unticks its month, which is pending again.
      if (transaction.recurringTransactionId) void this.reminders.refresh();
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η κίνηση δεν διαγράφηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  async exportCsv(): Promise<void> {
    this.exporting = true;
    try {
      const filters = this.filters();
      const blob = await firstValueFrom(this.transactionService.exportCsv(filters));
      saveBlob(blob, `cashflow-${filters.from ?? 'όλες'}.csv`);
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η εξαγωγή απέτυχε.'), 'Κλείσιμο', { duration: 5000 });
    } finally {
      this.exporting = false;
    }
  }

  private openDialog(data: TransactionDialogData): void {
    this.dialog
      .open(TransactionDialogComponent, { data, autoFocus: 'dialog' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.load();
      });
  }

  private filters(): Omit<TransactionSearchParams, 'page' | 'pageSize'> {
    const range =
      this.period === 'month'
        ? monthRange(this.month)
        : this.period === 'year'
          ? { from: `${this.month.year}-01-01`, to: `${this.month.year}-12-31` }
          : {};
    return {
      ...range,
      type: this.type || undefined,
      categoryId: this.categoryId || undefined,
      query: this.query || undefined,
    };
  }

  private async loadCategories(): Promise<void> {
    try {
      this.categories = await firstValueFrom(this.categoryService.list());
    } catch {
      // The filter just offers no categories; the list itself still works.
    }
  }
}
