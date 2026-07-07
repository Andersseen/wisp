# Wisp

[![CI](https://github.com/Andersseen/wisp/actions/workflows/ci.yml/badge.svg)](https://github.com/Andersseen/wisp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%3E%3D1.0.0-black?logo=bun)](https://bun.sh)
[![Last commit](https://img.shields.io/github/last-commit/Andersseen/wisp)](https://github.com/Andersseen/wisp/commits/main)

> A lightweight, self-hosted PaaS for a single VPS. Register a git repo, Wisp
> builds it into a Docker container, runs it, and exposes it through Caddy.

Wisp is an opinionated open-source platform-as-a-service toolkit built for
developers who want Heroku-like deploys on their own server. It combines a fast
Elysia API, an Angular dashboard, Drizzle/SQLite persistence, BullMQ/Valkey job
processing, and Caddy reverse-proxying into a single reproducible monorepo.

## ✨ Features

- **Git-to-container deploys** — point Wisp at a repo, it clones, builds, and
  runs the resulting image.
- **Web dashboard** — Angular 21 zoneless SPA for managing services, viewing
  build logs, and monitoring status.
- **Service routing** — Caddy automatically provisions routes for deployed
  services.
- **Job queue** — BullMQ on Valkey handles builds, deploys, and teardowns
  asynchronously.
- **Lightweight persistence** — SQLite via Drizzle ORM keeps the stack simple on
  a single VPS.
- **Monorepo tooling** — Turborepo + Bun workspaces, Biome lint/format, Bun
  tests, Playwright e2e.

## 🏗 Architecture

```text
┌─────────────────┐      ┌──────────────────┐
│   Caddy :80/443 │──────▶  Angular dashboard │
│   (reverse proxy)│      │   apps/dashboard  │
└────────┬────────┘      └──────────────────┘
         │
         │ /api/*          ┌──────────────────┐
         └────────────────▶│   Elysia API     │
                           │   apps/core      │
                           └────────┬─────────┘
                                    │
            ┌───────────────┬───────┴───────┬───────────────┐
            ▼               ▼               ▼               ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
      │ SQLite   │   │ Valkey   │   │ Docker   │   │ Caddy    │
      │ Drizzle  │   │ BullMQ   │   │ Engine   │   │ Router   │
      └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## 🚀 Quick start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Docker + Docker Compose
- Node.js >= 20 (for Angular CLI)

### Install

```bash
git clone https://github.com/Andersseen/wisp.git
cd wisp
bun install
cp .env.example .env
# Generate SESSION_SECRET: openssl rand -hex 32
```

### Run locally

```bash
# Start Valkey, Caddy, and MinIO
docker compose -f infra/docker/dev.yml up -d

# Generate and apply the database schema
bun run db:generate
bun run db:migrate

# Optional: seed a demo user (demo@wisp.sh / demo1234)
bun run db:seed

# Start backend + frontend
bun run dev
```

The dashboard is available at `http://localhost` and the API at
`http://localhost/api/health`.

## 📦 Project structure

```text
wisp/
├── apps/
│   ├── core/              # Elysia API (Bun)
│   └── dashboard/         # Angular 21 SPA
├── packages/
│   ├── db/                # Drizzle schema + client
│   └── typescript-config/ # Shared tsconfigs
├── infra/
│   ├── docker/            # Compose files (dev/prod)
│   ├── caddy/             # Caddyfile configs
│   └── scripts/           # Install scripts
├── docs/                  # Architecture, conventions, specs
└── turbo.json             # Turborepo pipeline
```

## 🧪 Development commands

| Command | What it does |
|---|---|
| `bun run dev` | Backend (:3000) + frontend (:4200) in watch mode |
| `bun run lint` | Biome check across packages |
| `bun run check-types` | TypeScript `--noEmit` across packages |
| `bun run test` | Bun unit + integration tests |
| `bun run test:e2e` | Playwright dashboard tests |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed dev data |
| `bun run build` | Build all packages |

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for
details on setup, commit conventions, branch protection, and the pull request
checklist.

All contributors are expected to follow our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## 🔒 Security

Found a vulnerability? Please report it privately via
[GitHub Security Advisories](https://github.com/Andersseen/wisp/security/advisories/new)
or email <andriipap01@gmail.com>. See [SECURITY.md](./SECURITY.md) for our
responsible disclosure process.

## 📄 License

Wisp is released under the [MIT License](./LICENSE).

Copyright (c) 2026 [Andersseen](https://github.com/Andersseen).
