import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, debounceTime, distinctUntilChanged, firstValueFrom, map, merge, of, startWith, switchMap } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { MONTH_NAMES } from '../../core/i18n/months';
import { Person, PersonRequest } from '../../core/models/person.model';
import { PersonService } from '../../core/services/person.service';

export interface PersonDialogData {
  person?: Person;
  /** For a new family member: whose family they join. */
  relatedToId?: string;
  /** Everyone, to choose whose family a person belongs to. */
  people: Person[];
}

const RELATIONSHIPS = ['Μητέρα', 'Πατέρας', 'Σύζυγος', 'Σύντροφος', 'Γιος', 'Κόρη', 'Αδελφός', 'Αδελφή', 'Παππούς', 'Γιαγιά', 'Θείος', 'Θεία', 'Ξάδερφος', 'Ξαδέρφη', 'Νονός', 'Νονά', 'Βαφτιστήρι', 'Φίλος', 'Φίλη', 'Συνάδελφος'];

/** Adds or edits a loved one. Closes with true once saved. */
@Component({
  selector: 'app-person-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ existing ? 'Επεξεργασία προσώπου' : relatedName ? 'Νέο μέλος · ' + relatedName : 'Νέο πρόσωπο' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        @if (error) { <p class="error" role="alert">{{ error }}</p> }

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Όνομα</mat-label>
            <input matInput formControlName="firstName" maxlength="100" />
            @if (form.controls.firstName.invalid) { <mat-error>Συμπλήρωσε το όνομα.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Επώνυμο</mat-label>
            <input matInput formControlName="lastName" maxlength="100" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Μέλος της οικογένειας του/της</mat-label>
            <mat-select formControlName="relatedToId">
              <mat-option [value]="null">— Κανενός (δικό μου πρόσωπο) —</mat-option>
              @for (person of owners; track person.id) { <mat-option [value]="person.id">{{ person.fullName }}</mat-option> }
            </mat-select>
            @if (hasMembers) { <mat-hint>Έχει δικά του μέλη, οπότε μένει κύριο πρόσωπο.</mat-hint> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ form.controls.relatedToId.value ? 'Σχέση με αυτόν/ή' : 'Σχέση με εμένα' }}</mat-label>
            <input matInput formControlName="relationship" maxlength="50" [attr.list]="'relationships'" placeholder="π.χ. Φίλος, Σύζυγος" />
            <datalist id="relationships">@for (r of relationships; track r) { <option [value]="r"></option> }</datalist>
          </mat-form-field>
        </div>

        <h3>Επικοινωνία</h3>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Τηλέφωνο</mat-label>
            <input matInput type="tel" formControlName="phone" maxlength="30" />
            <mat-icon matIconSuffix>call</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" maxlength="200" />
            <mat-icon matIconSuffix>mail</mat-icon>
            @if (form.controls.email.invalid) { <mat-error>Το email δεν είναι έγκυρο.</mat-error> }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Διεύθυνση</mat-label>
          <input matInput formControlName="address" maxlength="300" />
          <mat-icon matIconSuffix>home</mat-icon>
        </mat-form-field>

        <h3>Γενέθλια</h3>
        <div class="row three">
          <mat-form-field appearance="outline">
            <mat-label>Ημέρα</mat-label>
            <input matInput type="number" min="1" max="31" formControlName="birthDay" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Μήνας</mat-label>
            <mat-select formControlName="birthMonth">
              <mat-option [value]="null">—</mat-option>
              @for (name of months; track $index) { <mat-option [value]="$index + 1">{{ name }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Έτος (προαιρετικά)</mat-label>
            <input matInput type="number" min="1900" [max]="thisYear" formControlName="birthYear" />
          </mat-form-field>
        </div>

        <h3>Γιορτή</h3>
        @if (!form.controls.customNameDay.value) {
          <p class="hint">
            <mat-icon>celebration</mat-icon>
            @if (!form.controls.firstName.value?.trim()) { Γράψε το όνομα και θα βρω τη γιορτή στο εορτολόγιο. }
            @else if (calendarNameDay === undefined) { Ψάχνω στο εορτολόγιο… }
            @else if (calendarNameDay) { Γιορτάζει φέτος στις <strong>{{ calendarNameDay | date: 'd MMMM' }}</strong> (από το εορτολόγιο). }
            @else { Το όνομα δεν βρέθηκε στο εορτολόγιο. Γράψε το εκκλησιαστικό όνομα ή όρισε τη γιορτή με το χέρι. }
          </p>
          <mat-form-field appearance="outline">
            <mat-label>Όνομα εορτής (αν διαφέρει)</mat-label>
            <input matInput formControlName="nameDayName" maxlength="100" placeholder="π.χ. Δημήτριος για τον «Τζίμη»" />
          </mat-form-field>
        }
        <mat-checkbox formControlName="customNameDay">Ορίζω τη γιορτή με το χέρι</mat-checkbox>
        @if (form.controls.customNameDay.value) {
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Ημέρα</mat-label>
              <input matInput type="number" min="1" max="31" formControlName="nameDayDay" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Μήνας</mat-label>
              <mat-select formControlName="nameDayMonth">
                @for (name of months; track $index) { <mat-option [value]="$index + 1">{{ name }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
        }

        <h3>Δώρα & υπενθυμίσεις</h3>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Ποσό δώρου ανά περίσταση</mat-label>
            <input matInput type="number" inputmode="decimal" min="0.01" step="0.01" formControlName="giftBudget" />
            <span matTextSuffix>€</span>
            @if (form.controls.giftBudget.invalid) { <mat-error>Θετικό ποσό, με έως 2 δεκαδικά.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Υπενθύμιση</mat-label>
            <input matInput type="number" min="0" max="60" formControlName="remindDaysBefore" />
            <span matTextSuffix>μέρες πριν</span>
            @if (form.controls.remindDaysBefore.invalid) { <mat-error>Από 0 έως 60.</mat-error> }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Σημειώσεις (ιδέες για δώρα, νούμερο ρούχων…)</mat-label>
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
      .fields { display: grid; gap: 4px; width: min(600px, 84vw); }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .row.three { grid-template-columns: 1fr 1.4fr 1fr; }
      h3 { margin: 8px 0 8px; font-size: 13px; color: var(--cf-muted); text-transform: uppercase; letter-spacing: .3px; }
      .hint { margin: 0 0 10px; display: flex; align-items: center; gap: 8px; color: var(--cf-muted); font-size: 13px; }
      .hint mat-icon { flex: 0 0 auto; width: 18px; height: 18px; font-size: 18px; color: #e8743b; }
      mat-checkbox { margin-bottom: 8px; }
      .error { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fff1f3; color: var(--cf-danger); font-size: 13px; }
      @media (max-width: 560px) { .row, .row.three { grid-template-columns: 1fr; gap: 0; } }
    `,
  ],
})
export class PersonDialogComponent {
  private readonly data = inject<PersonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PersonDialogComponent>);
  private readonly people = inject(PersonService);
  private readonly snackBar = inject(MatSnackBar);

  readonly existing = this.data.person;
  readonly months = MONTH_NAMES;
  readonly relationships = RELATIONSHIPS;
  readonly thisYear = new Date().getFullYear();
  /** Families are one level deep: only the user's own people can have members, and not the person itself. */
  readonly owners = this.data.people.filter(x => !x.relatedToId && x.id !== this.existing?.id);
  readonly hasMembers = !!this.existing && this.data.people.some(x => x.relatedToId === this.existing!.id);
  readonly relatedName = this.data.people.find(x => x.id === this.data.relatedToId)?.fullName ?? '';
  /** The calendar's name day this year; undefined while looking it up. */
  calendarNameDay: string | null | undefined = null;
  saving = false;
  error = '';

  readonly form = inject(FormBuilder).group({
    firstName: [this.existing?.firstName ?? '', [Validators.required, Validators.maxLength(100)]],
    lastName: [this.existing?.lastName ?? ''],
    relatedToId: [{ value: this.existing ? this.existing.relatedToId : (this.data.relatedToId ?? null), disabled: this.hasMembers }],
    relationship: [this.existing?.relationship ?? ''],
    phone: [this.existing?.phone ?? ''],
    email: [this.existing?.email ?? '', Validators.email],
    address: [this.existing?.address ?? ''],
    birthDay: [this.existing?.birthDay ?? (null as number | null), [Validators.min(1), Validators.max(31)]],
    birthMonth: [this.existing?.birthMonth ?? (null as number | null)],
    birthYear: [this.existing?.birthYear ?? (null as number | null), [Validators.min(1900), Validators.max(this.thisYear)]],
    nameDayName: [this.existing?.nameDayName ?? ''],
    customNameDay: [!!this.existing?.nameDayDay],
    nameDayDay: [this.existing?.nameDayDay ?? (null as number | null), [Validators.min(1), Validators.max(31)]],
    nameDayMonth: [this.existing?.nameDayMonth ?? (null as number | null)],
    giftBudget: [this.existing?.giftBudget ?? (null as number | null), [Validators.min(0.01), Validators.max(10_000_000), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    remindDaysBefore: [this.existing?.remindDaysBefore ?? 7, [Validators.required, Validators.min(0), Validators.max(60), Validators.pattern(/^\d+$/)]],
    notes: [this.existing?.notes ?? ''],
  });

  constructor() {
    const controls = this.form.controls;
    // Looks the name up as it is typed, so the user sees whether the calendar knows it.
    merge(controls.firstName.valueChanges, controls.nameDayName.valueChanges)
      .pipe(
        startWith(null),
        map(() => (controls.nameDayName.value?.trim() || controls.firstName.value?.trim() || '')),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap(name => {
          if (!name) return of(null);
          this.calendarNameDay = undefined;
          return this.people.lookupNameDay(name, this.thisYear).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed()
      )
      .subscribe(date => (this.calendarNameDay = date));
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const birthDay = raw.birthDay ? Number(raw.birthDay) : null;
    if (!!birthDay !== !!raw.birthMonth) {
      this.error = 'Συμπλήρωσε και την ημέρα και τον μήνα των γενεθλίων.';
      return;
    }
    const custom = raw.customNameDay;
    if (custom && (!raw.nameDayDay || !raw.nameDayMonth)) {
      this.error = 'Συμπλήρωσε και την ημέρα και τον μήνα της γιορτής.';
      return;
    }

    this.saving = true;
    this.error = '';
    const text = (value: string | null | undefined) => value?.trim() || null;
    const request: PersonRequest = {
      firstName: raw.firstName!.trim(),
      lastName: text(raw.lastName),
      relationship: text(raw.relationship),
      relatedToId: raw.relatedToId ?? null,
      phone: text(raw.phone),
      email: text(raw.email),
      address: text(raw.address),
      birthDay,
      birthMonth: birthDay ? raw.birthMonth : null,
      birthYear: birthDay && raw.birthYear ? Number(raw.birthYear) : null,
      nameDayName: custom ? null : text(raw.nameDayName),
      nameDayDay: custom ? Number(raw.nameDayDay) : null,
      nameDayMonth: custom ? raw.nameDayMonth : null,
      giftBudget: raw.giftBudget ? Number(raw.giftBudget) : null,
      remindDaysBefore: Number(raw.remindDaysBefore),
      notes: text(raw.notes),
    };
    try {
      await firstValueFrom(this.existing ? this.people.update(this.existing.id, request) : this.people.create(request));
      this.snackBar.open(this.existing ? 'Τα στοιχεία ενημερώθηκαν.' : 'Το πρόσωπο προστέθηκε.', 'Κλείσιμο', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: unknown) {
      this.error = apiErrorMessage(error, 'Τα στοιχεία δεν αποθηκεύτηκαν.');
    } finally {
      this.saving = false;
    }
  }
}
