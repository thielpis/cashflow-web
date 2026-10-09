import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { Person } from '../../core/models/person.model';
import { PersonService } from '../../core/services/person.service';
import { RemindersStore } from '../../core/services/reminders.store';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PersonDialogComponent, PersonDialogData } from './person-dialog.component';

/** One of the user's own people with their family members. */
interface Family {
  person: Person;
  members: Person[];
}

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './people.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './people.component.scss'],
})
export class PeopleComponent {
  private readonly personService = inject(PersonService);
  private readonly reminders = inject(RemindersStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  items: Person[] = [];
  families: Family[] = [];
  query = '';
  loading = true;
  hasLoaded = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.items = await firstValueFrom(this.personService.list());
      this.hasLoaded = true;
      this.group();
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Τα πρόσωπα δεν φορτώθηκαν. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  /** A family shows when the person or one of the members matches the search. */
  group(): void {
    const query = normalize(this.query);
    const matches = (p: Person) =>
      !query || [p.fullName, p.relationship, p.phone, p.email].some(v => v && normalize(v).includes(query));
    this.families = this.items
      .filter(x => !x.relatedToId)
      .map(person => ({ person, members: this.items.filter(m => m.relatedToId === person.id) }))
      .filter(f => matches(f.person) || f.members.some(matches));
  }

  /** Days from today to an API date. */
  daysTo(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    const today = new Date();
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  }

  when(date: string): string {
    const days = this.daysTo(date);
    return days === 0 ? 'σήμερα' : days === 1 ? 'αύριο' : `σε ${days} μέρες`;
  }

  add(relatedToId?: string): void {
    this.open({ relatedToId, people: this.items });
  }

  edit(person: Person): void {
    this.open({ person, people: this.items });
  }

  async remove(person: Person): Promise<void> {
    const members = this.items.filter(x => x.relatedToId === person.id).length;
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: '440px',
          data: {
            title: 'Διαγραφή προσώπου',
            message: `Να διαγραφεί η/ο «${person.fullName}»;${members ? ` Τα ${members} μέλη της οικογένειας μένουν ως δικά σου πρόσωπα.` : ''}`,
          },
        })
        .afterClosed()
    );
    if (!confirmed) return;
    try {
      await firstValueFrom(this.personService.delete(person.id));
      this.snackBar.open('Το πρόσωπο διαγράφηκε.', 'Κλείσιμο', { duration: 3000 });
      await this.afterChange();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Το πρόσωπο δεν διαγράφηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  private open(data: PersonDialogData): void {
    this.dialog
      .open(PersonDialogComponent, { data, autoFocus: 'dialog', maxHeight: '92vh' })
      .afterClosed()
      .subscribe(saved => {
        if (saved) void this.afterChange();
      });
  }

  /** The sidebar's birthday and name-day reminders follow the change. */
  private async afterChange(): Promise<void> {
    void this.reminders.refresh();
    await this.load();
  }
}

/** Lower case without accents, so "γιωργος" finds "Γιώργος". */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('el');
}
