import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Η σύνδεση απέτυχε. Δοκίμασε ξανά.';
  if (error.status === 0) return 'Δεν υπάρχει σύνδεση με τον server. Έλεγξε ότι τρέχει το CashFlow API.';
  if (error.status === 423) {
    // The API locks an account for a while after 5 failed attempts.
    const minutes = (error.error as { retryAfterMinutes?: number } | null)?.retryAfterMinutes;
    return `Ο λογαριασμός κλειδώθηκε προσωρινά μετά από πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε ${minutes ?? 15} λεπτά.`;
  }
  if (error.status === 401) {
    return 'Λάθος στοιχεία σύνδεσης. Ο κωδικός κάνει διάκριση κεφαλαίων-πεζών (π.χ. «Admin» ≠ «admin»).';
  }
  return 'Η σύνδεση απέτυχε. Δοκίμασε ξανά.';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  showPassword = false;
  error = '';

  form = this.fb.nonNullable.group({
    // Email or user name; the API checks both.
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: error => {
        this.error = loginErrorMessage(error);
        this.loading = false;
      },
    });
  }
}
