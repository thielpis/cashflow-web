import { Injectable } from '@angular/core';

/**
 * Holds the short-lived access token. The refresh token never reaches JavaScript:
 * the API keeps it in the HttpOnly `cf_refresh` cookie.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly ACCESS = 'cf_access';

  get accessToken(): string | null {
    return localStorage.getItem(this.ACCESS);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS, token);
  }

  clear(): void {
    localStorage.removeItem(this.ACCESS);
  }
}
