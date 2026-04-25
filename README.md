# Wisp

Lightweight PaaS self-hosted platform. Built with Elysia + Angular 19 + Drizzle ORM + Valkey + Caddy.

## Stack

- **Backend**: Elysia (Bun runtime)
- **Frontend**: Angular 19+ (standalone, Signals)
- **Database**: SQLite via Drizzle ORM
- **Cache/Queue**: Valkey (Redis-compatible) + BullMQ
- **Proxy**: Caddy
- **Monorepo**: Turborepo + Bun workspaces
- **Lint/Format**: Biome
- **Test**: Bun test (backend), Playwright (e2e)

## Project Structure

```
wisp/
├── apps/
│   ├── core/           # Elysia API
│   └── dashboard/      # Angular SPA
├── packages/
│   ├── db/             # Drizzle schema + client
│   └── typescript-config/
├── infra/
│   ├── docker/         # Compose files
│   ├── caddy/          # Caddyfile configs
│   └── scripts/        # Install scripts
└── turbo.json
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Docker + Docker Compose
- Node.js >= 20 (for Angular CLI)

### Install

```bash
bun install
```

### Development

```bash
# Start infra (Valkey + Caddy + MinIO)
docker compose -f infra/docker/dev.yml up -d

# Start all apps in dev mode
bun run dev
```

### Database

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Seed dev data
bun run db:seed
```

### Testing

```bash
# Lint
bun run lint

# Unit + integration tests
bun run test

# E2E tests
bun run test:e2e
```

### Build

```bash
bun run build
```

## License

MIT
