import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import {
  VoltButton,
  VoltCard,
  VoltCardContent,
  VoltCardDescription,
  VoltCardFooter,
  VoltCardHeader,
  VoltCardTitle,
  VoltError,
  VoltFormField,
  VoltInput,
  VoltLabel,
} from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnBoltIcon } from 'lumen-icons/bolt'
import { LmnExclamationCircleIcon } from 'lumen-icons/exclamation-circle'
import { LmnLoaderIcon } from 'lumen-icons/loader'
import { AuthService } from '../../../core/auth.service'

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    VoltCard,
    VoltCardHeader,
    VoltCardTitle,
    VoltCardDescription,
    VoltCardContent,
    VoltCardFooter,
    VoltFormField,
    VoltLabel,
    VoltInput,
    VoltError,
    VoltButton,
    MOVEMENT_DIRECTIVES,
    LmnBoltIcon,
    LmnLoaderIcon,
    LmnExclamationCircleIcon,
  ],
  template: `
    <div class="mx-auto mt-12 flex w-full max-w-sm flex-col items-center gap-6" moveEnter="fade-up">
      <lmn-bolt
        [size]="24"
        tone="primary"
        background="soft"
        backgroundTone="primary"
        [padding]="10"
        [radius]="12"
      />

      <volt-card class="w-full">
        <volt-card-header>
          <volt-card-title>Welcome back</volt-card-title>
          <volt-card-description>Log in to manage your deployments</volt-card-description>
        </volt-card-header>

        <volt-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4" novalidate>
            <volt-form-field>
              <volt-label htmlFor="login-email">Email</volt-label>
              <volt-input
                id="login-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="you@example.com"
              />
              @if (showError('email')) {
                <volt-error class="block">Enter a valid email address.</volt-error>
              }
            </volt-form-field>

            <volt-form-field>
              <volt-label htmlFor="login-password">Password</volt-label>
              <volt-input
                id="login-password"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••"
              />
              @if (showError('password')) {
                <volt-error class="block">Password must be at least 8 characters.</volt-error>
              }
            </volt-form-field>

            @if (error(); as message) {
              <div
                class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
                moveEnter="fade-down"
              >
                <lmn-exclamation-circle [size]="16" />
                {{ message }}
              </div>
            }

            <volt-button type="submit" [disabled]="form.invalid || loading()" class="w-full">
              @if (loading()) {
                <lmn-loader [size]="16" class="animate-spin" />
                Logging in…
              } @else {
                Log in
              }
            </volt-button>
          </form>
        </volt-card-content>

        <volt-card-footer class="justify-center text-sm text-muted-foreground">
          No account yet?&nbsp;
          <a routerLink="/auth/register" class="font-medium text-primary hover:underline">
            Sign up
          </a>
        </volt-card-footer>
      </volt-card>
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

  protected showError(controlName: string): boolean {
    const control = this.form.get(controlName)
    return Boolean(control?.invalid && control?.touched)
  }

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
