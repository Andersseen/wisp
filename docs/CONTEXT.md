# Wisp — Context: why this project exists

> Audience: anyone (human or AI) starting work on Wisp. This file explains purpose and intent — it changes rarely. Current implementation status lives in [STATE.md](STATE.md).
> Note: this vision was reverse-engineered from the codebase and README. If anything here contradicts the owner's actual intent, fix this file first — everything else follows from it.

## The problem

Deploying a side project today means choosing between:

- **Managed PaaS** (Heroku, Render, Fly.io): easy but paid, vendor-locked, opaque.
- **Raw VPS**: cheap and yours, but every deploy is manual — SSH, git pull, docker build, restart, reverse-proxy config, TLS.
- **Heavy self-hosted platforms** (Coolify, CapRover, Dokploy, k8s-based stacks): powerful but resource-hungry and complex for a single small server.

## What Wisp is

Wisp is a **lightweight self-hosted PaaS for a single VPS**. You run Wisp on your server; from then on, deploying an app is: paste a git URL in the dashboard → Wisp clones it, builds a Docker image, runs the container, and wires a Caddy route (with automatic HTTPS) to it. A push to the repo re-deploys via webhook.

### Core user journey (the product, in one flow)

1. Owner installs Wisp on a VPS (`infra/scripts/install.sh`, docker compose).
2. User registers / logs in on the Angular dashboard.
3. User creates a **service**: name, slug, git URL, branch.
4. Wisp queues a **build job** (BullMQ/Valkey): clone repo → build Docker image.
5. Wisp queues a **deploy job**: run the container → register a Caddy route (`<slug>.domain`) → mark service `running`.
6. User watches status (`pending → building → running / error / stopped`) and logs in the dashboard.
7. GitHub webhook on push triggers steps 4–6 again.

## What Wisp is NOT (non-goals)

- Not multi-node / cluster orchestration — one VPS, one Docker daemon.
- Not Kubernetes, not a k8s wrapper.
- Not a managed cloud service — self-hosted only.
- Not a general CI platform — it builds only to deploy.
- No horizontal scaling, no multi-region, no team RBAC beyond the simple `admin`/`user` roles (at least for now).

## Design principles

1. **Lightweight above all**: Bun runtime, SQLite (no Postgres server), Valkey as the only stateful sidecar, Caddy for TLS-by-default. Should run comfortably on the cheapest VPS tier.
2. **Type safety end to end**: TypeScript strict everywhere; Drizzle + drizzle-zod for DB types; Elysia `t.*` validation at the API boundary; Zod-validated env config.
3. **Boring, explicit layering**: routes → services → engines. Thin handlers, testable service classes, side-effects isolated in engines (Docker, Caddy).
4. **Async work off the request path**: anything slow (clone, build, deploy) goes through BullMQ queues and workers, with progress persisted in the `jobs` table.
5. **The dashboard is a thin client**: all logic server-side; Angular renders state and submits forms.

## Stack (fixed decisions — do not swap without owner approval)

| Concern | Choice |
|---|---|
| Runtime / package manager | Bun (workspaces) + Turborepo |
| API | Elysia |
| Auth | Lucia (argon2 via @node-rs/argon2) |
| DB | SQLite via Drizzle ORM (`bun:sqlite`) |
| Queue | BullMQ on Valkey (Redis-compatible, via ioredis) |
| Container control | dockerode against the host Docker socket |
| Reverse proxy / TLS | Caddy (dynamic config via its API is the target) |
| Frontend | Angular 19+, standalone, signals, zoneless |
| Lint/format | Biome |
| Tests | `bun test` (backend), Playwright (e2e) |
| Object storage (dev compose) | MinIO — reserved for build artifacts/log storage, not yet used |

## Success criteria (v1)

- From a fresh VPS to "my app is live on HTTPS" in under 15 minutes.
- A `git push` is live in production without touching SSH.
- Wisp itself (core + dashboard + Valkey + Caddy) idles under ~300 MB RAM.
