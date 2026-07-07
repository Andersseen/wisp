import { ChangeDetectionStrategy, Component } from '@angular/core'
import { VoltBadge, VoltButton } from '@voltui/components'
import { GithubLinkComponent } from '@wisp/ui'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnBoltIcon } from 'lumen-icons/bolt'
import { LmnCheckCircleIcon } from 'lumen-icons/check-circle'
import { LmnRocketLaunchIcon } from 'lumen-icons/rocket-launch'

@Component({
  selector: 'app-hero-section',
  imports: [
    VoltBadge,
    VoltButton,
    GithubLinkComponent,
    MOVEMENT_DIRECTIVES,
    LmnBoltIcon,
    LmnCheckCircleIcon,
    LmnRocketLaunchIcon,
  ],
  template: `
    <section
      class="relative flex flex-col items-center gap-8 py-20 text-center sm:py-28"
      moveEnter="fade-up"
    >
      <div
        class="absolute inset-x-0 top-0 -z-10 h-full opacity-40"
        [style.background]="
          'radial-gradient(ellipse 80% 50% at 50% -20%, var(--primary), transparent)'
        "
      ></div>

      <img
        src="/assets/logo.svg"
        alt="Wisp"
        width="72"
        height="72"
        class="h-16 w-16 sm:h-20 sm:w-20"
        loading="eager"
      />

      <volt-badge variant="secondary" class="text-sm">
        <lmn-bolt [size]="14" tone="primary" class="mr-1" />
        Open-source self-hosted PaaS
      </volt-badge>

      <h1 class="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        Deploy your repos to your own VPS
      </h1>

      <p class="max-w-2xl text-lg text-muted-foreground sm:text-xl">
        Wisp clones your git repositories, builds Docker images, and routes every service
        through Caddy — all on a single lightweight server.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <a href="https://github.com/Andersseen/wisp" target="_blank" rel="noopener noreferrer">
          <volt-button size="lg">
            <lmn-rocket-launch [size]="16" class="mr-2" />
            Get started
          </volt-button>
        </a>
        <wisp-github-link variant="outline" size="lg" [showText]="true" />
      </div>

      <div
        class="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground"
      >
        <lmn-check-circle [size]="14" tone="success" />
        <span>MIT licensed</span>
        <span class="text-border">·</span>
        <span>No vendor lock-in</span>
        <span class="text-border">·</span>
        <span>Single VPS</span>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {}
