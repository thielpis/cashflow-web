import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom, Observable } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { Contribution, Goal } from '../../core/models/goal.model';
import { GoalService } from '../../core/services/goal.service';
import { CategoryIconComponent } from '../../shared/ui/category-icon.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ContributionDialogComponent } from './contribution-dialog.component';
import { GoalDialogComponent } from './goal-dialog.component';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CategoryIconComponent,
  ],
  templateUrl: './goals.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../page.scss', './goals.component.scss'],
})
export class GoalsComponent {
  private readonly goalService = inject(GoalService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  items: Goal[] = [];
  /** The goal whose history is open. */
  expandedId: string | null = null;
  loading = true;
  hasLoaded = false;
  errorMessage = '';

  constructor() {
    void this.load();
  }

  get totalSaved(): number {
    return this.items.reduce((sum, x) => sum + x.saved, 0);
  }

  /** What the open goals with a deadline need each month, together. */
  get monthlyNeeded(): number {
    return this.items.reduce((sum, x) => sum + (x.monthlyNeeded ?? 0), 0);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.items = await firstValueFrom(this.goalService.list());
      this.hasLoaded = true;
    } catch (error: unknown) {
      this.errorMessage = apiErrorMessage(error, 'Οι στόχοι δεν φορτώθηκαν. Δοκίμασε ξανά.');
    } finally {
      this.loading = false;
    }
  }

  add(): void {
    this.afterSave(this.dialog.open(GoalDialogComponent, { autoFocus: 'dialog' }).afterClosed());
  }

  edit(goal: Goal): void {
    this.afterSave(this.dialog.open(GoalDialogComponent, { data: goal, autoFocus: 'dialog' }).afterClosed());
  }

  contribute(goal: Goal, withdraw: boolean): void {
    this.afterSave(
      this.dialog.open(ContributionDialogComponent, { data: { goal, withdraw }, autoFocus: 'dialog' }).afterClosed()
    );
  }

  toggleHistory(goal: Goal): void {
    this.expandedId = this.expandedId === goal.id ? null : goal.id;
  }

  async remove(goal: Goal): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: '440px',
          data: {
            title: 'Διαγραφή στόχου',
            message: `Να διαγραφεί ο στόχος «${goal.name}» μαζί με το ιστορικό των καταθέσεων;`,
          },
        })
        .afterClosed()
    );
    if (!confirmed) return;
    try {
      await firstValueFrom(this.goalService.delete(goal.id));
      this.snackBar.open('Ο στόχος διαγράφηκε.', 'Κλείσιμο', { duration: 3000 });
      await this.load();
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Ο στόχος δεν διαγράφηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  async removeContribution(goal: Goal, contribution: Contribution): Promise<void> {
    try {
      const updated = await firstValueFrom(this.goalService.deleteContribution(goal.id, contribution.id));
      this.items = this.items.map(x => (x.id === updated.id ? updated : x));
      this.snackBar.open('Η κίνηση διαγράφηκε.', 'Κλείσιμο', { duration: 3000 });
    } catch (error: unknown) {
      this.snackBar.open(apiErrorMessage(error, 'Η κίνηση δεν διαγράφηκε.'), 'Κλείσιμο', { duration: 5000 });
    }
  }

  private afterSave(closed: Observable<unknown>): void {
    closed.subscribe(saved => {
      if (saved) void this.load();
    });
  }
}
