import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
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

  /** Also enters the months already due since the start date. */
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

  private byId(id: string): string {
    return `${this.endpoint}/${encodeURIComponent(id)}`;
  }
}
