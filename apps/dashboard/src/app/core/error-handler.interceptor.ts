import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { catchError, throwError } from 'rxjs'

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const message = err.error?.message ?? 'An unexpected error occurred'
        // TODO: integrate with toast/notification service
        return throwError(() => new Error(message))
      }
      return throwError(() => err)
    }),
  )
}
