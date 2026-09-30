import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';

/** The API requires 12+ characters with upper and lower case letters and a digit. */
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

function sameAsNew(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  return parent && control.value !== parent.get('newPassword')?.value ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Αλλαγή κωδικού</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <mat-form-field appearance="outline">
          <mat-label>Τρέχων κωδικός</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Νέος κωδικός</mat-label>
          <input matInput type="password" formControlName="newPassword" autocomplete="new-password" (input)="form.controls.confirm.updateValueAndValidity()" />
          <mat-hint>Τουλάχιστον 12 χαρακτήρες, με κεφαλαία, πεζά και αριθμό.</mat-hint>
          @if (form.controls.newPassword.invalid) { <mat-error>Τουλάχιστον 12 χαρακτήρες, με κεφαλαία, πεζά και αριθμό.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Επιβεβαίωση νέου κωδικού</mat-label>
          <input matInput type="password" formControlName="confirm" autocomplete="new-password" />
          @if (form.controls.confirm.invalid) { <mat-error>Οι κωδικοί δεν ταιριάζουν.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Ακύρωση</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving">
          {{ saving ? 'Αποθήκευση…' : 'Αλλαγή' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .fields {
        display: grid;
        gap: 6px;
        min-width: min(380px, 80vw);
      }
      .error {
        margin: 0 0 8px;
        padding: 10px 12px;
        border-radius: 8px;
        background: #fff1f3;
        color: var(--cf-danger);
        font-size: 13px;
      }
    `,
  ],
})
export class ChangePasswordDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);

  saving = false;
  error = '';

  readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
    confirm: ['', [Validators.required, sameAsNew]],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const { currentPassword, newPassword } = this.form.getRawValue();
    try {
      await firstValueFrom(this.auth.changePassword(currentPassword, newPassword));
      this.snackBar.open('Ο κωδικός άλλαξε.', 'Κλείσιμο', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Ο κωδικός δεν άλλαξε. Δοκίμασε ξανά.');
    } finally {
      this.saving = false;
    }
  }
}
