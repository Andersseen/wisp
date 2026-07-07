import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { VoltButton } from '@voltui/components'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { LmnMapIcon } from 'lumen-icons/map'

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, VoltButton, MOVEMENT_DIRECTIVES, LmnMapIcon],
  template: `
    <div class="flex flex-col items-center gap-4 py-24 text-center" moveEnter="fade-up">
      <lmn-map [size]="32" tone="muted" background="soft" [padding]="12" [radius]="14" />
      <h1 class="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p class="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <a routerLink="/deploy">
        <volt-button variant="outline">Back to services</volt-button>
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
