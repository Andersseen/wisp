import { Injectable, signal } from '@angular/core'
import { applyVoltTheme } from '@voltui/components'

const STORAGE_KEY = 'wisp-theme'

function initialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(initialDark())

  constructor() {
    applyVoltTheme({ dark: this.dark() })
  }

  toggle(): void {
    const next = !this.dark()
    this.dark.set(next)
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    applyVoltTheme({ dark: next })
  }
}
