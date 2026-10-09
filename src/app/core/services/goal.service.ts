import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContributionRequest, Goal, GoalRequest } from '../models/goal.model';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/goals`;

  /** Goals still to reach first, by target date. */
  list(): Observable<Goal[]> {
    return this.http.get<Goal[]>(this.endpoint);
  }

  create(request: GoalRequest): Observable<Goal> {
    return this.http.post<Goal>(this.endpoint, request);
  }

  update(id: string, request: GoalRequest): Observable<Goal> {
    return this.http.put<Goal>(this.byId(id), request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.byId(id));
  }

  /** Puts money aside, or takes some back out with a negative amount. */
  contribute(id: string, request: ContributionRequest): Observable<Goal> {
    return this.http.post<Goal>(`${this.byId(id)}/contributions`, request);
  }

  deleteContribution(id: string, contributionId: string): Observable<Goal> {
    return this.http.delete<Goal>(`${this.byId(id)}/contributions/${encodeURIComponent(contributionId)}`);
  }

  private byId(id: string): string {
    return `${this.endpoint}/${encodeURIComponent(id)}`;
  }
}
