import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { VoltButton } from '@voltui/components'
import { LmnGithubIcon } from 'lumen-icons/github'

@Component({
  selector: 'wisp-github-link',
  imports: [VoltButton, LmnGithubIcon],
  template: `
    <a [href]="href()" target="_blank" rel="noopener noreferrer">
      <volt-button [variant]="variant()" [size]="size()">
        <lmn-github [size]="16" [ariaLabel]="ariaLabel()" />
        @if (showText()) {
          <span class="ml-2">GitHub</span>
        }
      </volt-button>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GithubLinkComponent {
  readonly href = input<string>('https://github.com/Andersseen/wisp')
  readonly variant = input<'solid' | 'outline' | 'ghost' | 'destructive' | 'link'>('outline')
  readonly size = input<'sm' | 'md' | 'lg' | 'icon'>('sm')
  readonly showText = input<boolean>(false)
  readonly ariaLabel = input<string>('View Wisp on GitHub')
}
