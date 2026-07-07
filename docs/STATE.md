# Wisp — Current State

> **Snapshot date: 2026-07-06.** This is the file to load at the start of every session, and to UPDATE at the end of every session (see "How to maintain this file" at the bottom). If code and this file disagree, trust the code and fix this file.

## TL;DR

The project is a **well-structured skeleton**. Monorepo, tooling, CI, DB schema, API shape, and dashboard shell all exist and compile. **No end-to-end flow works yet**: auth issues no sessions, so every authenticated route rejects; the entire build/deploy pipeline (git clone, docker build, compose up, Caddy routing, webhooks) is TODO stubs. Nothing here is "broken legacy" — it's unfinished on purpose. Build features in the priority order below.

## What works

- Monorepo tooling: turbo tasks, Biome lint, `bun run check-types`, CI (lint/test/build/docker images).
- DB package: schema for `users`/`services`/`jobs` with drizzle-zod contracts; client factory; drizzle-kit generate/migrate/seed wiring.
- API boot & plumbing: Elysia app with cors, pino logger, typed-error handler, db/valkey/docker plugins; `/health` route.
- `AuthService.register/login`: argon2 hashing + credential check against SQLite (but see gap #2 — login returns no session).
- `DeployService`: create (slug-conflict check) / listByUser / getById against SQLite.
- Dashboard shell: zoneless Angular 19, lazy auth+deploy routes, login/register/service-create forms (reactive), service list, logs placeholder, error interceptor.
- Unit tests for AuthService & DeployService; integration test for auth routes; Playwright skeletons.

## Stubs (files that pretend to work but don't)

| File | Reality |
|---|---|
| `apps/core/src/plugins/auth.ts` | Always returns `user: null` — Lucia session validation is TODO |
| `apps/core/src/services/deploy/build.service.ts` | Returns fake success; no git clone, no docker build |
| `apps/core/src/engine/docker-compose.engine.ts` | `up`/`down` throw `Not implemented` |
| `apps/core/src/engine/caddy.engine.ts` | `addRoute`/`removeRoute` throw `Not implemented` |
| `apps/core/src/queue/deploy.worker.ts` | Returns `{ deployed }` without deploying |
| `apps/core/src/routes/webhook.routes.ts` | Echoes payload; no signature check, no build trigger |
| `apps/dashboard/.../logs/logs.component.ts` | Shows "No logs available." — no API call (no logs endpoint exists yet) |

## Known bugs & traps (verify before "fixing" elsewhere)

1. **Auth is the global blocker**: `authPlugin` always yields `user: null`, so `POST /deploy` and `GET /deploy` always throw. Nothing authenticated can be exercised end-to-end until spec 001 lands.
2. **Login returns no credential**: `AuthService.login` returns `{ id, email }` only — there is no session/token to put in the `Authorization` header, and no `sessions` table in the schema (Lucia needs one).
3. **Misleading field name**: the register API body field `hashedPassword` actually carries the *plaintext* password (hashed server-side in `auth.service.ts`); the dashboard maps `password → hashedPassword` when calling it. Rename to `password` when touching auth (spec 001).
4. **Wrong error type in deploy routes**: `deploy.routes.ts` throws `new Error('UNAUTHORIZED')` → clients receive **500 INTERNAL_ERROR** instead of 401. Use `UnauthorizedError`.
5. **No ownership check**: `GET /deploy/:id` has no auth at all — any caller can read any service.
6. **Queue name mismatch / dead consumers**: `QueueService` produces only to queue `'build'`; `deploy.worker.ts` listens on `'deploy'` (no producer); **no worker is ever instantiated in `src/index.ts`**, so no job would be processed at all.
7. **Duplicate worker implementations**: `queue/build.worker.ts` (factory) and `services/queue/worker.service.ts` (class) both consume `'build'` identically. Pick one (factory style is the documented convention) and delete the other when wiring workers.
8. **Backend won't boot without `.env`**: `SESSION_SECRET` (≥32 chars) is required by `config/index.ts`. Copy `.env.example`.
9. **Formatter trap**: `biome.json` doesn't pin `quoteStyle`/`semicolons`, but the codebase is single-quote/no-semicolon. A repo-wide `bun run format` may rewrite everything to Biome defaults (double quotes + semicolons). Don't run it; format only touched files.
10. **Dashboard auth is cosmetic**: no route guard on `/deploy`, no interceptor attaching `Authorization`, `AuthService.user` signal lost on refresh. All addressed in spec 001.
11. **MinIO** runs in dev compose but nothing uses it yet — don't "clean it up"; it's reserved for build artifacts/logs.

## Next priorities (ordered — do them as specs)

1. **[001-auth-sessions](specs/001-auth-sessions.md)** — sessions table + Lucia validation + login/logout/me + dashboard guard/interceptor. Unblocks everything. *(spec: draft, awaiting owner approval)*
2. **002 build pipeline** — real `BuildService` (git clone → `docker build` via dockerode), build worker wired in `index.ts`, `jobs` rows + log capture, service status transitions.
3. **003 deploy + routing** — run built image (compose engine or dockerode), `CaddyEngine` against Caddy admin API, `deploy` queue producer, status → `running`.
4. **004 logs & status in dashboard** — `GET /deploy/:id/jobs` + logs endpoint, wire `logs.component`, poll or SSE.
5. **005 GitHub webhook** — HMAC signature verification, map repo→service, trigger rebuild.

## Session changelog (append newest first)

- **2026-07-06** — Docs kit created (AGENTS.md, CLAUDE.md, docs/*, specs/001 draft, .env.example). No product code changed. Full-project analysis done; bugs #1–#11 catalogued.

## How to maintain this file (for every agent)

At the end of your session:
1. Append a one-line changelog entry (date — what changed, which spec advanced).
2. Move anything you completed out of "Stubs"/"Known bugs" into "What works".
3. Re-order "Next priorities" if the plan changed; link new specs.
4. Update the snapshot date in the header.
Keep it under ~150 lines: this file is loaded into every session — prune stale detail aggressively.
