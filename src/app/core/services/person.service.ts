import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from '../http/paging';
import { YearMonth } from '../i18n/dates';
import { Celebration, NameDay, Person, PersonRequest } from '../models/person.model';

@Injectable({ providedIn: 'root' })
export class PersonService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/people`;
  private readonly nameDaysEndpoint = `${environment.apiBaseUrl}/name-days`;

  /** Everyone, family members included, by name. */
  list(): Observable<Person[]> {
    return this.http.get<Person[]>(this.endpoint);
  }

  create(request: PersonRequest): Observable<Person> {
    return this.http.post<Person>(this.endpoint, request);
  }

  update(id: string, request: PersonRequest): Observable<Person> {
    return this.http.put<Person>(this.byId(id), request);
  }

  /** The person's family members stay. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.byId(id));
  }

  /** Birthdays and name days between two API dates (at most 400 days apart). */
  celebrations(from: string, to: string): Observable<Celebration[]> {
    return this.http.get<Celebration[]>(`${this.endpoint}/celebrations`, { params: toHttpParams({ from, to }) });
  }

  /** What comes up within each person's reminder days. */
  reminders(): Observable<Celebration[]> {
    return this.http.get<Celebration[]>(`${this.endpoint}/reminders`);
  }

  /** The names celebrated on each day of the month. */
  nameDays({ year, month }: YearMonth): Observable<NameDay[]> {
    return this.http.get<NameDay[]>(`${this.nameDaysEndpoint}/${year}/${month}`);
  }

  /** When a name is celebrated in the year; null when the calendar does not know it. */
  lookupNameDay(name: string, year: number): Observable<string | null> {
    return this.http.get<string | null>(`${this.nameDaysEndpoint}/lookup`, { params: toHttpParams({ name, year }) });
  }

  private byId(id: string): string {
    return `${this.endpoint}/${encodeURIComponent(id)}`;
  }
}
