import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenStorageService } from '../auth/token-storage.service';
import { AUTH_ENDPOINT, AuthService } from '../auth/auth.service';

const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  // Login/refresh/logout authenticate with credentials or the refresh cookie; changing the
  // password needs the bearer token but must not trigger a refresh loop.
  if (req.url.startsWith(AUTH_ENDPOINT))
    return next(req.url.endsWith('/change-password') ? withToken(req, tokens.accessToken) : req);

  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withToken(req, tokens.accessToken)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);

      return auth.refresh().pipe(
        catchError(refreshError => {
          auth.clearSession();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
        switchMap(accessToken => next(withToken(req, accessToken)))
      );
    })
  );
};
