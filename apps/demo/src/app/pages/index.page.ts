import { ChangeDetectionStrategy, Component } from '@angular/core'
import {
  CtaSectionComponent,
  FeaturesSectionComponent,
  HeroSectionComponent,
  InstallSectionComponent,
  StackSectionComponent,
  StepsSectionComponent,
} from '../components/landing'

@Component({
  selector: 'app-home',
  imports: [
    HeroSectionComponent,
    StackSectionComponent,
    FeaturesSectionComponent,
    StepsSectionComponent,
    InstallSectionComponent,
    CtaSectionComponent,
  ],
  template: `
    <app-hero-section />
    <app-stack-section />
    <app-features-section />
    <app-steps-section />
    <app-install-section />
    <app-cta-section />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePageComponent {}
