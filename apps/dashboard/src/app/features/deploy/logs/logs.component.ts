import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { VoltBadge, VoltButton, VoltCard } from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnArrowLeftIcon } from 'lumen-icons/arrow-left'
import { LmnCommandLineIcon } from 'lumen-icons/command-line'
import { VirtualScrollDirective } from 'quartz-headless'

const PLACEHOLDER_LOGS = [
  'No logs available for this service yet.',
  '',
  'Build and runtime logs will appear here once the',
  'build pipeline lands (roadmap phase 3).',
]

@Component({
  selector: 'app-logs',
  imports: [
    RouterLink,
    VoltCard,
    VoltBadge,
    VoltButton,
    VirtualScrollDirective,
    MOVEMENT_DIRECTIVES,
    LmnArrowLeftIcon,
    LmnCommandLineIcon,
  ],
  template: `
    <div class="flex flex-col gap-4" moveEnter="fade-up">
      <a routerLink="/deploy" class="w-fit">
        <volt-button variant="ghost" size="sm">
          <lmn-arrow-left [size]="16" />
          Back to services
        </volt-button>
      </a>

      <volt-card>
        <div class="flex items-center justify-between border-b border-border p-5">
          <div class="flex items-center gap-3">
            <lmn-command-line [size]="20" tone="muted" background="soft" [padding]="8" [radius]="8" />
            <div>
              <h1 class="text-base font-semibold leading-tight">Logs</h1>
              <p class="text-sm text-muted-foreground">{{ id() }}</p>
            </div>
          </div>
          <volt-badge variant="outline">{{ lines().length }} lines</volt-badge>
        </div>

        <div
          qzVirtualScroll
          [items]="lines()"
          [itemSize]="24"
          #vs="qzVirtualScroll"
          class="relative h-96 overflow-y-auto rounded-b-xl bg-zinc-950 font-mono text-sm text-zinc-200"
        >
          <div class="relative" [style.height.px]="vs.contentHeight()">
            @for (row of vs.visibleItems(); track row.index) {
              <div
                class="absolute inset-x-0 flex h-6 items-center gap-4 whitespace-pre px-4"
                [style.top.px]="row.offset"
              >
                <span class="w-8 shrink-0 select-none text-right text-zinc-600">
                  {{ row.index + 1 }}
                </span>
                {{ row.item }}
              </div>
            }
          </div>
        </div>
      </volt-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsComponent {
  readonly id = input.required<string>()
  // TODO: fetch real logs once GET /deploy/:id/jobs lands (roadmap phase 3)
  readonly logOutput = signal<string | null>(null)
  readonly lines = computed(() => {
    const output = this.logOutput()
    return output === null ? PLACEHOLDER_LOGS : output.split('\n')
  })
}
