import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/auth.service'

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h1>Login</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label for="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          formControlName="email"
          autocomplete="email"
          required
        />

        <label for="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          required
        />

        <button type="submit" [disabled]="form.invalid || loading()">Login</button>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder)
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)

  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  })

  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  onSubmit(): void {
    if (this.form.invalid) return

    this.loading.set(true)
    this.error.set(null)

    const { email, password } = this.form.value as { email: string; password: string }

    this.auth.login(email, password).subscribe({
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
