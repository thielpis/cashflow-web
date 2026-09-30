import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';

/** Logs failed API calls. Components show user-facing messages via apiErrorMessage(). */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (isDevMode() && err instanceof HttpErrorResponse) {
        console.error('[HTTP ERROR]', req.method, req.url, err.status, err.error);
      }
      return throwError(() => err);
    })
  );
