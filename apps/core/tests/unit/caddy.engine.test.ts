import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CaddyEngine } from '../../src/engine/caddy.engine'

describe('CaddyEngine', () => {
  let engine: CaddyEngine
  let fetchMock: ReturnType<typeof mock>
  const _originalFetch = globalThis.fetch

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') } as Response),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    engine = new CaddyEngine()
  })

  it('adds a reverse-proxy route for a slug', async () => {
    await engine.addRoute({ slug: 'demo', port: 3000 })

    expect(fetchMock).toHaveBeenCalled()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:2019/config/apps/http/servers/srv0/routes/wisp-demo')
    expect(options.method).toBe('PUT')
    const body = JSON.parse(options.body as string)
    expect(body['@id']).toBe('wisp-demo')
    expect(body.match).toEqual([{ host: ['demo.localhost'] }])
    expect(body.handle[0].handler).toBe('reverse_proxy')
    expect(body.handle[0].upstreams).toEqual([{ dial: 'wisp-demo:3000' }])
  })

  it('removes a route', async () => {
    await engine.removeRoute('demo')

    expect(fetchMock).toHaveBeenCalled()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:2019/config/apps/http/servers/srv0/routes/wisp-demo')
    expect(options.method).toBe('DELETE')
  })

  it('ignores 404 when removing a route', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('not found'),
      } as Response),
    )

    await expect(engine.removeRoute('demo')).resolves.toBeUndefined()
  })

  it('throws when Caddy responds with an error', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('boom') } as Response),
    )

    await expect(engine.addRoute({ slug: 'demo', port: 3000 })).rejects.toThrow(
      'Caddy addRoute failed',
    )
  })
})
