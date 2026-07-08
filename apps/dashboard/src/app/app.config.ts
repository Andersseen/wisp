import { provideHttpClient, withInterceptors } from '@angular/common/http'
import {
  APP_INITIALIZER,
  type ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { provideWispTheme } from '@wisp/ui'
import { provideMovement } from 'angular-movement'
import { type Observable, catchError, of } from 'rxjs'
import { routes } from './app.routes'
import { authInterceptor } from './core/auth.interceptor'
import { AuthService } from './core/auth.service'
import { errorHandlerInterceptor } from './core/error-handler.interceptor'

function initializeAuth(auth: AuthService): () => Observable<unknown> {
  return () => auth.fetchMe().pipe(catchError(() => of(null)))
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorHandlerInterceptor, authInterceptor])),
    provideWispTheme(),
    provideMovement({
      duration: 320,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
}
