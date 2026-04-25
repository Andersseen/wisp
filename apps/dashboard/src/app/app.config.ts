import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { routes } from './app.routes'
import { errorHandlerInterceptor } from './core/error-handler.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorHandlerInterceptor])),
  ],
}
