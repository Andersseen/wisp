import type { Routes } from '@angular/router'

export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Log in — Wisp',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Sign up — Wisp',
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
  },
]
