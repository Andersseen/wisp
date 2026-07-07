import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MOVEMENT_DIRECTIVES } from 'angular-movement'
import { CopyButtonComponent } from './copy-button.component'
import { INSTALL_COMMAND } from './landing.model'

@Component({
  selector: 'app-install-section',
  imports: [MOVEMENT_DIRECTIVES, CopyButtonComponent],
  template: `
    <section class="pb-24" moveEnter="fade-up" [moveDelay]="150">
      <div class="mb-10 text-center">
        <h2 class="text-3xl font-semibold tracking-tight">Install in seconds</h2>
        <p class="mt-2 text-muted-foreground">One command on any VPS with Docker.</p>
      </div>

      <div
        class="mx-auto flex max-w-2xl items-center gap-3 overflow-hidden rounded-xl border border-border bg-muted/50 p-2 pr-3 font-mono text-sm shadow-sm"
      >
        <code class="flex-1 truncate px-3 py-2 text-foreground">{{ command }}</code>
        <app-copy-button [value]="command" ariaLabel="Copy install command" />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallSectionComponent {
  protected readonly command = INSTALL_COMMAND
}
