# Wisp — Architecture

> System map. For what is actually implemented vs stubbed, always cross-check [STATE.md](STATE.md).

## Runtime topology (dev)

```
Browser
   │
   ▼
Caddy :80  (infra/caddy/Caddyfile.dev, auto_https off)
   ├── /api/*  ──► Elysia core        :3000   (bun --watch apps/core/src/index.ts)
   └── /*      ──► Angular dev server :4200   (ng serve)

core ──► SQLite        ./sqlite.db          (bun:sqlite via packages/db)
     ──► Valkey        :6379                (BullMQ queues; infra/docker/dev.yml)
     ──► Docker socket /var/run/docker.sock (dockerode — builds/runs user services)
     ──► Caddy admin API                    (target: dynamic per-service routes)

MinIO :9000/:9001  (dev compose only; reserved, not yet used)
```

Prod (`infra/docker/prod.yml`): same shape, but core + dashboard run as containers built from `apps/*/Dockerfile`, core mounts the host Docker socket and a `sqlite-data` volume, Caddy uses `Caddyfile.prod`.

## Monorepo layout

| Path | Package | Role |
|---|---|---|
| `apps/core` | `@wisp/core` | Elysia API + queue workers + engines |
| `apps/dashboard` | `@wisp/dashboard` | Angular 19 SPA |
| `packages/db` | `@wisp/db` | Drizzle schema, client factory, seed, migrations |
| `packages/typescript-config` | `@wisp/typescript-config` | Shared tsconfigs (`base`, `elysia`, `angular`) |
| `infra` | — | compose files, Caddyfiles, install script |

Task graph in `turbo.json`: `build` depends on `^build` + `db:generate`; `test` depends on `build`; db tasks chain `generate → migrate → seed`.

## Backend (`apps/core`)

### Layering — respect this direction, never skip layers upward

```
routes/    HTTP surface. Elysia instances with prefix + t.Object validation. Thin: parse → call service → return.
services/  Business logic. Plain classes, constructor-injected deps (db, redis). Throw typed errors.
engine/    Side-effect adapters: DockerComposeEngine (compose up/down), CaddyEngine (route add/remove).
queue/     BullMQ worker factories consuming jobs, delegating to services/engines.
plugins/   Elysia cross-cutting: db, valkey, docker, logger (pino), error-handler, auth.
config/    Zod-validated env. The only place process.env is read.
types/     Shared types + AppError hierarchy.
```

### Composition root

`src/index.ts` builds the app: `cors → logger → error-handler → db → valkey → docker → routes(auth, deploy, webhook, health) → listen(config.PORT)`.

### Request lifecycle

1. Elysia validates the body against the route's `t.Object` schema → automatic 400 (`VALIDATION_ERROR`) on mismatch.
2. `authPlugin` derives `user` from the `Authorization: Bearer <sessionId>` header (Lucia validation is the pending part — see STATE.md).
3. Handler instantiates the service class with `db` from the plugin and delegates.
4. Errors: services throw `AppError` subclasses (`types/error.ts`); `error-handler` plugin maps them to `{ success: false, code, message }` with the right HTTP status. Everything else → 500 `INTERNAL_ERROR`.

### Deploy pipeline (target design — mostly stubs today)

```
POST /deploy
  └► DeployService.create        services row (status: pending)
  └► QueueService.addBuildJob    queue 'build'
        └► build worker          BuildService: git clone → docker build   (status: building)
              └► enqueue deploy job on queue 'deploy'
                    └► deploy worker
                          ├► DockerComposeEngine.up(slug, composePath)
                          ├► CaddyEngine.addRoute(slug.domain, container)  (status: running)
                          └► jobs row per step, logs appended to jobs.logOutput
POST /webhooks/github  (signature-verified) ──► same build+deploy chain for the matching service
```

State machines: `services.status ∈ pending|building|running|stopped|error`, `jobs.status ∈ pending|running|success|failed`, `jobs.type ∈ build|deploy`.

## Database (`packages/db`)

- Client: `createDbClient(url)` → drizzle over `bun:sqlite` (`src/client.ts`). Sync-flavored drizzle API: `.get()` (one row) / `.all()` (many) / `.run()`.
- Every table follows the same pattern (see `src/schema/services.ts` as exemplar): `text('id').primaryKey()` (lucia `generateId(15)`), text enums for statuses, `integer(..., { mode: 'timestamp' })` with `$defaultFn(() => new Date())`, plus exported drizzle-zod `insert*/select*` schemas and inferred types.

| Table | Key fields |
|---|---|
| `users` | email (unique), hashedPassword (argon2), name, role `admin\|user` |
| `services` | name, slug (unique), gitUrl, branch, status, userId → users.id |
| `jobs` | type `build\|deploy`, status, serviceId → services.id, logOutput |

New tables must be exported from `src/schema/index.ts`, then `bun run db:generate && bun run db:migrate`.

## Frontend (`apps/dashboard`)

- **Zoneless** Angular (`provideExperimentalZonelessChangeDetection` in `app.config.ts`) — OnPush + signals are mandatory, not stylistic.
- Routing: lazy `loadChildren` per feature — `/auth` (login, register), `/deploy` (service-list, service-create, `:id/logs`); root redirects to `/deploy`.
- `core/`: `ApiService` (sole HTTP gateway, `baseUrl '/api'`), `AuthService` (user signal), `LoggerService`, `errorHandlerInterceptor` (registered via `withInterceptors`).
- Components: standalone, inline templates, `inject()`, `signal()` for local state, reactive forms. Exemplars: `service-create.component.ts` (form) and `service-list.component.ts` (list with `@for`/`@empty`).

## Infra

- `infra/docker/dev.yml`: Valkey 8.1, Caddy 2.9, MinIO. Run this **before** `bun run dev`.
- `infra/docker/prod.yml`: adds `core` + `dashboard` containers; `SESSION_SECRET` injected from host env.
- `infra/caddy/Caddyfile.dev`: `localhost` → `/api/*` to :3000, rest to :4200. `Caddyfile.prod` is the prod equivalent. (`nginx.conf` also sits in this dir — legacy/alternative, Caddy is the canonical proxy.)
- CI (`.github/workflows/ci.yml`): lint, test, build (bun), then both Docker images.
