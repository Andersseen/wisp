import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LmnBoltIcon } from 'lumen-icons/bolt'

@Component({
  selector: 'wisp-logo',
  imports: [RouterLink, LmnBoltIcon],
  template: `
    <a [routerLink]="link()" class="flex items-center gap-2 font-semibold tracking-tight">
      <lmn-bolt
        [size]="16"
        tone="primary"
        background="soft"
        backgroundTone="primary"
        [padding]="6"
        [radius]="8"
      />
      <span>Wisp</span>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly link = input<string>('/')
}
