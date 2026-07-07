import type { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'deploy',
    loadChildren: () => import('./features/deploy/deploy.routes').then((m) => m.deployRoutes),
  },
  { path: '', redirectTo: '/deploy', pathMatch: 'full' },
]
