import { Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { ApiService } from '../../../core/api.service'

@Component({
  selector: 'app-service-create',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="service-create">
      <h1>Create Service</h1>
      <form (ngSubmit)="onSubmit()">
        <label>
          Name
          <input type="text" [(ngModel)]="name" name="name" required />
        </label>
        <label>
          Slug
          <input type="text" [(ngModel)]="slug" name="slug" required pattern="[a-z0-9-]+" />
        </label>
        <label>
          Git URL
          <input type="url" [(ngModel)]="gitUrl" name="gitUrl" required />
        </label>
        <label>
          Branch
          <input type="text" [(ngModel)]="branch" name="branch" value="main" />
        </label>
        <button type="submit" [disabled]="loading()">Create</button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>
  `,
})
export class ServiceCreateComponent {
  name = ''
  slug = ''
  gitUrl = ''
  branch = 'main'
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  onSubmit(): void {
    this.loading.set(true)
    this.error.set(null)
    this.api
      .post<{ id: string }>('/deploy', {
        name: this.name,
        slug: this.slug,
        gitUrl: this.gitUrl,
        branch: this.branch,
      })
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
