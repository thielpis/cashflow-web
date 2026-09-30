import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  let loggedIn = false;
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } }],
    });
  });

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard(route, state));

  it('sends signed-out users to the login page', () => {
    loggedIn = false;
    expect((run(authGuard) as UrlTree).toString()).toBe('/login');
  });

  it('lets signed-in users in', () => {
    loggedIn = true;
    expect(run(authGuard)).toBeTrue();
  });

  it('sends signed-in users away from the login page', () => {
    loggedIn = true;
    expect((run(guestGuard) as UrlTree).toString()).toBe('/dashboard');
  });
});
