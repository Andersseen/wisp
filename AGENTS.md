# Wisp — Agent Guide

Entry point for AI coding agents (and humans) working on this repo. The docs in `docs/` are the source of truth for **intent**; the code is the source of truth for **current behavior**. When they disagree, flag it and update `docs/STATE.md`.

## Reading order (every new session)

1. This file.
2. [docs/STATE.md](docs/STATE.md) — what works, what is stubbed, known traps, next priorities. Refresh it at the end of every work session.
3. [docs/PLAN.md](docs/PLAN.md) — the phased v1 roadmap; find the current phase and its design notes.
4. The spec you are implementing in [docs/specs/](docs/specs/) — see [docs/SDD-WORKFLOW.md](docs/SDD-WORKFLOW.md) for the process.
5. The sections of [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for the layer you touch (backend / frontend / db).
6. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system map; [docs/CONTEXT.md](docs/CONTEXT.md) for why the project exists.

## What Wisp is (one line)

A lightweight self-hosted PaaS for a single VPS: users register a git repo, Wisp builds it into a Docker container, runs it, and exposes it through Caddy — Elysia (Bun) API + Angular 21 dashboard + Drizzle/SQLite + BullMQ/Valkey.

## Golden rules

1. **The backend will not boot without a `.env`** containing `SESSION_SECRET` (min 32 chars). Copy `.env.example`. Env is validated in `apps/core/src/config/index.ts`.
2. **Follow SDD**: only implement work covered by a spec in `docs/specs/`. No spec → write one first (template: `docs/specs/_TEMPLATE.md`). Do not refactor outside the spec's scope.
3. **Biome errors you must never trigger**: `console.log` (use pino logger / `LoggerService`), `any`, non-null assertion `!`, `.forEach` (use `for..of`), unused imports/variables. See `biome.json`.
4. Throw typed errors from `apps/core/src/types/error.ts` (`NotFoundError`, `UnauthorizedError`, `ConflictError`, `ValidationError`) — never `new Error('...')` for flow control; the error handler maps them to HTTP statuses.
5. All env access goes through `apps/core/src/config`. Never read `process.env` inline.
6. DB schema lives **only** in `packages/db/src/schema/`. After changing it: `bun run db:generate` then `bun run db:migrate`. Never hand-edit `packages/db/migrations/`.
7. Angular is **zoneless**: standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, `signal()` state, reactive forms, native `@if/@for` control flow. No NgModules, no `*ngIf/*ngFor`, no template-driven forms, no constructor injection.
8. Frontend calls the API only through `ApiService` (`baseUrl = '/api'`; Caddy proxies `/api/*` to the backend on :3000).
9. Match existing file style: single quotes, no semicolons, 2-space indent, ~100-col lines. **Do not run repo-wide `bun run format`** — see trap in `docs/STATE.md`.
10. Keep diffs small and verifiable. If a requirement is ambiguous, stop and ask instead of guessing.

## Commands

| Command | What it does |
|---|---|
| `bun install` | Install workspace deps (Bun ≥ 1.0, packageManager bun@1.3.11) |
| `docker compose -f infra/docker/dev.yml up -d` | Dev infra: Valkey :6379, Caddy :80/:443, MinIO :9000/:9001 |
| `bun run dev` | Backend (watch, :3000) + frontend (`ng serve`, :4200) via turbo |
| `bun run back:dev` / `bun run front:dev` | Each app alone |
| `bun run lint` | Biome check in every package |
| `bun run check-types` | `tsc --noEmit` in every package |
| `bun run test` | Bun tests (backend unit + integration) |
| `bun run test:e2e` | Playwright e2e (dashboard) |
| `bun run db:generate` / `db:migrate` / `db:seed` | Drizzle-kit migrations + seed (`packages/db`) |
| `bun run build` | Build all (turbo) |

## Repo map

```
apps/core/          Elysia API — routes → services → engines; plugins for db/valkey/docker/logger/errors
apps/dashboard/     Angular 21 SPA — features/auth, features/deploy; core/ services + interceptor
packages/db/        Drizzle schema (users, services, jobs) + client + seed — single source of DB truth
packages/typescript-config/  Shared tsconfigs (base, elysia, angular)
infra/              docker compose (dev/prod), Caddyfiles, install script
docs/               CONTEXT, ARCHITECTURE, CONVENTIONS, STATE, SDD-WORKFLOW, specs/
```

## Definition of done (every change)

- [ ] `bun run lint` passes
- [ ] `bun run check-types` passes
- [ ] `bun run test` passes; tests added/updated for what changed
- [ ] UI changes: e2e in `apps/dashboard/tests/e2e/` updated
- [ ] `docs/STATE.md` updated (changelog entry + affected sections)
- [ ] Spec checkboxes/status updated in `docs/specs/NNN-*.md`
