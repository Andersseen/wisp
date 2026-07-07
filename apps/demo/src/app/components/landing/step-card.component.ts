import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import type { Step } from './landing.model'

@Component({
  selector: 'app-step-card',
  template: `
    <div
      class="relative flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {{ step().number }}
      </div>
      <h3 class="font-semibold">{{ step().title }}</h3>
      <p class="text-sm text-muted-foreground">{{ step().description }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepCardComponent {
  readonly step = input.required<Step>()
}
