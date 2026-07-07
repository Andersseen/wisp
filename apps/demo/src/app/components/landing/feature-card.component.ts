import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { VoltCard } from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { FeatureIconComponent } from './feature-icon.component'
import type { Feature } from './landing.model'

@Component({
  selector: 'app-feature-card',
  imports: [VoltCard, MOVEMENT_DIRECTIVES, FeatureIconComponent],
  template: `
    <volt-card class="group" moveEnter="fade-up" [moveWhileHover]="{ y: [0, -4] }">
      <div class="flex flex-col gap-4 p-6">
        <div class="w-fit rounded-xl bg-primary/10 p-3 text-primary">
          <app-feature-icon [icon]="feature().icon" />
        </div>
        <div>
          <h3 class="mb-1 font-semibold">{{ feature().title }}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            {{ feature().description }}
          </p>
        </div>
      </div>
    </volt-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureCardComponent {
  readonly feature = input.required<Feature>()
}
