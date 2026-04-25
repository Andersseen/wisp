import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/auth.service'

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  template: `
    <div class="register-container">
      <h1>Register</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label for="register-name">Name</label>
        <input id="register-name" type="text" formControlName="name" />

        <label for="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          formControlName="email"
          autocomplete="email"
          required
        />

        <label for="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          formControlName="password"
          autocomplete="new-password"
          required
        />

        <button type="submit" [disabled]="form.invalid || loading()">Register</button>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder)
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)

  readonly form: FormGroup = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  })

  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  onSubmit(): void {
    if (this.form.invalid) return

    this.loading.set(true)
    this.error.set(null)

    const { name, email, password } = this.form.value as {
      name: string
      email: string
      password: string
    }

    this.auth.register(email, password, name || undefined).subscribe({
      next: () => {
        this.loading.set(false)
        void this.router.navigate(['/auth/login'])
      },
      error: (err: unknown) => {
        this.loading.set(false)
        this.error.set(err instanceof Error ? err.message : 'Registration failed')
      },
    })
  }
}
