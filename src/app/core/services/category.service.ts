import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from '../http/paging';
import {
  Category,
  CategoryDeleteResponse,
  CategorySearchParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/categories`;

  /** Incomes first, then expenses, each in display order. */
  list(params: CategorySearchParams = {}): Observable<Category[]> {
    return this.http.get<Category[]>(this.endpoint, { params: toHttpParams(params) });
  }

  create(request: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.endpoint, request);
  }

  /** Adds the usual household categories the user does not have yet; returns the added ones. */
  createDefaults(): Observable<Category[]> {
    return this.http.post<Category[]>(`${this.endpoint}/defaults`, null);
  }

  update(id: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.http.put<Category>(this.byId(id), request);
  }

  /** Deletes an unused category; one with transactions is archived instead. */
  delete(id: string): Observable<CategoryDeleteResponse> {
    return this.http.delete<CategoryDeleteResponse>(this.byId(id));
  }

  private byId(id: string): string {
    return `${this.endpoint}/${encodeURIComponent(id)}`;
  }
}
