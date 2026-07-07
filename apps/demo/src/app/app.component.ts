import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ShellComponent } from '@wisp/ui'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ShellComponent],
  template: `
    <wisp-shell mode="landing">
      <router-outlet />
    </wisp-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
