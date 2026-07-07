import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { VoltButton } from '@voltui/components'
import { ShellComponent } from '@wisp/ui'
import { ThemeService } from '@wisp/ui'
import { LmnArrowRightOnRectangleIcon } from 'lumen-icons/arrow-right-on-rectangle'
import { AuthService } from './core/auth.service'

@Component({
  selector: 'app-root',
  imports: [RouterLink, VoltButton, ShellComponent, LmnArrowRightOnRectangleIcon],
  template: `
    <wisp-shell mode="dashboard">
      <nav nav class="flex items-center gap-1 text-sm">
        @if (auth.user()) {
          <a
            routerLink="/deploy"
            class="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Services
          </a>
        }
      </nav>

      <div actions class="flex items-center gap-2">
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
    </wisp-shell>
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
