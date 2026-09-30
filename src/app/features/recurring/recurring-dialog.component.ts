import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { RecurringTransaction } from '../../core/models/recurring.model';
import { CategoryService } from '../../core/services/category.service';
import { RecurringService } from '../../core/services/recurring.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';

/** Creates or edits a monthly recurring entry. Closes with true once saved. */
@Component({
  selector: 'app-recurring-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
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
    <h2 mat-dialog-title>{{ existing ? 'Επεξεργασία πάγιας κίνησης' : 'Νέα πάγια κίνηση' }}</h2>
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
              <mat-option [value]="category.id"><span class="option"><app-category-icon [icon]="category.icon" [color]="category.color" [size]="26" />{{ category.name }}</span></mat-option>
            }
          </mat-select>
          @if (form.controls.categoryId.invalid) { <mat-error>Διάλεξε κατηγορία.</mat-error> }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Περιγραφή</mat-label>
          <input matInput formControlName="description" maxlength="200" placeholder="π.χ. Ενοίκιο, Netflix, Μισθός" />
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Ποσό</mat-label>
            <input matInput type="number" inputmode="decimal" min="0.01" step="0.01" formControlName="amount" />
            <span matTextSuffix>€</span>
            @if (form.controls.amount.invalid) { <mat-error>Θετικό ποσό, με έως 2 δεκαδικά.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ημέρα του μήνα</mat-label>
            <input matInput type="number" min="1" max="31" formControlName="dayOfMonth" />
            <mat-hint>Το 31 πέφτει στην τελευταία μέρα.</mat-hint>
            @if (form.controls.dayOfMonth.invalid) { <mat-error>Από 1 έως 31.</mat-error> }
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Έναρξη</mat-label>
            <input matInput [matDatepicker]="start" formControlName="startDate" />
            <mat-datepicker-toggle matIconSuffix [for]="start" />
            <mat-datepicker #start />
            @if (form.controls.startDate.invalid) { <mat-error>Συμπλήρωσε την έναρξη.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Λήξη (προαιρετικά)</mat-label>
            <input matInput [matDatepicker]="end" formControlName="endDate" [min]="form.controls.startDate.value" />
            <mat-datepicker-toggle matIconSuffix [for]="end" />
            <mat-datepicker #end />
          </mat-form-field>
        </div>

        @if (existing) {
          <mat-checkbox formControlName="isActive">Ενεργή</mat-checkbox>
        } @else {
          <p class="hint"><mat-icon>info</mat-icon> Αν η έναρξη είναι στο παρελθόν, θα καταχωρηθούν αμέσως και οι μήνες από τότε μέχρι σήμερα.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Ακύρωση</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving">{{ saving ? 'Αποθήκευση…' : 'Αποθήκευση' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .fields { display: grid; gap: 4px; width: min(500px, 82vw); }
      .type { margin: 4px 0 16px; width: 100%; }
      .type mat-button-toggle { flex: 1; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .option { display: inline-flex; align-items: center; gap: 10px; }
      .hint { margin: 4px 0 0; display: flex; gap: 8px; color: var(--cf-muted); font-size: 13px; }
      .hint mat-icon { flex: 0 0 auto; width: 18px; height: 18px; font-size: 18px; }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
      @media (max-width: 520px) { .row { grid-template-columns: 1fr; gap: 0; } }
    `,
  ],
})
export class RecurringDialogComponent {
  readonly existing = inject<RecurringTransaction | null>(MAT_DIALOG_DATA, { optional: true }) ?? undefined;
  private readonly dialogRef = inject(MatDialogRef<RecurringDialogComponent>);
  private readonly recurring = inject(RecurringService);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  categories: Category[] = [];
  options: Category[] = [];
  saving = false;
  error = '';

  readonly form = inject(FormBuilder).group({
    type: [this.existing?.type ?? ('Expense' as TransactionType)],
    categoryId: [this.existing?.categoryId ?? '', Validators.required],
    description: [this.existing?.description ?? ''],
    amount: [this.existing?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01), Validators.max(10_000_000), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    dayOfMonth: [this.existing?.dayOfMonth ?? new Date().getDate(), [Validators.required, Validators.min(1), Validators.max(31), Validators.pattern(/^\d+$/)]],
    startDate: [this.existing ? fromIsoDate(this.existing.startDate) : new Date(), Validators.required],
    endDate: [this.existing?.endDate ? fromIsoDate(this.existing.endDate) : (null as Date | null)],
    isActive: [this.existing?.isActive ?? true],
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
      dayOfMonth: Number(raw.dayOfMonth),
      startDate: toIsoDate(raw.startDate!),
      endDate: raw.endDate ? toIsoDate(raw.endDate) : null,
      description: raw.description?.trim() || null,
      isActive: raw.isActive ?? true,
    };
    try {
      await firstValueFrom(
        this.existing ? this.recurring.update(this.existing.id, request) : this.recurring.create(request)
      );
      this.snackBar.open(this.existing ? 'Η πάγια κίνηση ενημερώθηκε.' : 'Η πάγια κίνηση δημιουργήθηκε.', 'Κλείσιμο', {
        duration: 3000,
      });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Η πάγια κίνηση δεν αποθηκεύτηκε.');
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
    }
  }

  private filterOptions(): void {
    const type = this.form.controls.type.value;
    this.options = this.categories.filter(
      c => c.type === type && (c.isActive || c.id === this.existing?.categoryId)
    );
  }
}
