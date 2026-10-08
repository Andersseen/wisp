import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { VoltBadge, VoltButton, VoltCard } from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnArrowLeftIcon } from 'lumen-icons/arrow-left'
import { LmnCheckCircleIcon } from 'lumen-icons/check-circle'
import { LmnChevronDownIcon } from 'lumen-icons/chevron-down'
import { LmnCommandLineIcon } from 'lumen-icons/command-line'
import { LmnCubeIcon } from 'lumen-icons/cube'
import { LmnRefreshCwIcon } from 'lumen-icons/refresh-cw'
import { LmnStopIcon } from 'lumen-icons/stop'
import { LmnTrashIcon } from 'lumen-icons/trash'
import { LmnXCircleIcon } from 'lumen-icons/x-circle'
import { ApiService } from '../../../core/api.service'
import type { Job, Service } from '../types'

type BadgeVariant = 'solid' | 'secondary' | 'outline' | 'destructive'

const STATUS_BADGES: Record<string, BadgeVariant> = {
  running: 'solid',
  building: 'secondary',
  pending: 'secondary',
  stopped: 'outline',
  error: 'destructive',
}

const JOB_STATUS_BADGES: Record<string, BadgeVariant> = {
  success: 'solid',
  running: 'secondary',
  pending: 'secondary',
  failed: 'destructive',
}

