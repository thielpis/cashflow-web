import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';
import { ChangePasswordDialogComponent } from '../../shared/ui/change-password-dialog.component';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [NgTemplateOutlet, RouterModule, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ng-template #links>
      @for (item of nav; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="mobileOpen = false">
          <mat-icon>{{ item.icon }}</mat-icon> {{ item.label }}
        </a>
      }
    </ng-template>

    <div class="layout">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark"><mat-icon>account_balance_wallet</mat-icon></span>CashFlow</div>
        <div class="section-label">ΟΙΚΟΝΟΜΙΚΑ</div>
        <nav class="nav"><ng-container *ngTemplateOutlet="links" /></nav>
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
      @if (mobileOpen) {
        <div class="backdrop" (click)="mobileOpen = false" aria-hidden="true"></div>
        <nav class="mobile-nav">
          <button class="close" (click)="mobileOpen = false" aria-label="Κλείσιμο"><mat-icon>close</mat-icon></button>
          <ng-container *ngTemplateOutlet="links" />
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

  readonly nav: NavItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Αρχική' },
    { path: '/transactions', icon: 'swap_vert', label: 'Κινήσεις' },
    { path: '/recurring', icon: 'event_repeat', label: 'Πάγιες κινήσεις' },
    { path: '/budgets', icon: 'savings', label: 'Προϋπολογισμός' },
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

  changePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '440px' });
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login'));
  }
}
