import { afterEach } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

const { getTestBed } = await import('@angular/core/testing')
const { BrowserDynamicTestingModule, platformBrowserDynamicTesting } = await import(
  '@angular/platform-browser-dynamic/testing'
)

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting())

afterEach(() => {
  getTestBed().resetTestingModule()
})
