import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { ApiService } from '../../../core/api.service'

@Component({
  selector: 'app-logs',
  template: `
    <div class="logs">
      <h1>Logs for {{ serviceId() }}</h1>
      <pre>{{ logs() }}</pre>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsComponent implements OnInit {
  readonly serviceId = signal('')
  readonly logs = signal('No logs available.')
  private readonly route = inject(ActivatedRoute)
  private readonly api = inject(ApiService)

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
    if (id) {
      this.serviceId.set(id)
      // TODO: fetch logs from API
    }
  }
}
