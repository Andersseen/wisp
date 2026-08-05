import { config } from '../config'

export interface CaddyRouteInput {
  slug: string
  port: number
}

export class CaddyEngine {
  private readonly adminUrl: string
  private readonly domain: string

  constructor() {
    this.adminUrl = config.CADDY_ADMIN_URL
    this.domain = config.WISP_DOMAIN
  }

  async addRoute(input: CaddyRouteInput): Promise<void> {
    const { slug, port } = input
    const routeId = `wisp-${slug}`
    const host = this.domain === 'localhost' ? `${slug}.localhost` : `${slug}.${this.domain}`

    const route = {
      '@id': routeId,
      match: [{ host: [host] }],
      handle: [
        {
          handler: 'reverse_proxy',
          upstreams: [{ dial: `wisp-${slug}:${port}` }],
        },
      ],
    }

    const response = await fetch(
      `${this.adminUrl}/config/apps/http/servers/srv0/routes/${routeId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(route),
      },
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Caddy addRoute failed: ${response.status} ${body}`)
    }
  }

  async removeRoute(slug: string): Promise<void> {
    const routeId = `wisp-${slug}`

    const response = await fetch(
      `${this.adminUrl}/config/apps/http/servers/srv0/routes/${routeId}`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok && response.status !== 404) {
      const body = await response.text()
      throw new Error(`Caddy removeRoute failed: ${response.status} ${body}`)
    }
  }
}
