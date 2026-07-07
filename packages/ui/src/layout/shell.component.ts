import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { VoltButton } from '@voltui/components'
import { LmnMoonIcon } from 'lumen-icons/moon'
import { LmnSunIcon } from 'lumen-icons/sun'
import { GithubLinkComponent } from '../branding/github-link.component'
import { LogoComponent } from '../branding/logo.component'
import { ThemeService } from '../theme/theme.service'

type ShellMode = 'dashboard' | 'landing'

@Component({
  selector: 'wisp-shell',
  imports: [RouterOutlet, VoltButton, LogoComponent, GithubLinkComponent, LmnSunIcon, LmnMoonIcon],
  template: `
    <div class="flex min-h-dvh flex-col">
      <header
        class="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <div class="flex items-center gap-6">
            <wisp-logo [link]="mode() === 'dashboard' ? '/deploy' : '/'" />
            <ng-content select="[nav]" />
          </div>

          <div class="flex items-center gap-2">
            <volt-button variant="ghost" size="icon" (click)="theme.toggle()">
              @if (theme.dark()) {
                <lmn-sun [size]="16" ariaLabel="Switch to light mode" />
              } @else {
                <lmn-moon [size]="16" ariaLabel="Switch to dark mode" />
              }
            </volt-button>
            <wisp-github-link />
            <ng-content select="[actions]" />
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <router-outlet />
      </main>

      <footer class="border-t border-border">
        <div
          class="mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-6 text-xs text-muted-foreground"
        >
          <span>Wisp — self-hosted PaaS for a single VPS</span>
          <span>v0.1</span>
        </div>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly theme = inject(ThemeService)
  readonly mode = input<ShellMode>('landing')
}
