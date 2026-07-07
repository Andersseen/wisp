# Wisp — Development Plan (v1 roadmap)

> The master plan from today's skeleton to a working v1. Execute **one phase at a time, in order** — each phase assumes the previous one's exit gate passed. Written to be handed to an executing agent (e.g. Claude Sonnet) phase by phase; the "Prompt to start this phase" blocks are copy-paste ready.
>
> Rules of engagement: [AGENTS.md](../AGENTS.md) golden rules + [SDD-WORKFLOW.md](SDD-WORKFLOW.md). Phases 1+ each start by drafting/refining a spec from the design notes here, getting owner approval, then implementing.

## Definition of v1 (when this plan is done)

A user can: register → log in → create a service from a git URL → Wisp builds a Docker image and runs it → the app is reachable through Caddy → the dashboard shows status and logs → a GitHub push re-deploys. All on one VPS via `infra/docker/prod.yml`.

## Phase map

| Phase | Deliverable | Spec | Size (agent sessions) |
|---|---|---|---|
| 0 | Repo boots, greens, quick repairs | — (small fixes, no spec needed) | 1 |
| 1 | Working auth sessions | [001](specs/001-auth-sessions.md) (drafted) | 1–2 |
| 2 | Dashboard shell (real web base) | 002 (to draft) | 1 |
| 3 | Build pipeline (clone → docker build → jobs) | 003 (to draft) | 2 |
| 4 | Run containers + Caddy routing | 004 (to draft) | 2 |
| 5 | Service detail: status, jobs, logs, actions | 005 (to draft) | 1–2 |
| 6 | GitHub webhook auto-deploy | 006 (to draft) | 1 |
| 7 | Production hardening + install | 007 (to draft) | 1–2 |

Never merge work from two phases in one branch. If a phase reveals a design flaw in a later phase, update this file — don't jump ahead.

---

## Phase 0 — Foundations & repair

**Goal:** the skeleton is honest: everything documented as working actually runs, quick catalogued bugs are fixed. These are ≤20-line fixes restoring documented behavior — per SDD-WORKFLOW they need no spec, only good commit messages.

