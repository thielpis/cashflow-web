import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { toIsoDate } from '../../core/i18n/dates';
import { Goal } from '../../core/models/goal.model';
import { GoalService } from '../../core/services/goal.service';

export interface ContributionDialogData {
  goal: Goal;
  withdraw: boolean;
}

/** Puts money aside for a goal or takes some back out. Closes with true once saved. */
@Component({
  selector: 'app-contribution-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ data.goal.name }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <mat-button-toggle-group formControlName="withdraw" class="type" aria-label="Κίνηση">
          <mat-button-toggle [value]="false"><mat-icon>add</mat-icon> Κατάθεση</mat-button-toggle>
          <mat-button-toggle [value]="true" [disabled]="data.goal.saved <= 0"><mat-icon>remove</mat-icon> Ανάληψη</mat-button-toggle>
        </mat-button-toggle-group>
        <p class="hint">Έχεις μαζέψει {{ data.goal.saved | currency: 'EUR' }} από {{ data.goal.targetAmount | currency: 'EUR' }}@if (data.goal.remaining > 0) {, λείπουν {{ data.goal.remaining | currency: 'EUR' }}}.</p>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Ποσό</mat-label>
            <input matInput type="number" inputmode="decimal" min="0.01" step="0.01" formControlName="amount" />
            <span matTextSuffix>€</span>
            @if (form.controls.amount.invalid) { <mat-error>Θετικό ποσό, με έως 2 δεκαδικά.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ημερομηνία</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Σημείωση (προαιρετικά)</mat-label>
          <input matInput formControlName="note" maxlength="200" />
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
      .fields { display: grid; gap: 4px; width: min(460px, 82vw); }
      .type { margin: 4px 0 8px; width: 100%; }
      .type mat-button-toggle { flex: 1; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .hint { margin: 0 0 12px; color: var(--cf-muted); font-size: 13px; }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
      @media (max-width: 520px) { .row { grid-template-columns: 1fr; gap: 0; } }
    `,
  ],
})
export class ContributionDialogComponent {
  readonly data = inject<ContributionDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ContributionDialogComponent>);
  private readonly goals = inject(GoalService);
  private readonly snackBar = inject(MatSnackBar);

  saving = false;
  error = '';

  readonly form = inject(FormBuilder).group({
    withdraw: [this.data.withdraw],
    amount: [(this.data.withdraw ? null : this.data.goal.monthlyNeeded) as number | null, [Validators.required, Validators.min(0.01), Validators.max(10_000_000), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    date: [new Date(), Validators.required],
    note: [''],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    const amount = Number(raw.amount) * (raw.withdraw ? -1 : 1);
    try {
      await firstValueFrom(
        this.goals.contribute(this.data.goal.id, { amount, date: toIsoDate(raw.date!), note: raw.note?.trim() || null })
      );
      this.snackBar.open(raw.withdraw ? 'Η ανάληψη καταχωρήθηκε.' : 'Η κατάθεση καταχωρήθηκε.', 'Κλείσιμο', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Η κίνηση δεν αποθηκεύτηκε.');
    } finally {
      this.saving = false;
    }
  }
}
