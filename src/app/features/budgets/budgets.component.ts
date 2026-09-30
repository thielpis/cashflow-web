import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { currentMonth, YearMonth } from '../../core/i18n/dates';
import { Budget } from '../../core/models/budget.model';
import { Category } from '../../core/models/category.model';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';
import { BudgetDialogComponent, BudgetDialogData } from './budget-dialog.component';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CategoryIconComponent,
    MonthNavComponent,
  ],
  templateUrl: './budgets.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './budgets.component.scss'],
})
export class BudgetsComponent {
  private readonly budgetService = inject(BudgetService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  month: YearMonth = currentMonth();
  budgets: Budget[] = [];
  /** Active expense categories without a limit. */
  unbudgeted: Category[] = [];
  loading = true;
  hasLoaded = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  get totalLimit(): number {
    return this.budgets.reduce((sum, x) => sum + x.monthlyLimit, 0);
  }

  get totalSpent(): number {
    return this.budgets.reduce((sum, x) => sum + x.spent, 0);
  }

  use(budget: Budget): number {
    return (budget.spent / budget.monthlyLimit) * 100;
  }

  onMonthChange(month: YearMonth): void {
    this.month = month;
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [budgets, categories] = await Promise.all([
        firstValueFrom(this.budgetService.list(this.month)),
        firstValueFrom(this.categoryService.list({ type: 'Expense', isActive: true })),
      ]);
      this.budgets = budgets;
      const budgeted = new Set(budgets.map(x => x.categoryId));
      this.unbudgeted = categories.filter(c => !budgeted.has(c.id));
      this.hasLoaded = true;
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Ο προϋπολογισμός δεν φορτώθηκε. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  setLimit(data: BudgetDialogData): void {
    this.dialog
      .open(BudgetDialogComponent, { data, autoFocus: 'dialog' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.load();
      });
  }

  async remove(budget: Budget): Promise<void> {
    try {
      await firstValueFrom(this.budgetService.delete(budget.categoryId));
      this.snackBar.open(`Το όριο της «${budget.categoryName}» αφαιρέθηκε.`, 'Κλείσιμο', { duration: 3000 });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Το όριο δεν αφαιρέθηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }
}
