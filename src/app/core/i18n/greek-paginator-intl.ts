import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Greek labels for every mat-paginator in the app. */
@Injectable()
export class GreekPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Εγγραφές ανά σελίδα:';
  override nextPageLabel = 'Επόμενη σελίδα';
  override previousPageLabel = 'Προηγούμενη σελίδα';
  override firstPageLabel = 'Πρώτη σελίδα';
  override lastPageLabel = 'Τελευταία σελίδα';

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) return `0 από ${length}`;
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return `${start + 1} – ${end} από ${length}`;
  };
}
