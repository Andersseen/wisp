import { type ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { ThemeService, provideWispTheme } from '@wisp/ui'
import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideWispTheme(),
    ThemeService,
  ],
}
