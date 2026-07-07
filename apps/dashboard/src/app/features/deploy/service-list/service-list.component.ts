import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ApiService } from '../../../core/api.service'

export interface Service {
  id: string
  name: string
  slug: string
  status: string
  gitUrl: string
}

@Component({
  selector: 'app-service-list',
  imports: [RouterLink],
  template: `
    <div class="service-list">
      <h1>Services</h1>
      <a routerLink="create">Create Service</a>
      <ul>
        @for (service of services(); track service.id) {
          <li>
            <a [routerLink]="[service.id, 'logs']">{{ service.name }}</a>
            <span>{{ service.status }}</span>
          </li>
        } @empty {
          <li>No services yet.</li>
        }
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent implements OnInit {
  readonly services = signal<Service[]>([])
  private readonly api = inject(ApiService)

  ngOnInit(): void {
    this.api.get<Service[]>('/deploy').subscribe({
      next: (data) => this.services.set(data),
      error: () => this.services.set([]),
    })
  }
}
