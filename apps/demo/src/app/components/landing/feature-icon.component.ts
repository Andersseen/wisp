import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { LmnCodeBracketIcon } from 'lumen-icons/code-bracket'
import { LmnCommandLineIcon } from 'lumen-icons/command-line'
import { LmnCpuChipIcon } from 'lumen-icons/cpu-chip'
import { LmnCubeTransparentIcon } from 'lumen-icons/cube-transparent'
import { LmnGlobeAltIcon } from 'lumen-icons/globe-alt'
import { LmnServerStackIcon } from 'lumen-icons/server-stack'
import type { FeatureIcon } from './landing.model'

@Component({
  selector: 'app-feature-icon',
  imports: [
    LmnCodeBracketIcon,
    LmnCommandLineIcon,
    LmnCpuChipIcon,
    LmnCubeTransparentIcon,
    LmnGlobeAltIcon,
    LmnServerStackIcon,
  ],
  template: `
    @switch (icon()) {
      @case ('git') {
        <lmn-code-bracket [size]="24" />
      }
      @case ('container') {
        <lmn-cube-transparent [size]="24" />
      }
      @case ('routing') {
        <lmn-globe-alt [size]="24" />
      }
      @case ('queue') {
        <lmn-server-stack [size]="24" />
      }
      @case ('database') {
        <lmn-cpu-chip [size]="24" />
      }
      @case ('dashboard') {
        <lmn-command-line [size]="24" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureIconComponent {
  readonly icon = input.required<FeatureIcon>()
}
