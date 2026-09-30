import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEl from '@angular/common/locales/el';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

// The UI is Greek: dates, numbers and amounts use el-GR formatting (e.g. 1.234,56 €).
registerLocaleData(localeEl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // errorInterceptor is outermost so it only sees errors that survive the token refresh.
    provideHttpClient(withXhr(), withInterceptors([errorInterceptor, authInterceptor])),
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'el-GR' },
    { provide: LOCALE_ID, useValue: 'el' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
  ],
};
