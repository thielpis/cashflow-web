import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Σύνδεση | CashFlow',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Αρχική | CashFlow',
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactions/transactions.component').then(
            m => m.TransactionsComponent
          ),
        title: 'Κινήσεις | CashFlow',
      },
      {
        path: 'recurring',
        loadComponent: () =>
          import('./features/recurring/recurring.component').then(m => m.RecurringComponent),
        title: 'Πάγιες κινήσεις | CashFlow',
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories.component').then(m => m.CategoriesComponent),
        title: 'Κατηγορίες | CashFlow',
      },
      {
        path: 'budgets',
        loadComponent: () =>
          import('./features/budgets/budgets.component').then(m => m.BudgetsComponent),
        title: 'Προϋπολογισμός | CashFlow',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/year-report.component').then(m => m.YearReportComponent),
        title: 'Ετήσια εικόνα | CashFlow',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
