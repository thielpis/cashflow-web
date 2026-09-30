import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { fromIsoDate, toIsoDate } from '../../core/i18n/dates';
import { Category, TransactionType } from '../../core/models/category.model';
import { Transaction } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';

export interface TransactionDialogData {
  /** Edit this transaction; otherwise a new one is recorded. */
  transaction?: Transaction;
  /** For a new entry: income or expense. */
  type?: TransactionType;
  /** For a new entry: its initial date. */
  date?: Date;
}

/** Records or edits an income or expense. Closes with true once saved. */
@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    CategoryIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ existing ? 'Επεξεργασία κίνησης' : 'Νέα κίνηση' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }

        <mat-button-toggle-group formControlName="type" class="type" aria-label="Είδος" (change)="onTypeChange()">
          <mat-button-toggle value="Expense"><mat-icon>south_east</mat-icon> Έξοδο</mat-button-toggle>
          <mat-button-toggle value="Income"><mat-icon>north_east</mat-icon> Έσοδο</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline">
          <mat-label>Κατηγορία</mat-label>
          <mat-select formControlName="categoryId">
            @for (category of options; track category.id) {
              <mat-option [value]="category.id">
                <span class="option"><app-category-icon [icon]="category.icon" [color]="category.color" [size]="26" />{{ category.name }}</span>
              </mat-option>
            }
          </mat-select>
          @if (!loadingCategories && !options.length) {
            <mat-hint>Δεν υπάρχουν κατηγορίες. <a routerLink="/categories" mat-dialog-close>Δημιούργησέ τες</a>.</mat-hint>
          }
          @if (form.controls.categoryId.invalid) { <mat-error>Διάλεξε κατηγορία.</mat-error> }
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Ποσό</mat-label>
            <input matInput type="number" inputmode="decimal" min="0.01" step="0.01" formControlName="amount" cdkFocusInitial />
            <span matTextSuffix>€</span>
            @if (form.controls.amount.invalid) { <mat-error>Θετικό ποσό, με έως 2 δεκαδικά.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ημερομηνία</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
            @if (form.controls.date.invalid) { <mat-error>Συμπλήρωσε την ημερομηνία.</mat-error> }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Περιγραφή</mat-label>
          <input matInput formControlName="description" maxlength="200" placeholder="π.χ. Ψώνια εβδομάδας" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Σημειώσεις</mat-label>
          <textarea matInput formControlName="notes" rows="2" maxlength="1000"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Ακύρωση</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving">
          <mat-icon>{{ saving ? 'hourglass_top' : 'save' }}</mat-icon> {{ saving ? 'Αποθήκευση…' : 'Αποθήκευση' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .fields { display: grid; gap: 4px; width: min(480px, 82vw); }
      .type { margin: 4px 0 16px; width: 100%; }
      .type mat-button-toggle { flex: 1; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .option { display: inline-flex; align-items: center; gap: 10px; }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
      @media (max-width: 520px) { .row { grid-template-columns: 1fr; gap: 0; } }
    `,
  ],
})
export class TransactionDialogComponent {
  private readonly data = inject<TransactionDialogData | null>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private readonly dialogRef = inject(MatDialogRef<TransactionDialogComponent>);
  private readonly transactions = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  readonly existing = this.data.transaction;
  categories: Category[] = [];
  options: Category[] = [];
  loadingCategories = true;
  saving = false;
  error = '';

  readonly form = inject(FormBuilder).group({
    type: [this.existing?.type ?? this.data.type ?? ('Expense' as TransactionType), Validators.required],
    categoryId: [this.existing?.categoryId ?? '', Validators.required],
    amount: [this.existing?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01), Validators.max(10_000_000), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    date: [this.existing ? fromIsoDate(this.existing.date) : (this.data.date ?? new Date()), Validators.required],
    description: [this.existing?.description ?? ''],
    notes: [this.existing?.notes ?? ''],
  });

  constructor() {
    void this.loadCategories();
  }

  onTypeChange(): void {
    this.form.controls.categoryId.setValue('');
    this.filterOptions();
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    const request = {
      categoryId: raw.categoryId!,
      amount: Number(raw.amount),
      date: toIsoDate(raw.date!),
      description: raw.description?.trim() || null,
      notes: raw.notes?.trim() || null,
    };
    try {
      await firstValueFrom(
        this.existing
          ? this.transactions.update(this.existing.id, request)
          : this.transactions.create(request)
      );
      this.snackBar.open(this.existing ? 'Η κίνηση ενημερώθηκε.' : 'Η κίνηση καταχωρήθηκε.', 'Κλείσιμο', {
        duration: 3000,
      });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Η κίνηση δεν αποθηκεύτηκε. Έλεγξε τα στοιχεία και δοκίμασε ξανά.');
    } finally {
      this.saving = false;
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      this.categories = await firstValueFrom(this.categoryService.list());
      this.filterOptions();
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Οι κατηγορίες δεν φορτώθηκαν.');
    } finally {
      this.loadingCategories = false;
    }
  }

  /** Active categories of the chosen type; an edited entry keeps its archived category. */
  private filterOptions(): void {
    const type = this.form.controls.type.value;
    this.options = this.categories.filter(
      c => c.type === type && (c.isActive || c.id === this.existing?.categoryId)
    );
  }
}
