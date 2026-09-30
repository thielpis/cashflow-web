import { HttpErrorResponse } from '@angular/common/http';

/** ASP.NET Core ProblemDetails, as returned by the CashFlow API. */
interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/** Extracts a user-facing message from an API error, falling back when the API gives none. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0)
    return 'Δεν υπάρχει σύνδεση με τον server. Έλεγξε ότι τρέχει το CashFlow API.';

  const body = error.error as ProblemDetails | null;
  const validationErrors = body?.errors
    ? Object.values(body.errors).flat()
    : modelStateErrors(error.error);
  if (validationErrors.length) return validationErrors.join(' ');
  return typeof body?.detail === 'string' && body.detail ? body.detail : fallback;
}

/** Model-binding failures are returned as a bare `{ field: [messages] }` object (see Program.cs). */
function modelStateErrors(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const values = Object.values(body);
  return values.length && values.every(value => Array.isArray(value))
    ? (values as string[][]).flat()
    : [];
}
