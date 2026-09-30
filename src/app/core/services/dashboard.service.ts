import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { YearMonth } from '../i18n/dates';
import { MonthDashboard, YearReport } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/dashboard`;

  month({ year, month }: YearMonth): Observable<MonthDashboard> {
    return this.http.get<MonthDashboard>(`${this.endpoint}/${year}/${month}`);
  }

  year(year: number): Observable<YearReport> {
    return this.http.get<YearReport>(`${this.endpoint}/${year}`);
  }
}
