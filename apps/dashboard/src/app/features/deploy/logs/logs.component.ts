import { Component, signal, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { ApiService } from '../../../core/api.service'

@Component({
  selector: 'app-logs',
  standalone: true,
  template: `
    <div class="logs">
      <h1>Logs for {{ serviceId() }}</h1>
      <pre>{{ logs() }}</pre>
    </div>
  `,
})
export class LogsComponent implements OnInit {
  readonly serviceId = signal('')
  readonly logs = signal('No logs available.')

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
    if (id) {
      this.serviceId.set(id)
      // TODO: fetch logs from API
    }
  }
}
