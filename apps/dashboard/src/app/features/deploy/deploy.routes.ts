import type { Routes } from '@angular/router'

export const deployRoutes: Routes = [
  {
    path: '',
    title: 'Services — Wisp',
    loadComponent: () =>
      import('./service-list/service-list.component').then((m) => m.ServiceListComponent),
  },
  {
    path: 'create',
    title: 'New service — Wisp',
    loadComponent: () =>
      import('./service-create/service-create.component').then((m) => m.ServiceCreateComponent),
  },
  {
    path: ':id/logs',
    title: 'Logs — Wisp',
    loadComponent: () => import('./logs/logs.component').then((m) => m.LogsComponent),
  },
]
