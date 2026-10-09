import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { fromIsoDate, toIsoDate } from '../../core/i18n/dates';
import { Goal } from '../../core/models/goal.model';
import { GoalService } from '../../core/services/goal.service';
import { CATEGORY_COLORS } from '../../shared/ui/category-palette';

/** Icons offered for goals. */
const GOAL_ICONS = [
  'directions_car',
  'flight',
  'home',
  'beach_access',
  'school',
  'phone_iphone',
  'laptop',
  'chair',
  'celebration',
  'child_care',
  'pets',
  'medical_services',
  'savings',
  'shield',
  'two_wheeler',
  'star',
];

/** Creates or edits a savings goal. Closes with true once saved. */
@Component({
  selector: 'app-goal-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ existing ? 'Επεξεργασία στόχου' : 'Νέος στόχος' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <mat-form-field appearance="outline">
          <mat-label>Τι θέλεις να αποκτήσεις;</mat-label>
          <input matInput formControlName="name" maxlength="100" placeholder="π.χ. Αυτοκίνητο, Διακοπές" />
          @if (form.controls.name.invalid) { <mat-error>Δώσε όνομα στον στόχο.</mat-error> }
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Ποσό που χρειάζεσαι</mat-label>
            <input matInput type="number" inputmode="decimal" min="0.01" step="0.01" formControlName="targetAmount" />
            <span matTextSuffix>€</span>
            @if (form.controls.targetAmount.invalid) { <mat-error>Θετικό ποσό, με έως 2 δεκαδικά.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Μέχρι πότε (προαιρετικά)</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="targetDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
            <mat-hint>Για να δεις πόσα να βάζεις στην άκρη τον μήνα.</mat-hint>
          </mat-form-field>
        </div>

        <span class="label">Εικονίδιο</span>
        <div class="icons" role="radiogroup" aria-label="Εικονίδιο">
          @for (icon of icons; track icon) {
            <button type="button" class="icon" role="radio" [class.selected]="form.controls.icon.value === icon" [attr.aria-checked]="form.controls.icon.value === icon" [attr.aria-label]="icon" (click)="form.controls.icon.setValue(icon)" [style.color]="form.controls.color.value"><mat-icon>{{ icon }}</mat-icon></button>
          }
        </div>
        <span class="label">Χρώμα</span>
        <div class="swatches" role="radiogroup" aria-label="Χρώμα">
          @for (color of colors; track color) {
            <button type="button" class="swatch" role="radio" [style.background]="color" [class.selected]="form.controls.color.value === color" [attr.aria-checked]="form.controls.color.value === color" [attr.aria-label]="color" (click)="form.controls.color.setValue(color)"></button>
          }
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Σημειώσεις</mat-label>
          <textarea matInput formControlName="notes" maxlength="1000" rows="2"></textarea>
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
      .fields { display: grid; gap: 4px; width: min(520px, 82vw); }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .label { margin: 4px 0 6px; color: var(--cf-muted); font-size: 12px; font-weight: 600; }
      .swatches, .icons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .swatch { width: 30px; height: 30px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 1px var(--cf-border); cursor: pointer; }
      .swatch.selected { box-shadow: 0 0 0 2px var(--cf-text); }
      .icon { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--cf-border); border-radius: 10px; background: white; cursor: pointer; }
      .icon.selected { border-color: currentColor; box-shadow: 0 0 0 1px currentColor; background: color-mix(in srgb, currentColor 10%, white); }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
      @media (max-width: 520px) { .row { grid-template-columns: 1fr; gap: 0; } }
    `,
  ],
})
export class GoalDialogComponent {
  readonly existing = inject<Goal | null>(MAT_DIALOG_DATA, { optional: true }) ?? undefined;
  private readonly dialogRef = inject(MatDialogRef<GoalDialogComponent>);
  private readonly goals = inject(GoalService);
  private readonly snackBar = inject(MatSnackBar);

  readonly icons = GOAL_ICONS;
  readonly colors = CATEGORY_COLORS;
  saving = false;
  error = '';

  readonly form = inject(FormBuilder).group({
    name: [this.existing?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    targetAmount: [this.existing?.targetAmount ?? (null as number | null), [Validators.required, Validators.min(0.01), Validators.max(10_000_000), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    targetDate: [this.existing?.targetDate ? fromIsoDate(this.existing.targetDate) : (null as Date | null)],
    icon: [this.existing?.icon ?? GOAL_ICONS[0]],
    color: [this.existing?.color ?? CATEGORY_COLORS[2]],
    notes: [this.existing?.notes ?? ''],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    const request = {
      name: raw.name!.trim(),
      targetAmount: Number(raw.targetAmount),
      targetDate: raw.targetDate ? toIsoDate(raw.targetDate) : null,
      icon: raw.icon || null,
      color: raw.color || null,
      notes: raw.notes?.trim() || null,
    };
    try {
      await firstValueFrom(this.existing ? this.goals.update(this.existing.id, request) : this.goals.create(request));
      this.snackBar.open(this.existing ? 'Ο στόχος ενημερώθηκε.' : 'Ο στόχος δημιουργήθηκε.', 'Κλείσιμο', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Ο στόχος δεν αποθηκεύτηκε.');
    } finally {
      this.saving = false;
    }
  }
}
