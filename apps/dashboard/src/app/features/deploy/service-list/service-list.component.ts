import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { VoltBadge, VoltButton, VoltCard, VoltSkeleton } from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnCommandLineIcon } from 'lumen-icons/command-line'
import { LmnCubeIcon } from 'lumen-icons/cube'
import { LmnPlusIcon } from 'lumen-icons/plus'
import { LmnRocketLaunchIcon } from 'lumen-icons/rocket-launch'
import { ApiService } from '../../../core/api.service'

export interface Service {
  id: string
  name: string
  slug: string
  status: string
  gitUrl: string
  branch?: string
}

type BadgeVariant = 'solid' | 'secondary' | 'outline' | 'destructive'

const STATUS_BADGES: Record<string, BadgeVariant> = {
  running: 'solid',
  building: 'secondary',
  pending: 'secondary',
  stopped: 'outline',
  error: 'destructive',
}

@Component({
  selector: 'app-service-list',
  imports: [
    RouterLink,
    VoltButton,
    VoltBadge,
    VoltCard,
    VoltSkeleton,
    MOVEMENT_DIRECTIVES,
    LmnPlusIcon,
    LmnCubeIcon,
    LmnCommandLineIcon,
    LmnRocketLaunchIcon,
  ],
  template: `
    <div class="flex flex-col gap-6" moveEnter="fade-up">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Services</h1>
          <p class="text-sm text-muted-foreground">
            Everything deployed from your git repositories.
          </p>
        </div>
        <a routerLink="create">
          <volt-button>
            <lmn-plus [size]="16" />
            New service
          </volt-button>
        </a>
      </div>

      @if (loading()) {
        <div class="flex flex-col gap-3">
          <volt-skeleton class="h-20 w-full rounded-xl" />
          <volt-skeleton class="h-20 w-full rounded-xl" />
          <volt-skeleton class="h-20 w-full rounded-xl" />
        </div>
      } @else if (services().length === 0) {
        <div
          class="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center"
          moveEnter="zoom-in"
        >
          <lmn-rocket-launch
            [size]="24"
            tone="muted"
            background="soft"
            [padding]="12"
            [radius]="14"
          />
          <div>
            <p class="font-medium">No services yet</p>
            <p class="text-sm text-muted-foreground">
              Point Wisp at a git repository and it will build and run it for you.
            </p>
          </div>
          <a routerLink="create">
            <volt-button variant="outline">
              <lmn-plus [size]="16" />
              Deploy your first service
            </volt-button>
          </a>
        </div>
      } @else {
        <div class="flex flex-col gap-3">
          @for (service of services(); track service.id) {
            <volt-card moveEnter="fade-up">
              <div class="flex items-center justify-between gap-4 p-5">
                <div class="flex items-center gap-4">
                  <lmn-cube
                    [size]="20"
                    tone="primary"
                    background="soft"
                    backgroundTone="primary"
                    [padding]="10"
                    [radius]="10"
                  />
                  <div>
                    <p class="font-medium leading-tight">{{ service.name }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ service.slug }} · {{ service.gitUrl }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <volt-badge [variant]="badgeVariant(service.status)">
                    {{ service.status }}
                  </volt-badge>
                  <a [routerLink]="[service.id, 'logs']">
                    <volt-button variant="ghost" size="sm">
                      <lmn-command-line [size]="16" />
                      Logs
                    </volt-button>
                  </a>
                </div>
              </div>
            </volt-card>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent implements OnInit {
  readonly services = signal<Service[]>([])
  readonly loading = signal(true)
  private readonly api = inject(ApiService)

  ngOnInit(): void {
    this.api.get<Service[]>('/deploy').subscribe({
      next: (data) => {
        this.services.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.services.set([])
        this.loading.set(false)
      },
    })
  }

  protected badgeVariant(status: string): BadgeVariant {
    return STATUS_BADGES[status] ?? 'outline'
  }
}