**Tasks**
1. Bootstrap: copy `.env.example` → `.env` (generate `SESSION_SECRET`), `bun install`, `docker compose -f infra/docker/dev.yml up -d`, `bun run db:generate && bun run db:migrate && bun run db:seed`, `bun run dev`; verify `GET /health` returns 200 through Caddy (`http://localhost/api/health`) and the dashboard loads on `http://localhost`.
2. Fix the formatter trap (STATE.md #9): pin in `biome.json` → `javascript.formatter: { quoteStyle: 'single', semicolons: 'asNeeded' }`; run `bun run lint` and confirm no repo-wide rewrite pressure. Then remove trap #9 from STATE.md.
3. Fix STATE.md bug #4: `deploy.routes.ts` → throw `UnauthorizedError` (from `types/error.ts`) instead of `new Error('UNAUTHORIZED')`. Add/adjust an integration test asserting 401.
4. Fix STATE.md bug #7: delete `apps/core/src/services/queue/worker.service.ts` (keep the `queue/*.worker.ts` factory style). Fix any imports.
5. Confirm CI is green on a branch PR.

**Exit gate:** `bun run lint`, `check-types`, `test` all pass; backend boots; health check 200 via Caddy; STATE.md updated (bugs #4, #7, #9 closed; changelog line).

**Prompt to start this phase**
```
Read AGENTS.md, docs/STATE.md and docs/PLAN.md (Phase 0). Execute Phase 0 tasks 1–5 in order.
These are no-spec quick fixes — do NOT refactor anything else. Run the verification gates
after each task. Finish by updating docs/STATE.md as described in that file.
```

---

## Phase 1 — Auth sessions

**Goal:** implement [specs/001-auth-sessions.md](specs/001-auth-sessions.md) exactly. It is fully designed (contracts, table, criteria). Owner must flip it to `approved` first.

**Exit gate:** all 9 acceptance criteria of spec 001 pass as tests; e2e login-persists-on-reload green; STATE.md bugs #1, #2, #3, #5, #10 closed.

**Prompt to start this phase**
```
Read AGENTS.md, docs/STATE.md, docs/SDD-WORKFLOW.md and docs/specs/001-auth-sessions.md
(status must be approved). Implement the spec's checklist top to bottom, smallest green
slice at a time, running lint/check-types/test after each slice. Do not exceed the spec's
scope. Update the spec checkboxes and docs/STATE.md when done.
```

---

## Phase 2 — Dashboard shell (the web base) — **DONE 2026-07-07 (owner-directed, superseded the original design)**

**Goal (original):** turn the bare component set into an actual web app frame. The original premise was "no component library, no CSS framework"; the owner overrode it on 2026-07-07: the shell was built with the owner's own libraries instead, on Angular 21 + Tailwind CSS 4.

**What was actually built** (no spec — direct owner instruction in-session):
- Stack: Angular 21.2 (zoneless, `provideZonelessChangeDetection`), Tailwind CSS 4 (`@tailwindcss/postcss` + `.postcssrc.json`), `@voltui/components` 0.6 (theme `volt`/`soft` + card/button/input/form-field/badge/skeleton), `lumen-icons` 0.2, `angular-movement` 0.5 (page-enter animations), `quartz-headless` 0.0.3 (virtual-scroll in the log viewer).
- App shell in `app.component.ts`: sticky blur header (brand, Services nav, theme toggle, user email + logout), `<main>` container, footer. Dark mode via `ThemeService` (signal + localStorage + `applyVoltTheme`).
- Auth pages: card-based login/register with volt form-field/label/input/error/hint, inline validation, loading spinners, error alerts.
- Services: page header + New service button, skeleton loading state, dashed-border empty state with CTA, service cards with status badges (`running→solid, building/pending→secondary, stopped→outline, error→destructive`).
- Create service: card form with hints and per-field validation errors, Cancel/Create actions.
- Logs: terminal-style dark panel with line numbers, virtualized with quartz `qzVirtualScroll` (placeholder content until phase 3 provides real logs); `:id` bound via `withComponentInputBinding`.
- Route `title`s on all routes; wildcard 404 (`not-found.component.ts`).
- Original phase-2 non-goal "no dark mode" also superseded — dark mode shipped.

**Exit gate (met):** lint/check-types/test green (Angular 21 TestBed harness migrated to `@angular/platform-browser/testing`), production build 457 kB initial (110 kB transfer), full visual pass in headless Chromium (light + dark).

---

## Phase 3 — Build pipeline

**Goal:** a created service actually gets built: git clone → `docker build` → image tagged, with progress persisted to the `jobs` table.

**Design notes for spec 003**
- Config additions (`config/index.ts` + `.env.example`): `WORK_DIR` (default `./data/builds`), image tag convention `wisp/<slug>:<jobId>` and moving alias `wisp/<slug>:latest`.
- `BuildService.build`: shallow clone (`git clone --depth 1 --branch <branch>`) into `WORK_DIR/<slug>/<jobId>`, require a `Dockerfile` at repo root (v1 constraint — no buildpacks), build via dockerode `buildImage` with the directory tar stream, append build output to `jobs.logOutput` incrementally, clean the workdir afterwards.
- Job lifecycle: `DeployService.create` inserts a `jobs` row (`type: build`, `pending`) and enqueues via `QueueService`; worker marks `running → success|failed`; service status `pending → building → error` (on failure) — `running` only arrives in phase 4; introduce an intermediate service status decision (e.g. keep `building` until phase 4 deploys, document it).
- Wire the build worker in `src/index.ts` (create on boot, `close()` on shutdown signal).
- New endpoint: `GET /deploy/:id/jobs` (auth + ownership) returning jobs ordered by `createdAt` desc.
- Failure modes to spec explicitly: repo unreachable, missing Dockerfile, docker build failure, worker crash (BullMQ retry policy: none in v1, job just fails).
- Tests: unit BuildService with mocked git/docker boundaries; integration for `/deploy/:id/jobs`.

**Exit gate:** creating a service against a real public repo with a Dockerfile produces a tagged local image and a `success` build job whose `logOutput` contains the docker build log; failures produce `failed` jobs with the error in `logOutput`.

**Prompt to start this phase**
```
Read AGENTS.md, docs/STATE.md, docs/SDD-WORKFLOW.md and docs/PLAN.md (Phase 3).
Draft docs/specs/003-build-pipeline.md from the Phase 3 design notes, then STOP for
owner approval before implementing.
```

---

## Phase 4 — Run containers & Caddy routing

**Goal:** built images run as containers and are reachable via `http://<slug>.localhost` (dev) / `https://<slug>.<domain>` (prod).

**Design notes for spec 004**
- After a successful build, enqueue a `deploy` job on queue `'deploy'` (producer added to `QueueService`; worker wired in `index.ts` — this fixes STATE.md bug #6's remaining half).
- Container run via dockerode (not compose; simplify: `DockerComposeEngine` is superseded — delete it in this spec): name `wisp-<slug>`, image `wisp/<slug>:latest`, restart policy `unless-stopped`, attach to a dedicated docker network `wisp-net`, detect container port from image `ExposedPorts` (fallback: `PORT` service config column — schema addition `services.port`, nullable).
- `CaddyEngine` against the Caddy admin API (expose `:2019` inside the compose network; add to `infra/docker/dev.yml` and `prod.yml`): idempotent add/remove of a reverse-proxy route `slug.<WISP_DOMAIN>` → `wisp-<slug>:<port>`. New env: `WISP_DOMAIN` (dev default `localhost`), `CADDY_ADMIN_URL`.
- Service actions: `POST /deploy/:id/stop`, `POST /deploy/:id/start`, `DELETE /deploy/:id` (stop + remove container + remove route + delete rows). All auth + ownership. Status transitions `building → running → stopped`, `error` on any failure.
- Redeploy replaces the container (stop+rm+run new image) — zero-downtime is out of scope.

**Exit gate:** end-to-end demo: create service → wait → `curl http://<slug>.localhost` returns the app's response; stop/start/delete work from curl; dashboard list shows live status.

**Prompt to start this phase**
```
Read AGENTS.md, docs/STATE.md, docs/SDD-WORKFLOW.md and docs/PLAN.md (Phase 4).
Draft docs/specs/004-run-and-route.md from the Phase 4 design notes, then STOP for
owner approval before implementing.
```

---

## Phase 5 — Service detail: status, jobs, logs, actions

**Goal:** the dashboard exposes what phases 3–4 built.

**Design notes for spec 005**
- Service detail page (`/deploy/:id`): status badge, metadata, action buttons (rebuild, stop/start, delete with confirm), jobs table (type, status, time), expandable job log (`logOutput` in `<pre>`).
- Replace the `logs` placeholder component with this page or a tab of it.
- v1 refresh model: polling with `interval` + signals every 3–5 s while the page is open and status is transitional (`pending|building`); no SSE/WebSocket yet (follow-up).
- Backend additions if needed: `GET /deploy/:id/jobs/:jobId` for a single job's full log; container runtime logs (`docker logs`) as `GET /deploy/:id/logs` (last N lines).
- E2E: create → see building → (mocked/short build) → running; logs render.

**Exit gate:** a user can operate a service entirely from the browser; e2e green.

---

## Phase 6 — GitHub webhook auto-deploy

**Goal:** `git push` → redeploy, securely.

**Design notes for spec 006**
- Per-service webhook secret (schema: `services.webhookSecret`, generated at creation) — shown once in the UI with the payload URL `POST /webhooks/github/:serviceId`.
- HMAC SHA-256 signature verification (`X-Hub-Signature-256`) against the raw body; reject 401 on mismatch; only `push` events on the configured branch trigger a build (ignore others with 202).
- Reuses the phase 3/4 chain (enqueue build). Rate-limit: ignore if a build for the service is already `pending|running`.

**Exit gate:** a real GitHub repo webhook (or simulated signed curl) triggers rebuild+redeploy; wrong signature rejected; tests cover signature verification.

---

## Phase 7 — Production hardening & install

**Goal:** someone can actually install Wisp on a VPS following the README.

**Design notes for spec 007**
- Finish `infra/scripts/install.sh` (docker + compose check, clone, `.env` generation with random secret, `docker compose -f infra/docker/prod.yml up -d`).
- Validate both Dockerfiles build & run (CI already builds them); dashboard container serves the built Angular app behind Caddy.
- SQLite: verify WAL mode + volume backup note; document restore.
- Ops endpoints: enrich `/health` (db + valkey + docker checks).
- Rewrite `README.md` quickstart against reality; final pass over docs/ for drift.

**Exit gate:** fresh VM (or clean docker context) → install script → register → deploy demo app over HTTPS with a real domain. Tag `v1.0.0`.

---

## How to hand a phase to Sonnet (owner cheat-sheet)

1. Open a fresh session in the repo, paste the phase's prompt block.
2. When the agent presents a draft spec: review Goals/Non-goals/Acceptance criteria, edit if needed, set `Status: approved`, tell it to proceed.
3. At the end, verify: gates green (`bun run lint && bun run check-types && bun run test`), STATE.md updated, spec `done`. Only then start the next phase.
4. If a session dies mid-phase: new session, same prompt + "continue from the spec's unchecked items; read docs/STATE.md changelog first".
