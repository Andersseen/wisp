# Wisp — Current State

> **Snapshot date: 2026-07-07 (open-source hardening).** This is the file to load at the start of every session, and to UPDATE at the end of every session (see "How to maintain this file" at the bottom). If code and this file disagree, trust the code and fix this file.

## TL;DR

The project is a **well-structured skeleton**. Monorepo, tooling, CI, DB schema, API shape, and dashboard shell all exist and compile. **No end-to-end flow works yet**: auth issues no sessions, so every authenticated route rejects; the entire build/deploy pipeline (git clone, docker build, compose up, Caddy routing, webhooks) is TODO stubs. Nothing here is "broken legacy" — it's unfinished on purpose. Build features in the priority order below.

**Phase 0 is done**: `bun run lint`, `bun run check-types`, and `bun run test` all pass green across every package, and the local bootstrap (`.env`, install, docker dev infra, db generate/migrate/seed) works end to end. This required fixing not just the 3 catalogued bugs (#4, #7, #9) but a long tail of latent tooling gaps nobody had actually exercised before — see the changelog entry below for the full list.

## What works

- Monorepo tooling: turbo tasks (lint, check-types, test all wired and green), Biome lint (repo-wide, `.angular` cache properly ignored), CI (lint/test/build/docker images).
- DB package: schema for `users`/`services`/`jobs` with drizzle-zod contracts; client factory; drizzle-kit generate/migrate/seed wiring — verified working end to end (initial migration `0000_far_winter_soldier.sql` generated and applied). **`db:seed` creates a real, log-in-able demo user: `demo@wisp.sh` / `demo1234`** (idempotent — deletes+reinserts with a real argon2 hash; the old `'seed-only'` fake hash never verified).
- API boot & plumbing: Elysia app with cors, pino logger, typed-error handler, db/valkey/docker plugins; `/health` route. Boots clean with `bun run back:dev` (needed `pino-pretty` added as a real dependency — was referenced but never installed).
- Full dev stack reachable through Caddy: `http://localhost/api/health` → 200, `http://localhost/` → dashboard. Verified end-to-end (see trap #14 for the Caddyfile bugs this required fixing).
- `AuthService.register/login`: argon2 hashing + credential check against SQLite (but see gap #2 — login returns no session).
- `DeployService`: create (slug-conflict check) / listByUser / getById against SQLite; unauthenticated `POST /deploy` and `GET /deploy` now correctly return 401 (bug #4 fixed).
- Dashboard: **Angular 21 (zoneless) + Tailwind CSS 4 + owner's own UI stack** — `@voltui/components` (cards, buttons, form fields, badges, skeletons; theme `volt`/`soft`), `lumen-icons`, `angular-movement` (page-enter animations), `quartz-headless` (virtualized log viewer). App shell with sticky header, auth-aware nav, dark-mode toggle (`ThemeService` + localStorage); card-based login/register with inline validation; services page with skeleton/empty/list states and status badges; create-service form with hints; terminal-style logs page; route titles + 404. Production build 457 kB initial / 110 kB transfer.
- Tests: unit tests for AuthService & DeployService, integration tests for auth/deploy routes (apps/core, 8/8 passing); dashboard component unit test for LoginComponent now runs for real under `bun:test` (TestBed + happy-dom harness in `apps/dashboard/tests/setup.ts`, 3/3 passing); Playwright e2e skeletons correctly excluded from `bun test` (run only via `test:e2e`).
- Open-source hardening kit shipped: MIT `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, professional `README.md`, structured GitHub issue/PR templates, Dependabot config, branch protection policy (`.github/settings.yml`), and Husky + lint-staged + Commitlint hooks. CI now pins Bun `1.3.11`, runs `check-types`, and validates commit messages. `bun run build` is green after marking `cpu-features` as external in `apps/core`.

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

1. **Auth is the global blocker**: `authPlugin` always yields `user: null`, so `POST /deploy` and `GET /deploy` always throw (as 401, correctly, since bug #4's fix). Nothing authenticated can be exercised end-to-end until spec 001 lands.
2. **Login returns no credential**: `AuthService.login` returns `{ id, email }` only — there is no session/token to put in the `Authorization` header, and no `sessions` table in the schema (Lucia needs one).
3. **Misleading field name**: the register API body field `hashedPassword` actually carries the *plaintext* password (hashed server-side in `auth.service.ts`); the dashboard maps `password → hashedPassword` when calling it. Rename to `password` when touching auth (spec 001).
4. ~~Wrong error type in deploy routes~~ **Fixed 2026-07-07**: `deploy.routes.ts` now throws `UnauthorizedError`; integration test asserts 401 on both `POST /deploy` and `GET /deploy`.
5. **No ownership check**: `GET /deploy/:id` has no auth at all — any caller can read any service.
6. **Queue name mismatch / dead consumers**: `QueueService` produces only to queue `'build'`; `deploy.worker.ts` listens on `'deploy'` (no producer); **no worker is ever instantiated in `src/index.ts`**, so no job would be processed at all.
7. ~~Duplicate worker implementations~~ **Fixed 2026-07-07**: deleted `services/queue/worker.service.ts` (the unused class); kept the `queue/*.worker.ts` factory-style convention.
8. **Backend won't boot without `.env`**: `SESSION_SECRET` (≥32 chars) is required by `config/index.ts`. Copy `.env.example` to repo-root `.env` — `apps/core/.env` is a symlink to it (see trap #12).
9. ~~Formatter trap~~ **Fixed 2026-07-07**: `biome.json` now pins `javascript.formatter.quoteStyle: "single"` and `semicolons: "asNeeded"`; `bun run lint` no longer wants to rewrite the whole repo to double-quotes/semicolons.
10. **Dashboard auth is cosmetic**: no route guard on `/deploy`, no interceptor attaching `Authorization`, `AuthService.user` signal lost on refresh. All addressed in spec 001.
11. **MinIO** runs in dev compose but nothing uses it yet — don't "clean it up"; it's reserved for build artifacts/logs.
12. **`apps/core/.env` is a symlink to the root `.env`**, not a separate file — needed because Bun's automatic dotenv loading is per-cwd (doesn't walk up to the repo root), and `turbo` runs each package's scripts with that package's directory as cwd. If a fresh clone is missing it, recreate with `ln -s ../../.env apps/core/.env` (don't just copy — that'd create a second file to keep in sync).
13. ~~`apps/core`'s production bundle is broken~~ **Fixed 2026-07-07**: `apps/core` build script now passes `--external cpu-features`, so `bun run build` is green and the CI `build` job can be required.
14. **Caddyfile.dev/prod had three latent bugs**, only found by actually curling through Caddy (never verified before): (a) bare `reverse_proxy /api/*` doesn't strip the prefix — backend got `/api/health` and 404'd on its own `/health` route; fixed with `handle_path /api/* { reverse_proxy ... }` in both Caddyfiles. (b) dev only: bare `localhost` as the site address made Caddy bind only `:443`, never `:80`, even with `auto_https off` — fixed by writing `http://localhost` explicitly. (c) dev only: `ng serve` binds to loopback by default, unreachable from the Docker VM — fixed with `--host 0.0.0.0` on `front:dev`/`dev`. Do **not** add `extra_hosts: host.docker.internal:host-gateway` to `dev.yml` — Rancher Desktop/Docker Desktop already resolve `host.docker.internal` correctly to the real host; that extra_hosts entry shadows it with the Linux bridge-gateway IP and silently breaks host reachability.

## Next priorities

The full phased roadmap with design notes and ready-to-paste agent prompts lives in **[PLAN.md](PLAN.md)**. Current position:

- **Phase 0 done**; **Phase 2 done out of order** (owner-directed: dashboard shell built on Angular 21 + Tailwind 4 + owner's UI libs — see PLAN.md Phase 2 for what shipped).
- **Now → Phase 1** — [001-auth-sessions](specs/001-auth-sessions.md) *(spec drafted, awaiting owner approval)*. Unblocks everything — the UI is ready and waiting for real sessions.
- Then phases 3–7: build pipeline → run+Caddy routing → service detail/logs → GitHub webhook → prod hardening.

## Session changelog (append newest first)

- **2026-07-07 (open-source hardening)** — Shipped OSS governance kit: MIT `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, professional `README.md`, GitHub issue/PR templates, Dependabot config, branch protection policy, and Husky + lint-staged + Commitlint. Pinned CI Bun version to `1.3.11`, added `check-types` and `commitlint` jobs. Fixed `apps/core` production bundle by marking `cpu-features` external. All gates (`lint`, `check-types`, `test`, `build`) pass.
- **2026-07-07 (later still)** — Brand favicon (`apps/dashboard/src/favicon.svg` — lumen `bolt` glyph, white on volt-primary `#3B61F6` rounded square, matching the header logo; `.ico` regenerated 16/32/48 from the SVG via headless Chromium render, both wired in `index.html` + `angular.json` assets + a `theme-color` meta). Reworked `packages/db/src/seed.ts` into an idempotent seed that creates a **log-in-able demo user `demo@wisp.sh` / `demo1234`** with a real argon2 hash (added `@node-rs/argon2` as a db devDep). Verified: `POST /auth/login` → 200 and the browser flow redirects to `/deploy`.
- **2026-07-07 (later)** — Phase 2 shipped ahead of schedule by owner instruction, superseding its "no component library / no CSS framework" premise. Dashboard upgraded Angular 19 → 21 (zoneless `provideZonelessChangeDetection`, `@angular/build` builder, TS 5.9) with Tailwind CSS 4 and the owner's four libraries: `@voltui/components` (+`@angular/cdk` pinned `^21.2.0` — bun otherwise resolves ng-primitives' open peer range to CDK 22, which breaks Angular 21's dep optimizer with "Unsupported enum value"), `lumen-icons`, `angular-movement`, `quartz-headless`. Full UI rebuild: shell/header/dark-mode, auth cards, services list (skeleton/empty/badges), create form, virtualized logs, 404, route titles. Test harness migrated off deprecated `platform-browser-dynamic` to `@angular/platform-browser/testing` + explicit `@angular/compiler` import. All gates green; prod build 457 kB initial. Added `apps/dashboard/proxy.conf.json` (wired in angular.json) so `bun front:dev` proxies `/api` → :3000 by itself — no Caddy needed for pure frontend dev. Docs updated (AGENTS.md/CONTEXT/ARCHITECTURE say Angular 21; PLAN.md Phase 2 marked done). Volt quirks worth remembering: `volt-input` duplicates `id` on host+inner input (e2e selectors need `input#…`); `volt-error`/`volt-hint` hosts are inline (add `class="block"` to stack); icon-only `volt-button` needs the `ariaLabel` on the lumen icon (host `aria-label` isn't forwarded to the inner button).
- **2026-07-07** — Phase 0 completed. Fixed the 3 catalogued bugs (#4 UnauthorizedError, #7 duplicate worker, #9 formatter trap) plus a long tail of latent issues surfaced by actually running the documented gates for the first time:
  - **Lint**: ~28 pre-existing Biome violations across ~20 files (import ordering, missing `import type`, unused params in stub engine files, over-width chains) — all fixed file-by-file (no repo-wide `--write`, per the formatter-trap lesson). `biome.json` now also ignores `.angular` (was linting Angular's build cache, 4780+ spurious diagnostics).
  - **check-types**: `turbo.json` never declared a `check-types` task at all (script existed per-package but `bun run check-types` errored "missing task in project") — added. Then fixed real errors it surfaced: `packages/db` and `apps/core` tsconfigs had a `rootDir` that excluded their own migration-config/test files (TS6059); `apps/dashboard` and `packages/db` used Bun-specific APIs (`bun:test`, `bun:sqlite`, `process`) without `bun-types` installed/declared; `tests/setup.ts` used `Parameters<>` on a class instead of `ConstructorParameters<>`.
  - **test**: `turbo.json` had `test: dependsOn: ["build"]` for no reason — neither package's test script touches build output (`packages/db` has zero tests; the one dashboard spec runs against source via Angular TestBed) — removed, which also sidesteps trap #13. Root cause of "SESSION_SECRET: Required" during tests: Bun's dotenv loading is per-cwd and `apps/core` had no `.env` of its own (see trap #12). `packages/db`'s migration tooling needed `better-sqlite3` (drizzle-kit's CLI needs its own Node SQLite driver, separate from the app's `bun:sqlite` runtime usage) plus `trustedDependencies` so Bun would run its native build. Dashboard's `bun test` was sweeping up Playwright e2e specs (scoped to `bun test src`) and had no Angular TestBed environment wired up at all — added `@happy-dom/global-registrator` + `bunfig.toml` preload + `tests/setup.ts` (zoneless `initTestEnvironment` + `resetTestingModule` between tests).
  - **Bootstrap**: `.env` generated, `bun install`. `db:generate` failed on a stale untracked empty `migrations/meta/` scaffold dir — removed, regenerated clean (`0000_far_winter_soldier.sql`). `db:migrate` needed `better-sqlite3` installed (drizzle-kit's own CLI driver, distinct from the app's `bun:sqlite` runtime usage) plus `trustedDependencies` + a manual `bun run install` in its node_modules dir to get Bun to actually run its native build step. Backend wouldn't boot (`pino-pretty` referenced but never installed as a dependency) — added. Full stack then verified end-to-end through Caddy (`/api/health` → 200, `/` → dashboard) after fixing 3 Caddyfile bugs — see trap #14.
  - **Environment note, not a repo bug**: verifying via `curl http://localhost/...` from the host machine hit an unrelated SSH tunnel already bound to port 80 in this sandbox; verification was done via `docker run --network container:docker-caddy-1 curl ...` instead. A real dev machine without that port-80 tunnel should just work with a plain host `curl`.
- **2026-07-07** — Development plan added ([PLAN.md](PLAN.md)): 8 phases (0–7) to v1, with design notes per phase and hand-off prompts for the executing agent. AGENTS.md reading order updated. No product code changed.
- **2026-07-06** — Docs kit created (AGENTS.md, CLAUDE.md, docs/*, specs/001 draft, .env.example). No product code changed. Full-project analysis done; bugs #1–#11 catalogued.

## How to maintain this file (for every agent)

At the end of your session:
1. Append a one-line changelog entry (date — what changed, which spec advanced).
2. Move anything you completed out of "Stubs"/"Known bugs" into "What works".
3. Re-order "Next priorities" if the plan changed; link new specs.
4. Update the snapshot date in the header.
Keep it under ~150 lines: this file is loaded into every session — prune stale detail aggressively.
