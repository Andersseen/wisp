import { afterEach } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

// JIT compiler must load before the testing platform so TestBed can compile templates
await import('@angular/compiler')

const { getTestBed } = await import('@angular/core/testing')
const { BrowserTestingModule, platformBrowserTesting } = await import(
  '@angular/platform-browser/testing'
)

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting())

afterEach(() => {
  getTestBed().resetTestingModule()
})
