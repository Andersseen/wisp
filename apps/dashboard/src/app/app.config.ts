import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { type ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { provideWispTheme } from '@wisp/ui'
import { provideMovement } from 'angular-movement'
import { routes } from './app.routes'
import { errorHandlerInterceptor } from './core/error-handler.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorHandlerInterceptor])),
    provideWispTheme(),
    provideMovement({
      duration: 320,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    }),
  ],
}
