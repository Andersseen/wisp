import { Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { type Observable, tap } from 'rxjs'
import { ApiService } from './api.service'

export interface User {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'user'
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null)
  private readonly api = inject(ApiService)
  private readonly router = inject(Router)

  login(email: string, password: string): Observable<{ id: string; email: string }> {
    return this.api.post<{ id: string; email: string }>('/auth/login', { email, password }).pipe(
      tap((res) => {
        this.user.set({ id: res.id, email: res.email, name: null, role: 'user' })
      }),
    )
  }

  register(
    email: string,
    password: string,
    name?: string,
  ): Observable<{ id: string; email: string }> {
    return this.api.post<{ id: string; email: string }>('/auth/register', {
      email,
      password,
      name,
    })
  }

  logout(): void {
    this.user.set(null)
    this.api.post<{ ok: true }>('/auth/logout', {}).subscribe({
      error: () => undefined,
    })
  }

  fetchMe(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(
      tap((user) => {
        this.user.set(user)
      }),
    )
  }
}
