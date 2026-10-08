export interface Service {
  id: string
  name: string
  slug: string
  status: string
  gitUrl: string
  branch?: string
  port?: number
  createdAt?: string
  updatedAt?: string
}

export interface Job {
  id: string
  type: 'build' | 'deploy'
  status: 'pending' | 'running' | 'success' | 'failed'
  serviceId: string
  logOutput: string | null
  createdAt: string
  updatedAt: string
}
