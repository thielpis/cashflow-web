import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { YearMonth } from '../i18n/dates';
import {
  RecurringDue,
  RecurringTransaction,
  RecurringTransactionRequest,
} from '../models/recurring.model';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/recurring-transactions`;

  list(): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(this.endpoint);
  }

  /** Enters nothing by itself: each month is entered when it is ticked. */
  create(request: RecurringTransactionRequest): Observable<RecurringTransaction> {
    return this.http.post<RecurringTransaction>(this.endpoint, request);
  }

  update(id: string, request: RecurringTransactionRequest): Observable<RecurringTransaction> {
    return this.http.put<RecurringTransaction>(this.byId(id), request);
  }

  /** Entries already made stay. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.byId(id));
  }

  /** The month's recurring incomes and expenses, ticked or not, by due date. */
  dues({ year, month }: YearMonth): Observable<RecurringDue[]> {
    return this.http.get<RecurringDue[]>(`${this.endpoint}/dues/${year}/${month}`);
  }

  /** Pending recurring incomes and expenses: overdue since last month and due in the next 30 days. */
  reminders(): Observable<RecurringDue[]> {
    return this.http.get<RecurringDue[]>(`${this.endpoint}/reminders`);
  }

  /** Ticking enters the month's transaction, dated today; unticking deletes it. */
  setPaid(due: RecurringDue, paid: boolean): Observable<void> {
    const [year, month] = due.dueDate.split('-').map(Number);
    const url = `${this.byId(due.recurringTransactionId)}/payments/${year}/${month}`;
    return paid ? this.http.put<void>(url, null) : this.http.delete<void>(url);
  }

  private byId(id: string): string {
    return `${this.endpoint}/${encodeURIComponent(id)}`;
  }
}
