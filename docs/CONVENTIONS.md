# Wisp — Conventions & Best Practices

> How code must be written in this repo. When in doubt, copy the exemplar file listed in each section instead of inventing a new pattern.

## Universal

- TypeScript strict. **Never** `any` (Biome error) — use `unknown` + narrowing, generics, or a real type.
- **Never** `console.log` (Biome error) — backend: pino `logger` from `apps/core/src/plugins/logger.ts`; frontend: surface failures through component state or interceptors.
- **Never** non-null assertion `!` (Biome error) — narrow with `if` or use `??`.
- **Never** `.forEach` (Biome error) — use `for..of` or `.map/.filter` when producing a value.
- No unused imports/variables (Biome errors). `const` over `let` wherever possible.
- Style of existing files: single quotes, no semicolons, 2-space indent, ~100-col lines. ⚠️ Do not run repo-wide `bun run format` (see STATE.md trap) — format only the files you touched, matching their current style.
- Imports: `type`-only imports as `import type { X }`. Workspace packages by name (`@wisp/db`), never relative paths across packages.
- Naming: files `kebab-case` with role suffix (`deploy.service.ts`, `auth.routes.ts`, `db.plugin` style names inside `plugins/`, `*.engine.ts`, `*.worker.ts`); classes `PascalCase` with the same suffix (`DeployService`); Angular components `feature-name.component.ts`.
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), imperative, one topic per commit.
- Dependencies: adding any new package requires it to be listed in the spec you're implementing. Prefer what's already installed.

## Backend (`apps/core`)

### Routes — exemplar: `src/routes/deploy.routes.ts`

- One file per resource: `new Elysia({ prefix: '/resource' })`, composed in `src/index.ts`.
- Validate every body/params/query with Elysia `t.*` schemas inline on the route. Constrain strings (`minLength`, `maxLength`, `pattern`, `format`) — never accept unbounded input.
- Handlers stay thin: check auth → instantiate service with `db` → return the service result. No business logic, no direct drizzle queries in routes.
- Auth-required routes: `.use(authPlugin)` and check `user`; when unauthorized throw `UnauthorizedError` from `types/error.ts` (NOT `new Error('UNAUTHORIZED')` — that becomes a 500).
- Always enforce **ownership**: fetching/mutating a resource must verify it belongs to `user.id` (or role `admin`).

### Services — exemplar: `src/services/deploy/deploy.service.ts`

- Plain classes, deps via constructor (`constructor(private db: DatabaseClient)`). No singletons, no service-locator — this keeps them unit-testable with mock deps.
- Throw `AppError` subclasses for every failure mode; never return error-shaped objects, never throw bare `Error`.
- IDs: `generateId(15)` from `apps/core/src/utils/id.ts`.
- Return minimal DTOs (e.g. `{ id }`), not raw rows, when the caller doesn't need everything. Never return `hashedPassword` or other secrets.

### Plugins — exemplar: `src/plugins/db.ts`

- `new Elysia({ name: '...' })` + `.decorate` (static deps) or `.derive({ as: 'scoped' }, ...)` (per-request values). The `name` enables deduplication when multiple routes `.use()` the same plugin.

### Config, logging, errors

- New env var → add to the zod schema in `src/config/index.ts` AND to `.env.example`. Fail-fast validation is intentional.
- Log with context objects: `logger.info({ serviceId }, 'message')`. `warn` for expected failures, `error` for unexpected.
- New error kind → extend `AppError` in `src/types/error.ts`; the error-handler plugin already maps it. Response envelope for errors is `{ success: false, code, message }` — don't invent new shapes.

### Queues & workers

- Producers live in `services/queue/queue.service.ts`; workers in `src/queue/*.worker.ts` as `create*Worker(redis)` factories. Queue names are string constants shared by producer and worker — mismatch = jobs silently never processed (this bug exists today, see STATE.md).
- Workers must persist progress/results to the `jobs` table so the dashboard can show them; never keep state only in memory.

### Backend tests — exemplar: `tests/unit/deploy.service.test.ts`

- `bun:test` (`describe/it/expect`, `beforeEach`). Unit tests mock the db via `tests/setup.ts` `createMockDb()`; integration tests in `tests/integration/` exercise Elysia routes with `app.handle(new Request(...))`.
- Test both the happy path and every thrown `AppError` (e.g. duplicate slug → `ConflictError`).

## Database (`packages/db`)

Exemplar: `src/schema/services.ts`. Every table copies this pattern exactly:

- `text('id').primaryKey()`; snake_case column names mapped to camelCase properties.
- Status/role fields: `text('...', { enum: [...] })` with a `.default(...)`.
- `createdAt`/`updatedAt`: `integer(..., { mode: 'timestamp' }).$defaultFn(() => new Date())`; add `$onUpdateFn(() => new Date())` to `updatedAt`.
- Export `createInsertSchema(...).omit({ id, createdAt, updatedAt })`, `createSelectSchema(...)`, and the `z.infer` types. These zod schemas/types are the contract consumed by `@wisp/core` — never duplicate row types by hand elsewhere.
- Export the new table from `src/schema/index.ts`; then `bun run db:generate && bun run db:migrate`. Migrations are generated artifacts — never edit them manually.

## Frontend (`apps/dashboard`)

Exemplars: `features/deploy/service-create/service-create.component.ts` (form) · `features/deploy/service-list/service-list.component.ts` (list).

- **Zoneless app**: every component sets `changeDetection: ChangeDetectionStrategy.OnPush` and drives the template from `signal()`s. Mutating a plain field will NOT re-render.
- Standalone components only (no NgModules); `imports: [...]` on the decorator; inline `template:` for small components.
- DI with `inject()` in field initializers; fields `private readonly`. No constructor injection.
- Forms: reactive (`FormBuilder` + `Validators`), mirror the backend's validation constraints (same patterns/lengths), disable submit on `form.invalid || loading()`.
- Control flow: `@if` / `@for (…; track item.id)` / `@empty`. Never `*ngIf`/`*ngFor`.
- HTTP only via `ApiService`; paths relative to `/api` (e.g. `.post('/deploy', body)`). New cross-cutting HTTP behavior goes into a functional interceptor registered in `app.config.ts` `withInterceptors([...])`.
- Local UI state pattern: `loading = signal(false)`, `error = signal<string | null>(null)`; errors rendered with `role="alert"`. Inputs always have an associated `<label for>`.
- New feature = folder under `features/` with its own `*.routes.ts`, lazy-loaded from `app.routes.ts` via `loadChildren`.
- Shared UI goes in `shared/components|pipes|directives` (currently empty placeholders).
- E2E: Playwright specs in `tests/e2e/`, one file per user flow (`auth.spec.ts`, `deploy.spec.ts`).

## Pull request / change checklist

Identical to "Definition of done" in [AGENTS.md](../AGENTS.md): lint + check-types + test green, tests updated, e2e for UI, STATE.md + spec updated.
