import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { EMPTY, catchError } from 'rxjs'
import { AuthService } from './auth.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const router = inject(Router)

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const isAuthCheck = req.url.includes('/api/auth/me')
        const isLogout = req.url.includes('/api/auth/logout')

        if (!isAuthCheck && !isLogout) {
          auth.logout()
          void router.navigate(['/auth/login'])
        }
        return EMPTY
      }
      throw err
    }),
  )
}
