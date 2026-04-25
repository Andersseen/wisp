import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class LoggerService {
  error(message: string, context?: Record<string, unknown>): void {
    // In production, send to error tracking service (e.g., Sentry)
    // Avoid console.* to comply with project rules
    if (typeof document !== 'undefined') {
      const el = document.getElementById('app-error-log')
      if (el) {
        el.textContent = `${message} ${context ? JSON.stringify(context) : ''}`
      }
    }
  }
}
