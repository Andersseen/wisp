import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router, RouterLink, RouterOutlet } from '@angular/router'
import { VoltButton } from '@voltui/components'
import { LmnArrowRightOnRectangleIcon } from 'lumen-icons/arrow-right-on-rectangle'
import { LmnBoltIcon } from 'lumen-icons/bolt'
import { LmnMoonIcon } from 'lumen-icons/moon'
import { LmnSunIcon } from 'lumen-icons/sun'
import { AuthService } from './core/auth.service'
import { ThemeService } from './core/theme.service'

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    VoltButton,
    LmnBoltIcon,
    LmnSunIcon,
    LmnMoonIcon,
    LmnArrowRightOnRectangleIcon,
  ],
  template: `
    <div class="flex min-h-dvh flex-col">
      <header
        class="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <div class="flex items-center gap-6">
            <a routerLink="/deploy" class="flex items-center gap-2 font-semibold tracking-tight">
              <lmn-bolt
                [size]="16"
                tone="primary"
                background="soft"
                backgroundTone="primary"
                [padding]="6"
                [radius]="8"
              />
              Wisp
            </a>
            @if (auth.user()) {
              <nav class="flex items-center gap-1 text-sm">
                <a
                  routerLink="/deploy"
                  class="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Services
                </a>
              </nav>
            }
          </div>

          <div class="flex items-center gap-2">
            <volt-button variant="ghost" size="icon" (click)="theme.toggle()">
              @if (theme.dark()) {
                <lmn-sun [size]="16" ariaLabel="Switch to light mode" />
              } @else {
                <lmn-moon [size]="16" ariaLabel="Switch to dark mode" />
              }
            </volt-button>

            @if (auth.user(); as user) {
              <span class="hidden text-sm text-muted-foreground sm:inline">{{ user.email }}</span>
              <volt-button variant="ghost" size="icon" (click)="logout()">
                <lmn-arrow-right-on-rectangle [size]="16" ariaLabel="Log out" />
              </volt-button>
            } @else {
              <a routerLink="/auth/login">
                <volt-button variant="ghost" size="sm">Log in</volt-button>
              </a>
              <a routerLink="/auth/register">
                <volt-button size="sm">Sign up</volt-button>
              </a>
            }
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
export class AppComponent {
  protected readonly auth = inject(AuthService)
  protected readonly theme = inject(ThemeService)
  private readonly router = inject(Router)

  logout(): void {
    this.auth.logout()
    void this.router.navigate(['/auth/login'])
  }
}
