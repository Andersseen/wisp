import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { LmnCopyIcon } from 'lumen-icons/copy'
import { OverlayTriggerDirective } from 'quartz-headless'

type OverlayApi = { close: () => void }

@Component({
  selector: 'app-copy-button',
  imports: [LmnCopyIcon, OverlayTriggerDirective],
  template: `
    <button
      qzOverlayTrigger
      #copyOverlay="qzOverlay"
      [overlayTemplate]="copiedTpl"
      placement="top"
      [offset]="6"
      (opened)="copyToClipboard(copyOverlay)"
      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
      [attr.aria-label]="ariaLabel()"
    >
      <lmn-copy [size]="16" />
    </button>

    <ng-template #copiedTpl>
      <div class="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow">
        Copied!
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent {
  readonly value = input.required<string>()
  readonly ariaLabel = input<string>('Copy to clipboard')

  protected copyToClipboard(overlay: OverlayApi): void {
    void navigator.clipboard.writeText(this.value())
    setTimeout(() => overlay.close(), 1500)
  }
}
