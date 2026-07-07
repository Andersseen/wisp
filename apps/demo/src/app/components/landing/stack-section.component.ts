import { ChangeDetectionStrategy, Component } from '@angular/core'
import { VoltBadge } from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { STACK_TOOLS } from './landing.model'

@Component({
  selector: 'app-stack-section',
  imports: [VoltBadge, MOVEMENT_DIRECTIVES],
  template: `
    <section
      class="flex flex-col items-center gap-4 pb-20 text-center"
      moveEnter="fade-up"
      [moveDelay]="100"
    >
      <p class="text-sm font-medium text-muted-foreground">Built with</p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        @for (tool of tools; track tool) {
          <volt-badge variant="outline">{{ tool }}</volt-badge>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackSectionComponent {
  protected readonly tools = STACK_TOOLS
}
