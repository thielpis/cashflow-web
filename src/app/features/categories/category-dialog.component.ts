import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { Category, TransactionType } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../shared/ui/category-palette';

export interface CategoryDialogData {
  category?: Category;
  type?: TransactionType;
}

/** Creates or edits a category. Closes with true once saved. */
@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    CategoryIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ existing ? 'Επεξεργασία κατηγορίας' : 'Νέα κατηγορία' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        @if (!existing) {
          <mat-button-toggle-group formControlName="type" class="type" aria-label="Είδος">
            <mat-button-toggle value="Expense">Κατηγορία εξόδων</mat-button-toggle>
            <mat-button-toggle value="Income">Κατηγορία εσόδων</mat-button-toggle>
          </mat-button-toggle-group>
        }
        <div class="name-row">
          <app-category-icon [icon]="form.controls.icon.value" [color]="form.controls.color.value" [size]="48" />
          <mat-form-field appearance="outline">
            <mat-label>Όνομα</mat-label>
            <input matInput formControlName="name" maxlength="100" cdkFocusInitial />
            @if (form.controls.name.invalid) { <mat-error>Από 2 έως 100 χαρακτήρες.</mat-error> }
          </mat-form-field>
        </div>

        <span class="label">Χρώμα</span>
        <div class="swatches" role="radiogroup" aria-label="Χρώμα">
          @for (color of colors; track color) {
            <button type="button" class="swatch" role="radio" [style.background]="color" [class.selected]="form.controls.color.value === color" [attr.aria-checked]="form.controls.color.value === color" [attr.aria-label]="color" (click)="form.controls.color.setValue(color)"></button>
          }
        </div>

        <span class="label">Εικονίδιο</span>
        <div class="icons" role="radiogroup" aria-label="Εικονίδιο">
          @for (icon of icons; track icon) {
            <button type="button" class="icon" role="radio" [class.selected]="form.controls.icon.value === icon" [attr.aria-checked]="form.controls.icon.value === icon" [attr.aria-label]="icon" (click)="form.controls.icon.setValue(icon)"><mat-icon>{{ icon }}</mat-icon></button>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Ακύρωση</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving">{{ saving ? 'Αποθήκευση…' : 'Αποθήκευση' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .fields { display: grid; gap: 6px; width: min(460px, 82vw); }
      .type { margin: 4px 0 14px; width: 100%; }
      .type mat-button-toggle { flex: 1; }
      .name-row { display: flex; align-items: flex-start; gap: 14px; }
      .name-row mat-form-field { flex: 1; }
      .name-row app-category-icon { margin-top: 4px; }
      .label { font-size: 13px; font-weight: 600; color: var(--cf-muted); }
      .swatches, .icons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .swatch { width: 30px; height: 30px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 1px var(--cf-border); cursor: pointer; }
      .swatch.selected { box-shadow: 0 0 0 2px var(--cf-text); }
      .icon { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid var(--cf-border); border-radius: 10px; background: white; color: var(--cf-muted); cursor: pointer; }
      .icon.selected { border-color: var(--cf-primary); background: var(--cf-primary-soft); color: var(--cf-primary); }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
    `,
  ],
})
export class CategoryDialogComponent {
  private readonly data = inject<CategoryDialogData | null>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private readonly dialogRef = inject(MatDialogRef<CategoryDialogComponent>);
  private readonly categories = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  readonly colors = CATEGORY_COLORS;
  readonly icons = CATEGORY_ICONS;
  readonly existing = this.data.category;
  saving = false;
  error = '';

  readonly form = inject(FormBuilder).nonNullable.group({
    type: [this.existing?.type ?? this.data.type ?? ('Expense' as TransactionType)],
    name: [this.existing?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    color: [this.existing?.color ?? CATEGORY_COLORS[2]],
    icon: [this.existing?.icon ?? 'more_horiz'],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const { type, name, color, icon } = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.existing
          ? this.categories.update(this.existing.id, {
              name: name.trim(),
              color,
              icon,
              displayOrder: this.existing.displayOrder,
              isActive: this.existing.isActive,
            })
          : this.categories.create({ name: name.trim(), type, color, icon, displayOrder: null })
      );
      this.snackBar.open(this.existing ? 'Η κατηγορία ενημερώθηκε.' : 'Η κατηγορία δημιουργήθηκε.', 'Κλείσιμο', {
        duration: 3000,
      });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Η κατηγορία δεν αποθηκεύτηκε.');
    } finally {
      this.saving = false;
    }
  }
}
