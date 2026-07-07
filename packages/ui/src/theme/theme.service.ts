import { isPlatformBrowser } from '@angular/common'
import { Injectable, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core'
import { applyVoltTheme } from '@voltui/components'

const STORAGE_KEY = 'wisp-theme'

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(false)
  private readonly platformId = inject(PLATFORM_ID)

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY)
      const initial = stored !== null ? stored === 'dark' : this.prefersDarkScheme()
      this.dark.set(initial)
      applyVoltTheme({ dark: initial })
    } else {
      applyVoltTheme({ dark: false })
    }

    afterNextRender(() => {
      this.syncStorage()
    })
  }

  toggle(): void {
    const next = !this.dark()
    this.dark.set(next)
    applyVoltTheme({ dark: next })
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    }
  }

  private prefersDarkScheme(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }

  private syncStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, this.dark() ? 'dark' : 'light')
    }
  }
}
