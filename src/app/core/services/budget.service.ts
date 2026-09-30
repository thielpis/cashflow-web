import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from '../http/paging';
import { YearMonth } from '../i18n/dates';
import { Budget } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/budgets`;

  /** The budgets with what was spent in the month. */
  list(month: YearMonth): Observable<Budget[]> {
    return this.http.get<Budget[]>(this.endpoint, { params: toHttpParams(month) });
  }

  set(categoryId: string, monthlyLimit: number): Observable<Budget> {
    return this.http.put<Budget>(this.byCategory(categoryId), { monthlyLimit });
  }

  delete(categoryId: string): Observable<void> {
    return this.http.delete<void>(this.byCategory(categoryId));
  }

  private byCategory(categoryId: string): string {
    return `${this.endpoint}/${encodeURIComponent(categoryId)}`;
  }
}
