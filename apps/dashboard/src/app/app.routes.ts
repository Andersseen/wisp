import type { Routes } from '@angular/router'
import { authGuard } from './core/auth.guard'

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'deploy',
    canActivate: [authGuard],
    loadChildren: () => import('./features/deploy/deploy.routes').then((m) => m.deployRoutes),
  },
  { path: '', redirectTo: '/deploy', pathMatch: 'full' },
  {
    path: '**',
    title: 'Not found — Wisp',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
]
