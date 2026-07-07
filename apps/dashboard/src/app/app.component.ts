import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router, RouterLink, RouterOutlet } from '@angular/router'
import { AuthService } from './core/auth.service'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="app-header">
      <a routerLink="/deploy" class="brand">Wisp</a>
      <nav>
        @if (auth.user(); as user) {
          <a routerLink="/deploy">Services</a>
          <span class="user-email">{{ user.email }}</span>
          <button type="button" (click)="logout()">Logout</button>
        } @else {
          <a routerLink="/auth/login">Login</a>
          <a routerLink="/auth/register">Register</a>
        }
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly auth = inject(AuthService)
  private readonly router = inject(Router)

  logout(): void {
    this.auth.logout()
    void this.router.navigate(['/auth/login'])
  }
}
