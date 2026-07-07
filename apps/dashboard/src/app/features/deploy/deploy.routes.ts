import type { Routes } from '@angular/router'

export const deployRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./service-list/service-list.component').then((m) => m.ServiceListComponent),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./service-create/service-create.component').then((m) => m.ServiceCreateComponent),
  },
  {
    path: ':id/logs',
    loadComponent: () => import('./logs/logs.component').then((m) => m.LogsComponent),
  },
]