@Component({
  selector: 'app-service-detail',
  imports: [
    RouterLink,
    VoltButton,
    VoltBadge,
    VoltCard,
    MOVEMENT_DIRECTIVES,
    LmnArrowLeftIcon,
    LmnCubeIcon,
    LmnCommandLineIcon,
    LmnStopIcon,
    LmnRefreshCwIcon,
    LmnTrashIcon,
    LmnCheckCircleIcon,
    LmnXCircleIcon,
    LmnChevronDownIcon,
  ],
  template: `
    <div class="flex flex-col gap-6" moveEnter="fade-up">
      <a routerLink="/deploy" class="w-fit">
        <volt-button variant="ghost" size="sm">
          <lmn-arrow-left [size]="16" />
          Back to services
        </volt-button>
      </a>

      @if (loading()) {
        <div class="py-16 text-center text-muted-foreground">Loading...</div>
      } @else if (service(); as svc) {
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <lmn-cube
              [size]="24"
              tone="primary"
              background="soft"
              backgroundTone="primary"
              [padding]="12"
              [radius]="12"
            />
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">{{ svc.name }}</h1>
              <p class="text-sm text-muted-foreground">{{ svc.slug }}</p>
            </div>
          </div>
          <volt-badge [variant]="statusBadge(svc.status)">{{ svc.status }}</volt-badge>
        </div>

        <volt-card>
          <div class="flex flex-col gap-3 p-5">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Metadata
            </h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Git URL</span>
                <p class="font-mono">{{ svc.gitUrl }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Branch</span>
                <p class="font-mono">{{ svc.branch ?? 'main' }}</p>
              </div>
              @if (svc.port) {
                <div>
                  <span class="text-muted-foreground">Port</span>
                  <p class="font-mono">{{ svc.port }}</p>
                </div>
              }
              @if (svc.createdAt) {
                <div>
                  <span class="text-muted-foreground">Created</span>
                  <p>{{ svc.createdAt | date: 'medium' }}</p>
                </div>
              }
            </div>
          </div>
        </volt-card>

        <volt-card>
          <div class="flex flex-col gap-3 p-5">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </h2>
            <div class="flex flex-wrap gap-2">
              @if (svc.status === 'running') {
                <volt-button
                  variant="outline"
                  size="sm"
                  [disabled]="actionLoading() !== null"
                  (click)="stop()"
                >
                  <lmn-stop [size]="16" />
                  Stop
                </volt-button>
              }
              @if (svc.status === 'stopped') {
                <volt-button
                  variant="outline"
                  size="sm"
                  [disabled]="actionLoading() !== null"
                  (click)="start()"
                >
                  <lmn-check-circle [size]="16" />
                  Start
                </volt-button>
              }
                <volt-button
                  variant="outline"
                  size="sm"
                  [disabled]="actionLoading() !== null || isTransitional(svc.status)"
                  (click)="redeploy()"
                >
                  <lmn-refresh-cw [size]="16" />
                  Redeploy
                </volt-button>
              <volt-button
                variant="destructive"
                size="sm"
                [disabled]="actionLoading() !== null"
                (click)="delete()"
              >
                <lmn-trash [size]="16" />
                Delete
              </volt-button>
            </div>
            @if (actionLoading(); as action) {
              <p class="text-sm text-muted-foreground">{{ action }}...</p>
            }
          </div>
        </volt-card>

        <volt-card>
          <div class="flex flex-col gap-3 p-5">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Jobs ({{ jobs().length }})
            </h2>
            @if (jobs().length === 0) {
              <p class="text-sm text-muted-foreground">No jobs yet.</p>
            } @else {
              <div class="flex flex-col gap-2">
                @for (job of jobs(); track job.id) {
                  <div class="rounded-lg border border-border">
                    <button
                      type="button"
                      class="flex w-full items-center justify-between gap-4 p-3 text-left text-sm hover:bg-muted/50"
                      (click)="toggleJob(job.id)"
                    >
                      <div class="flex items-center gap-3">
                        @if (job.status === 'success') {
                          <lmn-check-circle [size]="16" tone="success" />
                        } @else if (job.status === 'failed') {
                          <lmn-x-circle [size]="16" tone="destructive" />
                        } @else {
                          <lmn-cube [size]="16" tone="muted" />
                        }
                        <span class="font-medium">{{ job.type }}</span>
                        <volt-badge [variant]="jobStatusBadge(job.status)">
                          {{ job.status }}
                        </volt-badge>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-muted-foreground">
                          {{ job.createdAt | date: 'short' }}
                        </span>
                        <lmn-chevron-down
                          [size]="16"
                          [class.rotate-180]="expandedJob() === job.id"
                          class="transition-transform"
                        />
                      </div>
                    </button>
                    @if (expandedJob() === job.id && job.logOutput) {
                      <pre
                        class="max-h-64 overflow-auto rounded-b-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-200"
                        >{{ job.logOutput }}</pre
                      >
                    }
                  </div>
                }
              </div>
            }
          </div>
        </volt-card>

        <volt-card>
          <div class="flex items-center justify-between border-b border-border p-5">
            <div class="flex items-center gap-3">
              <lmn-command-line [size]="20" tone="muted" background="soft" [padding]="8" [radius]="8" />
              <div>
                <h2 class="text-base font-semibold leading-tight">Container Logs</h2>
                <p class="text-sm text-muted-foreground">Last {{ logLines().length }} lines</p>
              </div>
            </div>
            <volt-button variant="ghost" size="sm" (click)="refreshLogs()">
              <lmn-refresh-cw [size]="16" />
            </volt-button>
          </div>
          <div
            class="max-h-96 overflow-auto rounded-b-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-200"
          >
            @if (logLines().length === 0) {
              <p class="text-zinc-500">No logs available. Container may not be running.</p>
            } @else {
              @for (line of logLines(); track $index) {
                <div class="whitespace-pre-wrap">{{ line }}</div>
              }
            }
          </div>
        </volt-card>
      } @else {
        <div class="py-16 text-center text-muted-foreground">Service not found.</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceDetailComponent implements OnInit {
  readonly id = input.required<string>()
  readonly service = signal<Service | null>(null)
  readonly jobs = signal<Job[]>([])
  readonly containerLogs = signal<string>('')
  readonly loading = signal(true)
  readonly actionLoading = signal<string | null>(null)
  readonly expandedJob = signal<string | null>(null)

  readonly logLines = computed(() => {
    const logs = this.containerLogs()
    return logs ? logs.split('\n').filter((l) => l.length > 0) : []
  })

  private readonly api = inject(ApiService)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private pollInterval: ReturnType<typeof setInterval> | null = null

  ngOnInit(): void {
    this.loadData()
  }

  protected statusBadge(status: string): BadgeVariant {
    return STATUS_BADGES[status] ?? 'outline'
  }

  protected jobStatusBadge(status: string): BadgeVariant {
    return JOB_STATUS_BADGES[status] ?? 'outline'
  }

  protected isTransitional(status: string): boolean {
    return status === 'pending' || status === 'building'
  }

  protected toggleJob(jobId: string): void {
    this.expandedJob.update((current) => (current === jobId ? null : jobId))
  }

  protected stop(): void {
    this.actionLoading.set('Stopping')
    this.api.post(`/deploy/${this.id()}/stop`, {}).subscribe({
      next: () => {
        this.actionLoading.set(null)
        this.loadData()
      },
      error: () => {
        this.actionLoading.set(null)
      },
    })
  }

  protected start(): void {
    this.actionLoading.set('Starting')
    this.api.post(`/deploy/${this.id()}/start`, {}).subscribe({
      next: () => {
        this.actionLoading.set(null)
        this.loadData()
      },
      error: () => {
        this.actionLoading.set(null)
      },
    })
  }

  protected delete(): void {
    if (!confirm('Are you sure you want to delete this service? This cannot be undone.')) {
      return
    }
    this.actionLoading.set('Deleting')
    this.api.delete(`/deploy/${this.id()}`).subscribe({
      next: () => {
        this.actionLoading.set(null)
        this.router.navigate(['/deploy'])
      },
      error: () => {
        this.actionLoading.set(null)
      },
    })
  }

  protected redeploy(): void {
    this.actionLoading.set('Redeploying')
    this.api.post(`/deploy/${this.id()}/redeploy`, {}).subscribe({
      next: () => {
        this.actionLoading.set(null)
        this.loadData()
      },
      error: () => {
        this.actionLoading.set(null)
      },
    })
  }

  protected refreshLogs(): void {
    this.api.get<{ logs: string }>(`/deploy/${this.id()}/logs?lines=200`).subscribe({
      next: (data) => {
        this.containerLogs.set(data.logs)
      },
      error: () => {
        this.containerLogs.set('')
      },
    })
  }

  private loadData(): void {
    this.api
      .get<Service>(`/deploy/${this.id()}`)
      .subscribe({
        next: (svc) => {
          this.service.set(svc)
          this.loading.set(false)
          this.setupPolling(svc.status)
        },
        error: () => {
          this.service.set(null)
          this.loading.set(false)
        },
      })

    this.api.get<Job[]>(`/deploy/${this.id()}/jobs`).subscribe({
      next: (jobs) => {
        this.jobs.set(jobs)
      },
    })

    this.refreshLogs()
  }

  private setupPolling(status: string): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    if (this.isTransitional(status)) {
      this.pollInterval = setInterval(() => {
        this.api
          .get<Service>(`/deploy/${this.id()}`)
          .subscribe({
            next: (svc) => {
              this.service.set(svc)
              if (!this.isTransitional(svc.status)) {
                this.setupPolling(svc.status)
              }
            },
          })

        this.api.get<Job[]>(`/deploy/${this.id()}/jobs`).subscribe({
          next: (jobs) => {
            this.jobs.set(jobs)
          },
        })
      }, 3000)

      this.destroyRef.onDestroy(() => {
        if (this.pollInterval) {
          clearInterval(this.pollInterval)
        }
      })
    }
  }
}
