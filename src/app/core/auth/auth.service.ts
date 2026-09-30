import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';

interface LoginRequest {
  email: string;
  password: string;
}

/** Matches CashFlow.Api AuthResponse. The refresh token is set as an HttpOnly cookie. */
interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  displayName: string | null;
}

export const AUTH_ENDPOINT = `${environment.apiBaseUrl}/auth`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokens = inject(TokenStorageService);
  private refreshInFlight$: Observable<string> | null = null;

  login(dto: LoginRequest): Observable<void> {
    return this.http
      .post<AuthResponse>(`${AUTH_ENDPOINT}/login`, dto, { withCredentials: true })
      .pipe(
        tap(res => this.tokens.setAccessToken(res.accessToken)),
        map(() => void 0)
      );
  }

  /** Rotates the refresh cookie and returns a new access token. Concurrent callers share one request. */
  refresh(): Observable<string> {
    this.refreshInFlight$ ??= this.http
      .post<AuthResponse>(`${AUTH_ENDPOINT}/refresh`, null, { withCredentials: true })
      .pipe(
        map(res => res.accessToken),
        tap(token => this.tokens.setAccessToken(token)),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay(1)
      );
    return this.refreshInFlight$;
  }

  /** Revokes the server session; the local token is cleared even if the API is unreachable. */
  logout(): Observable<void> {
    return this.http.post<void>(`${AUTH_ENDPOINT}/logout`, null, { withCredentials: true }).pipe(
      catchError(() => of(void 0)),
      map(() => void 0),
      finalize(() => this.tokens.clear())
    );
  }

  clearSession(): void {
    this.tokens.clear();
  }

  isLoggedIn(): boolean {
    return !!this.tokens.accessToken;
  }

  /** The name to greet the user with, from the access token. */
  displayName(): string {
    const value = decodeJwtPayload(this.tokens.accessToken)?.['display_name'];
    return typeof value === 'string' ? value : '';
  }

  /** Changes the signed-in user's own password. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${AUTH_ENDPOINT}/change-password`, {
      currentPassword,
      newPassword,
    });
  }
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  const part = token?.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      Array.from(atob(base64), char => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join(
        ''
      )
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
