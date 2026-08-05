import { Injectable, inject } from '@angular/core'
import type { Observable } from 'rxjs'
import { ApiService } from '../../../core/api.service'

export interface Job {
  id: string
  type: 'build' | 'deploy'
  status: 'pending' | 'running' | 'success' | 'failed'
  logOutput: string | null
  createdAt: string
  updatedAt: string
}

@Injectable({ providedIn: 'root' })
export class DeployService {
  private readonly api = inject(ApiService)

  getJobs(serviceId: string): Observable<{ jobs: Job[] }> {
    return this.api.get<{ jobs: Job[] }>(`/deploy/${serviceId}/jobs`)
  }
}
