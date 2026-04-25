import { Injectable, inject, signal } from '@angular/core'
import { ApiService } from './api.service'
import { Observable, tap } from 'rxjs'

export interface User {
  id: string
  email: string
  name?: string
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null)
  private readonly api = inject(ApiService)

  login(email: string, password: string): Observable<{ id: string; email: string }> {
    return this.api.post<{ id: string; email: string }>('/auth/login', { email, password }).pipe(
      tap((res) => {
        this.user.set({ id: res.id, email: res.email })
      }),
    )
  }

  register(email: string, password: string, name?: string): Observable<{ id: string; email: string }> {
    return this.api.post<{ id: string; email: string }>('/auth/register', {
      email,
      hashedPassword: password,
      name,
    })
  }

  logout(): void {
    this.user.set(null)
  }
}
