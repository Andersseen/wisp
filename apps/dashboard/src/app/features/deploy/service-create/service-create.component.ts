import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import {
  VoltButton,
  VoltCard,
  VoltCardContent,
  VoltCardDescription,
  VoltCardHeader,
  VoltCardTitle,
  VoltError,
  VoltFormField,
  VoltHint,
  VoltInput,
  VoltLabel,
} from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnArrowLeftIcon } from 'lumen-icons/arrow-left'
import { LmnExclamationCircleIcon } from 'lumen-icons/exclamation-circle'
import { LmnLoaderIcon } from 'lumen-icons/loader'
import { ApiService } from '../../../core/api.service'

@Component({
  selector: 'app-service-create',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    VoltCard,
    VoltCardHeader,
    VoltCardTitle,
    VoltCardDescription,
    VoltCardContent,
    VoltFormField,
    VoltLabel,
    VoltInput,
    VoltError,
    VoltHint,
    VoltButton,
    MOVEMENT_DIRECTIVES,
    LmnArrowLeftIcon,
    LmnLoaderIcon,
    LmnExclamationCircleIcon,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-lg flex-col gap-4" moveEnter="fade-up">
      <a routerLink="/deploy" class="w-fit">
        <volt-button variant="ghost" size="sm">
          <lmn-arrow-left [size]="16" />
          Back to services
        </volt-button>
      </a>

      <volt-card>
        <volt-card-header>
          <volt-card-title>New service</volt-card-title>
          <volt-card-description>
            Wisp will clone the repository, build its Dockerfile and run the container.
          </volt-card-description>
        </volt-card-header>

        <volt-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4" novalidate>
            <volt-form-field>
              <volt-label htmlFor="sc-name">Name</volt-label>
              <volt-input
                id="sc-name"
                type="text"
                formControlName="name"
                placeholder="My application"
              />
              @if (showError('name')) {
                <volt-error class="block">Name is required.</volt-error>
              }
            </volt-form-field>

            <volt-form-field>
              <volt-label htmlFor="sc-slug">Slug</volt-label>
              <volt-input id="sc-slug" type="text" formControlName="slug" placeholder="my-app" />
              <volt-hint class="block">Lowercase letters, numbers and dashes — becomes the subdomain.</volt-hint>
              @if (showError('slug')) {
                <volt-error class="block">Use only lowercase letters, numbers and dashes.</volt-error>
              }
            </volt-form-field>

            <volt-form-field>
              <volt-label htmlFor="sc-git">Git URL</volt-label>
              <volt-input
                id="sc-git"
                type="url"
                formControlName="gitUrl"
                placeholder="https://github.com/you/repo.git"
              />
              <volt-hint class="block">Public repository with a Dockerfile at its root.</volt-hint>
              @if (showError('gitUrl')) {
                <volt-error class="block">Enter a valid http(s) git URL.</volt-error>
              }
            </volt-form-field>

            <volt-form-field>
              <volt-label htmlFor="sc-branch">Branch</volt-label>
              <volt-input id="sc-branch" type="text" formControlName="branch" placeholder="main" />
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

            <div class="flex justify-end gap-2 pt-2">
              <a routerLink="/deploy">
                <volt-button variant="ghost" type="button">Cancel</volt-button>
              </a>
              <volt-button type="submit" [disabled]="form.invalid || loading()">
                @if (loading()) {
                  <lmn-loader [size]="16" class="animate-spin" />
                  Creating…
                } @else {
                  Create service
                }
              </volt-button>
            </div>
          </form>
        </volt-card-content>
      </volt-card>
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

  protected showError(controlName: string): boolean {
    const control = this.form.get(controlName)
    return Boolean(control?.invalid && control?.touched)
  }

  onSubmit(): void {
    if (this.form.invalid) return

    this.loading.set(true)
    this.error.set(null)

    this.api.post<{ id: string }>('/deploy', this.form.value).subscribe({
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
