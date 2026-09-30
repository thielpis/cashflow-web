import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { Category, TransactionType } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { CategoryDialogComponent, CategoryDialogData } from './category-dialog.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTooltipModule,
    CategoryIconComponent,
  ],
  templateUrl: './categories.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './categories.component.scss'],
})
export class CategoriesComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly groups: { type: TransactionType; title: string }[] = [
    { type: 'Expense', title: 'Έξοδα' },
    { type: 'Income', title: 'Έσοδα' },
  ];
  categories: Category[] = [];
  showArchived = false;
  loading = true;
  hasLoaded = false;
  creatingDefaults = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  get archivedCount(): number {
    return this.categories.filter(c => !c.isActive).length;
  }

  of(type: TransactionType): Category[] {
    return this.categories.filter(c => c.type === type && (this.showArchived || c.isActive));
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.categories = await firstValueFrom(this.categoryService.list());
      this.hasLoaded = true;
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Οι κατηγορίες δεν φορτώθηκαν. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  async createDefaults(): Promise<void> {
    this.creatingDefaults = true;
    try {
      const added = await firstValueFrom(this.categoryService.createDefaults());
      this.snackBar.open(
        added.length ? `Προστέθηκαν ${added.length} κατηγορίες.` : 'Έχεις ήδη όλες τις βασικές κατηγορίες.',
        'Κλείσιμο',
        { duration: 3000 }
      );
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Οι κατηγορίες δεν δημιουργήθηκαν.'), 'Κλείσιμο', { duration: 5000 });
    } finally {
      this.creatingDefaults = false;
    }
  }

  add(type: TransactionType): void {
    this.openDialog({ type });
  }

  edit(category: Category): void {
    this.openDialog({ category });
  }

  async remove(category: Category): Promise<void> {
    const used = category.transactionCount > 0;
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: '440px',
          data: {
            title: used ? 'Αρχειοθέτηση κατηγορίας' : 'Διαγραφή κατηγορίας',
            message: used
              ? `Η «${category.name}» έχει ${category.transactionCount} κινήσεις, οπότε θα αρχειοθετηθεί: οι κινήσεις μένουν, αλλά δεν θα προτείνεται σε νέες.`
              : `Να διαγραφεί η κατηγορία «${category.name}»;`,
            confirmText: used ? 'Αρχειοθέτηση' : 'Διαγραφή',
          },
        })
        .afterClosed()
    );
    if (!confirmed) return;
    try {
      const result = await firstValueFrom(this.categoryService.delete(category.id));
      this.snackBar.open(result.archived ? 'Η κατηγορία αρχειοθετήθηκε.' : 'Η κατηγορία διαγράφηκε.', 'Κλείσιμο', {
        duration: 3000,
      });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η κατηγορία δεν διαγράφηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  async restore(category: Category): Promise<void> {
    try {
      await firstValueFrom(
        this.categoryService.update(category.id, {
          name: category.name,
          color: category.color,
          icon: category.icon,
          displayOrder: category.displayOrder,
          isActive: true,
        })
      );
      this.snackBar.open('Η κατηγορία επανήλθε.', 'Κλείσιμο', { duration: 3000 });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η κατηγορία δεν επανήλθε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  private openDialog(data: CategoryDialogData): void {
    this.dialog
      .open(CategoryDialogComponent, { data, autoFocus: 'dialog' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.load();
      });
  }
}
