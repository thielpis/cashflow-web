import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { BudgetService } from '../../core/services/budget.service';

export interface BudgetDialogData {
  categoryId: string;
  categoryName: string;
  monthlyLimit: number | null;
}

/** Sets an expense category's monthly limit. Closes with true once saved. */
@Component({
  selector: 'app-budget-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Όριο · {{ data.categoryName }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <mat-form-field appearance="outline">
          <mat-label>Μηνιαίο όριο</mat-label>
          <input matInput type="number" inputmode="decimal" min="1" step="1" formControlName="monthlyLimit" cdkFocusInitial />
          <span matTextSuffix>€</span>
          <mat-hint>Πόσα θέλεις να ξοδεύεις το πολύ κάθε μήνα σε αυτή την κατηγορία.</mat-hint>
          @if (form.controls.monthlyLimit.invalid) { <mat-error>Θετικό ποσό, με έως 2 δεκαδικά.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Ακύρωση</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving">{{ saving ? 'Αποθήκευση…' : 'Αποθήκευση' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .fields { display: grid; width: min(400px, 82vw); }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
    `,
  ],
})
export class BudgetDialogComponent {
  readonly data = inject<BudgetDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BudgetDialogComponent>);
  private readonly budgets = inject(BudgetService);
  private readonly snackBar = inject(MatSnackBar);

  saving = false;
  error = '';

  readonly form = inject(FormBuilder).group({
    monthlyLimit: [this.data.monthlyLimit, [Validators.required, Validators.min(0.01), Validators.max(10_000_000), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(this.budgets.set(this.data.categoryId, Number(this.form.getRawValue().monthlyLimit)));
      this.snackBar.open('Το όριο αποθηκεύτηκε.', 'Κλείσιμο', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Το όριο δεν αποθηκεύτηκε.');
    } finally {
      this.saving = false;
    }
  }
}
