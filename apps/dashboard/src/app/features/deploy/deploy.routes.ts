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
    path: ':id',
    title: 'Service detail — Wisp',
    loadComponent: () =>
      import('./service-detail/service-detail.component').then((m) => m.ServiceDetailComponent),
  },
]
