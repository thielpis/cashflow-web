import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { Celebration } from '../models/person.model';
import { RecurringDue } from '../models/recurring.model';
import { PersonService } from './person.service';
import { RecurringService } from './recurring.service';

/** "σε 3 μέρες", "αύριο", "σήμερα", "εκπρόθεσμο 2 μέρες". */
export function dueLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'σήμερα';
  if (daysLeft === 1) return 'αύριο';
  if (daysLeft > 1) return `σε ${daysLeft} μέρες`;
  if (daysLeft === -1) return 'εκπρόθεσμο 1 μέρα';
  return `εκπρόθεσμο ${-daysLeft} μέρες`;
}

/** What ticking a recurring entry means: an expense was paid, an income received. */
export function doneLabel(due: Pick<RecurringDue, 'type'>): string {
  return due.type === 'Income' ? 'Εισπράχθηκε' : 'Πληρώθηκε';
}

/** "Γενέθλια · κλείνει τα 40" or "Γιορτή". */
export function celebrationLabel(item: Celebration): string {
  if (item.kind === 'NameDay') return 'Γιορτή';
  return item.age ? `Γενέθλια · κλείνει τα ${item.age}` : 'Γενέθλια';
}

/**
 * The pending recurring incomes and expenses and the coming birthdays and name days shown in the
 * sidebar, shared with the dashboard so a tick in either place updates both. A tick enters the
 * transaction, so it changes the month's totals too.
 */
@Injectable({ providedIn: 'root' })
export class RemindersStore {
  private readonly recurring = inject(RecurringService);
  private readonly people = inject(PersonService);

  readonly items = signal<RecurringDue[]>([]);
  readonly celebrations = signal<Celebration[]>([]);
  /** Emits after a due is ticked or unticked anywhere. */
  readonly paidChanged = new Subject<void>();

  async refresh(): Promise<void> {
    // The reminders are a side panel: a failed refresh keeps the last list instead of breaking the page.
    await Promise.all([
      firstValueFrom(this.recurring.reminders()).then(items => this.items.set(items), () => undefined),
      firstValueFrom(this.people.reminders()).then(items => this.celebrations.set(items), () => undefined),
    ]);
  }

  async setPaid(due: RecurringDue, paid: boolean): Promise<void> {
    await firstValueFrom(this.recurring.setPaid(due, paid));
    this.paidChanged.next();
    await this.refresh();
  }
}
