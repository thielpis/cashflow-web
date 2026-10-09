import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { RecurringDue } from '../../core/models/recurring.model';
import { Celebration } from '../../core/models/person.model';
import { celebrationLabel, doneLabel, dueLabel, RemindersStore } from '../../core/services/reminders.store';
import { ChangePasswordDialogComponent } from '../../shared/ui/change-password-dialog.component';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgTemplateOutlet, RouterModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ng-template #links>
      @for (item of nav; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="mobileOpen = false">
          <mat-icon>{{ item.icon }}</mat-icon> {{ item.label }}
        </a>
      }
    </ng-template>

    <ng-template #reminderList>
      <div class="reminders">
        @for (item of reminders.items(); track item.recurringTransactionId + item.dueDate) {
          <div class="reminder" [class.overdue]="item.daysLeft < 0" [class.soon]="item.daysLeft >= 0 && item.daysLeft <= 3">
            <div class="reminder-text">
              <span class="reminder-name">{{ item.description || item.categoryName }}</span>
              <small><span [class.income]="item.type === 'Income'">{{ item.type === 'Income' ? '+' : '' }}{{ item.amount | currency: 'EUR' }}</span> · {{ item.dueDate | date: 'd MMM' }}</small>
              <strong class="reminder-when">{{ label(item.daysLeft) }}</strong>
            </div>
            <button class="reminder-pay" (click)="markPaid(item)" [disabled]="paying === item" [matTooltip]="done(item)" [attr.aria-label]="'Σήμανση: ' + done(item)">
              <mat-icon>check_circle_outline</mat-icon>
            </button>
          </div>
        }
        @for (item of reminders.celebrations(); track item.personId + item.kind + item.date) {
          <a class="reminder celebration" routerLink="/celebrations" [class.soon]="item.daysLeft <= 1">
            <mat-icon class="reminder-icon">{{ item.kind === 'Birthday' ? 'cake' : 'celebration' }}</mat-icon>
            <div class="reminder-text">
              <span class="reminder-name">{{ item.personName }}</span>
              <small>{{ celebration(item) }}@if (item.giftBudget) { · δώρο {{ item.giftBudget | currency: 'EUR' }} }</small>
              <strong class="reminder-when">{{ item.date | date: 'd MMM' }} · {{ label(item.daysLeft) }}</strong>
            </div>
          </a>
        }
        @if (!reminders.items().length && !reminders.celebrations().length) {
          <p class="reminders-empty">Δεν υπάρχουν εκκρεμότητες ή γιορτές τις επόμενες μέρες.</p>
        }
      </div>
    </ng-template>

    <div class="layout">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark"><mat-icon>account_balance_wallet</mat-icon></span>CashFlow</div>
        <div class="section-label">ΟΙΚΟΝΟΜΙΚΑ</div>
        <nav class="nav"><ng-container *ngTemplateOutlet="links" /></nav>
        <!-- On narrower screens the right column is gone and the reminders stay here. -->
        <div class="sidebar-reminders">
          <div class="section-label">ΥΠΕΝΘΥΜΙΣΕΙΣ</div>
          <ng-container *ngTemplateOutlet="reminderList" />
        </div>
        <button class="logout" (click)="logout()"><mat-icon>logout</mat-icon> Αποσύνδεση</button>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <button class="menu" (click)="mobileOpen = !mobileOpen" aria-label="Μενού"><mat-icon>menu</mat-icon></button>
          <div class="top-title">Προσωπικά οικονομικά</div>
          <button class="user" [matMenuTriggerFor]="userMenu" aria-label="Λογαριασμός">
            <span class="name">{{ displayName }}</span><span class="avatar">{{ initials }}</span>
          </button>
          <mat-menu #userMenu="matMenu" xPosition="before">
            <button mat-menu-item (click)="changePassword()"><mat-icon>key</mat-icon> Αλλαγή κωδικού</button>
            <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon> Αποσύνδεση</button>
          </mat-menu>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
      <aside class="reminders-panel" aria-label="Υπενθυμίσεις">
        <div class="panel-head">
          <mat-icon>notifications</mat-icon>
          <span>Υπενθυμίσεις</span>
          @if (reminders.items().length + reminders.celebrations().length; as count) { <span class="count">{{ count }}</span> }
        </div>
        <ng-container *ngTemplateOutlet="reminderList" />
      </aside>
      @if (mobileOpen) {
        <div class="backdrop" (click)="mobileOpen = false" aria-hidden="true"></div>
        <nav class="mobile-nav">
          <button class="close" (click)="mobileOpen = false" aria-label="Κλείσιμο"><mat-icon>close</mat-icon></button>
          <ng-container *ngTemplateOutlet="links" />
          <div class="section-label mobile-label">ΥΠΕΝΘΥΜΙΣΕΙΣ</div>
          <ng-container *ngTemplateOutlet="reminderList" />
        </nav>
      }
    </div>
  `,
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  readonly reminders = inject(RemindersStore);
  /** The reminder being ticked, to disable its button meanwhile. */
  paying: RecurringDue | null = null;

  readonly nav: NavItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Αρχική' },
    { path: '/transactions', icon: 'swap_vert', label: 'Κινήσεις' },
    { path: '/recurring', icon: 'event_repeat', label: 'Πάγιες κινήσεις' },
    { path: '/budgets', icon: 'savings', label: 'Προϋπολογισμός' },
    { path: '/goals', icon: 'flag', label: 'Στόχοι' },
    { path: '/people', icon: 'favorite', label: 'Αγαπημένα πρόσωπα' },
    { path: '/celebrations', icon: 'cake', label: 'Εορτολόγιο' },
    { path: '/reports', icon: 'bar_chart', label: 'Ετήσια εικόνα' },
    { path: '/categories', icon: 'category', label: 'Κατηγορίες' },
  ];

  mobileOpen = false;
  readonly displayName = this.auth.displayName();
  readonly initials =
    this.displayName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || 'CF';

  constructor() {
    // Each page change may follow a change to the recurring expenses, so the list is reloaded.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => void this.reminders.refresh());
  }

  label(daysLeft: number): string {
    return dueLabel(daysLeft);
  }

  done(item: RecurringDue): string {
    return doneLabel(item);
  }

  celebration(item: Celebration): string {
    return celebrationLabel(item);
  }

  async markPaid(item: RecurringDue): Promise<void> {
    this.paying = item;
    try {
      await this.reminders.setPaid(item, true);
      const kind = item.type === 'Income' ? 'στα έσοδα' : 'στα έξοδα';
      this.snackBar.open(`«${item.description || item.categoryName}» καταχωρήθηκε ${kind}.`, 'Κλείσιμο', { duration: 3000 });
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η καταχώριση δεν έγινε.'), 'Κλείσιμο', { duration: 5000 });
    } finally {
      this.paying = null;
    }
  }

  changePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '440px' });
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }
}
