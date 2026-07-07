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
  VoltHint,
  VoltInput,
  VoltLabel,
} from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnBoltIcon } from 'lumen-icons/bolt'
import { LmnExclamationCircleIcon } from 'lumen-icons/exclamation-circle'
import { LmnLoaderIcon } from 'lumen-icons/loader'
import { AuthService } from '../../../core/auth.service'

@Component({
  selector: 'app-register',
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
    VoltHint,
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
          <volt-card-title>Create your account</volt-card-title>
          <volt-card-description>Deploy any git repo to your own server</volt-card-description>
        </volt-card-header>

        <volt-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4" novalidate>
            <volt-form-field>
              <volt-label htmlFor="register-name">Name</volt-label>
              <volt-input
                id="register-name"
                type="text"
                formControlName="name"
                autocomplete="name"
                placeholder="Ada Lovelace"
              />
              <volt-hint class="block">Optional</volt-hint>
            </volt-form-field>

            <volt-form-field>
              <volt-label htmlFor="register-email">Email</volt-label>
              <volt-input
                id="register-email"
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
              <volt-label htmlFor="register-password">Password</volt-label>
              <volt-input
                id="register-password"
                type="password"
                formControlName="password"
                autocomplete="new-password"
                placeholder="At least 8 characters"
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
                Creating account…
              } @else {
                Sign up
              }
            </volt-button>
          </form>
        </volt-card-content>

        <volt-card-footer class="justify-center text-sm text-muted-foreground">
          Already have an account?&nbsp;
          <a routerLink="/auth/login" class="font-medium text-primary hover:underline">Log in</a>
        </volt-card-footer>
      </volt-card>
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

  protected showError(controlName: string): boolean {
    const control = this.form.get(controlName)
    return Boolean(control?.invalid && control?.touched)
  }

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
