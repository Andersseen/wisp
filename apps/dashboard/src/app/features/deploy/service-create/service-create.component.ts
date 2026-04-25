import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms'
import { Router } from '@angular/router'
import { ApiService } from '../../../core/api.service'

@Component({
  selector: 'app-service-create',
  imports: [ReactiveFormsModule],
  template: `
    <div class="service-create">
      <h1>Create Service</h1>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label for="sc-name">Name</label>
        <input id="sc-name" type="text" formControlName="name" required />

        <label for="sc-slug">Slug</label>
        <input
          id="sc-slug"
          type="text"
          formControlName="slug"
          required
          pattern="[a-z0-9-]+"
        />

        <label for="sc-git">Git URL</label>
        <input id="sc-git" type="url" formControlName="gitUrl" required />

        <label for="sc-branch">Branch</label>
        <input id="sc-branch" type="text" formControlName="branch" />

        <button type="submit" [disabled]="form.invalid || loading()">Create</button>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceCreateComponent {
  private readonly fb = inject(FormBuilder)
  private readonly api = inject(ApiService)
  private readonly router = inject(Router)

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: [
      '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]+$/)],
    ],
    gitUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\//)]],
    branch: ['main'],
  })

  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  onSubmit(): void {
    if (this.form.invalid) return

    this.loading.set(true)
    this.error.set(null)

    this.api
      .post<{ id: string }>('/deploy', this.form.value)
      .subscribe({
        next: () => {
          this.loading.set(false)
          void this.router.navigate(['/deploy'])
        },
        error: (err: unknown) => {
          this.loading.set(false)
          this.error.set(err instanceof Error ? err.message : 'Create failed')
        },
      })
  }
}
