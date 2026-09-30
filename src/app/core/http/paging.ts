import { HttpParams } from '@angular/common/http';

/** The API rejects page sizes above 100. */
export const MAX_PAGE_SIZE = 100;

export function toHttpParams(params: object): HttpParams {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') result = result.set(key, String(value));
  }
  return result;
}
