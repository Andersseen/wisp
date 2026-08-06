import { logger } from '../plugins/logger'

interface CaddyRoute {
  '@id'?: string
  match?: Array<{ host?: string[] }>
  handle?: Array<{ handler: string; upstreams?: Array<{ dial: string }> }>
}

export class CaddyEngine {
  constructor(private caddyAdminUrl: string) {}

  async addRoute(domain: string, target: string): Promise<void> {
    const routeId = `wisp-${domain.replace(/\./g, '-')}`

    const existing = await this.getRoutes()
    const alreadyExists = existing.some((r) => r['@id'] === routeId)

    if (alreadyExists) {
      logger.info({ domain, target }, 'caddy route already exists, skipping')
      return
    }

    const route: CaddyRoute = {
      '@id': routeId,
      match: [{ host: [domain] }],
      handle: [
        {
          handler: 'reverse_proxy',
          upstreams: [{ dial: target }],
        },
      ],
    }

    const response = await fetch(`${this.caddyAdminUrl}/config/apps/http/servers/srv0/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(route),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Failed to add Caddy route: ${response.status} ${text}`)
    }

    logger.info({ domain, target, routeId }, 'caddy route added')
  }

  async removeRoute(domain: string): Promise<void> {
    const routeId = `wisp-${domain.replace(/\./g, '-')}`

    const existing = await this.getRoutes()
    const index = existing.findIndex((r) => r['@id'] === routeId)

    if (index === -1) {
      logger.info({ domain }, 'caddy route not found, nothing to remove')
      return
    }

    const response = await fetch(
      `${this.caddyAdminUrl}/config/apps/http/servers/srv0/routes/${index}`,
      { method: 'DELETE' },
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Failed to remove Caddy route: ${response.status} ${text}`)
    }

    logger.info({ domain, routeId }, 'caddy route removed')
  }

  private async getRoutes(): Promise<CaddyRoute[]> {
    try {
      const response = await fetch(`${this.caddyAdminUrl}/config/apps/http/servers/srv0/routes`)

      if (!response.ok) {
        return []
      }

      const routes = (await response.json()) as CaddyRoute[]
      return routes
    } catch {
      return []
    }
  }
}
