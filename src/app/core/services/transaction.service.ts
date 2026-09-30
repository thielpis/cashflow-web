import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from '../http/paging';
import {
  Transaction,
  TransactionRequest,
  TransactionSearchParams,
  TransactionSearchResult,
} from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/transactions`;

  /** Newest first, with the totals of all matches. */
  search(params: TransactionSearchParams = {}): Observable<TransactionSearchResult> {
    return this.http.get<TransactionSearchResult>(this.endpoint, { params: toHttpParams(params) });
  }

  /** The filtered transactions as a CSV file for Excel. */
  exportCsv(params: Omit<TransactionSearchParams, 'page' | 'pageSize'>): Observable<Blob> {
    return this.http.get(`${this.endpoint}/export`, {
      params: toHttpParams(params),
      responseType: 'blob',
    });
  }

  create(request: TransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(this.endpoint, request);
  }

  update(id: string, request: TransactionRequest): Observable<Transaction> {
    return this.http.put<Transaction>(this.byId(id), request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.byId(id));
  }

  private byId(id: string): string {
    return `${this.endpoint}/${encodeURIComponent(id)}`;
  }
}
