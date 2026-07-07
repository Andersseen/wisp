import { ChangeDetectionStrategy, Component } from '@angular/core'
import { VoltButton } from '@voltui/components'
import { GithubLinkComponent } from '@wisp/ui'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnCloudArrowUpIcon } from 'lumen-icons/cloud-arrow-up'
import { LmnShieldCheckIcon } from 'lumen-icons/shield-check'

@Component({
  selector: 'app-cta-section',
  imports: [
    VoltButton,
    GithubLinkComponent,
    MOVEMENT_DIRECTIVES,
    LmnCloudArrowUpIcon,
    LmnShieldCheckIcon,
  ],
  template: `
    <section
      class="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-16 text-center"
      moveEnter="fade-up"
      [moveDelay]="100"
    >
      <lmn-shield-check
        [size]="32"
        tone="primary"
        background="soft"
        backgroundTone="primary"
        [padding]="12"
        [radius]="14"
      />
      <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Ready to own your deployments?
      </h2>
      <p class="max-w-lg text-muted-foreground">
        Self-host Wisp on a cheap VPS and deploy every side project with a git push.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <a href="https://github.com/Andersseen/wisp" target="_blank" rel="noopener noreferrer">
          <volt-button size="lg">
            <lmn-cloud-arrow-up [size]="16" class="mr-2" />
            Deploy Wisp
          </volt-button>
        </a>
        <wisp-github-link variant="outline" size="lg" [showText]="true" />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaSectionComponent {}
