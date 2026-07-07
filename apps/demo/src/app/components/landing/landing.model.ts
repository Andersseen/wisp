export type FeatureIcon = 'git' | 'container' | 'routing' | 'queue' | 'database' | 'dashboard'

export interface Feature {
  icon: FeatureIcon
  title: string
  description: string
}

export interface Step {
  number: string
  title: string
  description: string
}

export const INSTALL_COMMAND = 'curl -fsSL https://wisp.sh/install | sh'

export const STACK_TOOLS = [
  'Bun',
  'Elysia',
  'Angular 21',
  'SQLite',
  'Drizzle',
  'Docker',
  'Caddy',
  'Valkey',
  'BullMQ',
]

export const FEATURES: Feature[] = [
  {
    icon: 'git',
    title: 'Git to container',
    description:
      'Connect any git repo and branch. Wisp clones, builds, and tags a Docker image automatically.',
  },
  {
    icon: 'container',
    title: 'Docker runtime',
    description:
      'Images run as named containers on the host daemon with sensible defaults and cleanup.',
  },
  {
    icon: 'routing',
    title: 'Automatic routing',
    description:
      'Caddy provisions HTTPS routes for every service using your own domain, no manual config.',
  },
  {
    icon: 'queue',
    title: 'Job queue',
    description:
      'BullMQ on Valkey handles builds, deploys, and teardowns asynchronously off the request path.',
  },
  {
    icon: 'database',
    title: 'SQLite + Drizzle',
    description:
      'Lightweight, typed persistence perfect for a single VPS. No Postgres server required.',
  },
  {
    icon: 'dashboard',
    title: 'Angular dashboard',
    description: 'Manage services, watch job status, and read logs in a fast, zoneless web UI.',
  },
]

export const STEPS: Step[] = [
  {
    number: '1',
    title: 'Install Wisp',
    description: 'Run the install script on your VPS and configure your domain.',
  },
  {
    number: '2',
    title: 'Add a service',
    description: 'Paste a git URL, pick a branch, and Wisp queues a build job.',
  },
  {
    number: '3',
    title: 'Go live',
    description: 'Your app gets a container, a Caddy route, and a TLS certificate.',
  },
]
