import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { RecurringTransaction } from '../../core/models/recurring.model';
import { RecurringService } from '../../core/services/recurring.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { RecurringDialogComponent } from './recurring-dialog.component';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    CategoryIconComponent,
  ],
  templateUrl: './recurring.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss'],
})
export class RecurringComponent {
  private readonly recurringService = inject(RecurringService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['description', 'amount', 'day', 'period', 'next', 'actions'];
  items: RecurringTransaction[] = [];
  loading = true;
  hasLoaded = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  /** Monthly total of the active schedules, per type. */
  total(type: 'Income' | 'Expense'): number {
    return this.items.filter(x => x.isActive && x.type === type).reduce((sum, x) => sum + x.amount, 0);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.items = await firstValueFrom(this.recurringService.list());
      this.hasLoaded = true;
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Οι πάγιες κινήσεις δεν φορτώθηκαν. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  add(): void {
    this.openDialog(null);
  }

  edit(item: RecurringTransaction): void {
    this.openDialog(item);
  }

  async toggle(item: RecurringTransaction): Promise<void> {
    try {
      await firstValueFrom(
        this.recurringService.update(item.id, {
          categoryId: item.categoryId,
          amount: item.amount,
          dayOfMonth: item.dayOfMonth,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
          isActive: !item.isActive,
        })
      );
      this.snackBar.open(item.isActive ? 'Η πάγια κίνηση σταμάτησε.' : 'Η πάγια κίνηση ενεργοποιήθηκε.', 'Κλείσιμο', {
        duration: 3000,
      });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η αλλαγή δεν αποθηκεύτηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  async remove(item: RecurringTransaction): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: '440px',
          data: {
            title: 'Διαγραφή πάγιας κίνησης',
            message: `Να διαγραφεί η «${item.description || item.categoryName}»; Οι κινήσεις που έχουν ήδη καταχωρηθεί μένουν.`,
          },
        })
        .afterClosed()
    );
    if (!confirmed) return;
    try {
      await firstValueFrom(this.recurringService.delete(item.id));
      this.snackBar.open('Η πάγια κίνηση διαγράφηκε.', 'Κλείσιμο', { duration: 3000 });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η πάγια κίνηση δεν διαγράφηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  private openDialog(item: RecurringTransaction | null): void {
    this.dialog
      .open(RecurringDialogComponent, { data: item, autoFocus: 'dialog' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.load();
      });
  }
}
