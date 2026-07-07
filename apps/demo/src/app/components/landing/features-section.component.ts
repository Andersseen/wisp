import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { FeatureCardComponent } from './feature-card.component'
import { FEATURES } from './landing.model'

@Component({
  selector: 'app-features-section',
  imports: [MOVEMENT_DIRECTIVES, FeatureCardComponent],
  template: `
    <section class="pb-24" moveEnter="fade-up" [moveDelay]="150">
      <div class="mb-10 text-center">
        <h2 class="text-3xl font-semibold tracking-tight">Everything you need</h2>
        <p class="mt-2 text-muted-foreground">From git push to live URL in minutes.</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" moveStagger [moveStaggerStep]="80">
        @for (feature of features; track feature.title) {
          <app-feature-card [feature]="feature" />
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesSectionComponent {
  protected readonly features = FEATURES
}
