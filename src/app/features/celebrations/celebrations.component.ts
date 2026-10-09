import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { currentMonth, monthRange, toIsoDate, YearMonth } from '../../core/i18n/dates';
import { Celebration } from '../../core/models/person.model';
import { PersonService } from '../../core/services/person.service';
import { celebrationLabel } from '../../core/services/reminders.store';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';

/** A day of the month with the user's celebrations and the calendar's names. */
interface CalendarDay {
  date: string;
  celebrations: Celebration[];
  names: string[];
}

/** The month's birthdays and name days of the user's people, next to the name-day calendar. */
@Component({
  selector: 'app-celebrations',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MonthNavComponent,
  ],
  templateUrl: './celebrations.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './celebrations.component.scss'],
})
export class CelebrationsComponent {
  private readonly personService = inject(PersonService);

  month: YearMonth = currentMonth();
  days: CalendarDay[] = [];
  celebrations: Celebration[] = [];
  /** Hides the days with nobody of the user's. */
  mineOnly = false;
  readonly today = toIsoDate(new Date());
  loading = true;
  hasLoaded = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  get shownDays(): CalendarDay[] {
    return this.mineOnly ? this.days.filter(x => x.celebrations.length) : this.days;
  }

  /** What the month's gifts come to, for the people with a gift amount. */
  get giftTotal(): number {
    return this.celebrations.reduce((sum, x) => sum + (x.giftBudget ?? 0), 0);
  }

  onMonthChange(month: YearMonth): void {
    this.month = month;
    void this.load();
  }

  async load(): Promise<void> {
    const month = this.month;
    this.loading = true;
    this.errorMessage = '';
    try {
      const { from, to } = monthRange(month);
      const [celebrations, nameDays] = await Promise.all([
        firstValueFrom(this.personService.celebrations(from, to)),
        firstValueFrom(this.personService.nameDays(month)),
      ]);
      if (month !== this.month) return;
      this.celebrations = celebrations;
      const names = new Map(nameDays.map(x => [x.date, x.names]));
      const last = new Date(month.year, month.month, 0).getDate();
      this.days = Array.from({ length: last }, (_, i) => {
        const date = toIsoDate(new Date(month.year, month.month - 1, i + 1));
        return { date, celebrations: celebrations.filter(x => x.date === date), names: names.get(date) ?? [] };
      }).filter(x => x.celebrations.length || x.names.length);
      this.hasLoaded = true;
    } catch (error: unknown) {
      if (month === this.month) this.errorMessage = apiErrorMessage(error, 'Το εορτολόγιο δεν φορτώθηκε. Δοκίμασε ξανά.');
    } finally {
      if (month === this.month) this.loading = false;
    }
  }

  label(item: Celebration): string {
    return celebrationLabel(item);
  }
}
