import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { STEPS } from './landing.model'
import { StepCardComponent } from './step-card.component'

@Component({
  selector: 'app-steps-section',
  imports: [MOVEMENT_DIRECTIVES, StepCardComponent],
  template: `
    <section class="pb-24" moveEnter="fade-up" [moveDelay]="100">
      <div class="mb-10 text-center">
        <h2 class="text-3xl font-semibold tracking-tight">How it works</h2>
        <p class="mt-2 text-muted-foreground">
          Three steps from repository to production URL.
        </p>
      </div>

      <div class="grid gap-6 sm:grid-cols-3">
        @for (step of steps; track step.number) {
          <app-step-card [step]="step" />
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsSectionComponent {
  protected readonly steps = STEPS
}
