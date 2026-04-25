import { Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/auth.service'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-container">
      <h1>Login</h1>
      <form (ngSubmit)="onSubmit()">
        <label>
          Email
          <input type="email" [(ngModel)]="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" [(ngModel)]="password" name="password" required />
        </label>
        <button type="submit" [disabled]="loading()">Login</button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
})
export class LoginComponent {
  email = ''
  password = ''
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    this.loading.set(true)
    this.error.set(null)
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false)
        void this.router.navigate(['/deploy'])
      },
      error: (err: unknown) => {
        this.loading.set(false)
        this.error.set(err instanceof Error ? err.message : 'Login failed')
      },
    })
  }
}
