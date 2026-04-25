import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  const el = document.getElementById('app-error-log')
  if (el) {
    el.textContent = `Bootstrap error: ${message}`
  }
})
