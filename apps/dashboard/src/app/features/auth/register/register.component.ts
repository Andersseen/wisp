import { Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/auth.service'

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="register-container">
      <h1>Register</h1>
      <form (ngSubmit)="onSubmit()">
        <label>
          Name
          <input type="text" [(ngModel)]="name" name="name" />
        </label>
        <label>
          Email
          <input type="email" [(ngModel)]="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" [(ngModel)]="password" name="password" required minlength="8" />
        </label>
        <button type="submit" [disabled]="loading()">Register</button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
})
export class RegisterComponent {
  name = ''
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
    this.auth.register(this.email, this.password, this.name || undefined).subscribe({
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
