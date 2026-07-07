import type { EnvironmentProviders } from '@angular/core'
import { provideVoltTheme } from '@voltui/components'

export function provideWispTheme(): EnvironmentProviders {
  return provideVoltTheme({ color: 'volt', style: 'soft' })
}
