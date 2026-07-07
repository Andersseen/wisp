# 001 — Auth sessions (login that actually authenticates)

- **Status:** draft
- **Owner approval:** pending
- **Created:** 2026-07-06 · **Updated:** 2026-07-07
- **Depends on:** —

## Problem

Authentication is scaffolded but non-functional, which blocks every other feature (STATE.md bugs #1–#5, #10):

- `apps/core/src/plugins/auth.ts` always returns `user: null` (Lucia validation is a TODO) → `POST /deploy` and `GET /deploy` always reject.
- `AuthService.login` returns `{ id, email }` with no session/token; there is no `sessions` table.
- The register body field is named `hashedPassword` but carries the plaintext password.
- `deploy.routes.ts` throws bare `Error('UNAUTHORIZED')` → clients get 500 instead of 401; `GET /deploy/:id` has no auth or ownership check.
- Dashboard: no guard, no `Authorization` header, user lost on refresh.

## Goals

- Persistent DB-backed sessions: login issues an opaque bearer token; `authPlugin` validates it.
- `POST /auth/logout` and `GET /auth/me`.
- Deploy routes properly protected (401 via typed errors, ownership on `GET /:id`).
- Dashboard: token storage, auth interceptor, route guard, session restore on refresh.

## Non-goals

OAuth/social login, password reset, email verification, rate limiting, admin-role enforcement, cookie/CSRF-based auth (bearer header only), session listing/revocation UI.

## User story

As a user, I log in once and can create and list my services from the dashboard; refreshing the page keeps me logged in; logging out invalidates my session server-side.

## Design

### Decision: own sessions on the existing schema pattern, no new deps

Lucia v3 (installed) is deprecated upstream and would require an adapter package. We keep using its `generateId` but implement sessions directly in `AuthService` + a `sessions` table, following Lucia's documented model (opaque id, DB row, sliding expiration). `SESSION_SECRET` stays reserved (unused by this spec).

### DB changes (`packages/db/src/schema/sessions.ts`, new)

| column | type | constraints |
|---|---|---|
| `id` | text | primary key (the bearer token, `generateId(40)`) |
| `user_id` | text | not null, references `users.id` |
| `expires_at` | integer (mode: timestamp) | not null |
| `created_at` | integer (mode: timestamp) | `$defaultFn(() => new Date())` |

Follow the exemplar pattern (`services.ts`), export from `schema/index.ts`, then `bun run db:generate && bun run db:migrate`.

**Session policy:** TTL 30 days. Sliding renewal: on successful validation with < 15 days left, extend `expires_at` to now + 30 days. Expired sessions are deleted on the validation attempt that finds them.

### API contracts (error envelope: `{ success: false, code, message }`)

| Endpoint | Auth | Request | Success 200 | Errors |
|---|---|---|---|---|
| `POST /auth/register` | no | `{ email, password (min 8), name? }` — **rename `hashedPassword` → `password`** | `{ id, email }` | 409 `CONFLICT` |
| `POST /auth/login` | no | `{ email, password }` | `{ token, expiresAt, user: { id, email, name } }` | 401 `UNAUTHORIZED` (same message for bad email or bad password) |
| `POST /auth/logout` | bearer | — | `{ success: true }` (idempotent: unknown token still 200) | — |
| `GET /auth/me` | bearer | — | `{ id, email, name, role }` | 401 `UNAUTHORIZED` |

`authPlugin` (`plugins/auth.ts`): parse `Authorization: Bearer <token>` → load session + user (delete row and return null if expired) → derive `{ user, sessionId }`. Stays `null`-returning (no throw) so public routes can share it; protected handlers throw `UnauthorizedError`.

Deploy routes: replace both `new Error('UNAUTHORIZED')` with `UnauthorizedError`; `GET /deploy/:id` requires auth and returns 404 `NOT_FOUND` if the service exists but belongs to another user (don't leak existence).

### Frontend changes

- `core/auth.service.ts`: store token in `localStorage` key `wisp_session`; `login()` saves token + sets `user`; `logout()` calls API, clears storage + signal; `restore()` (called from `app.config.ts` initializer) does `GET /auth/me` when a token exists; register sends `password` (rename).
- `core/auth.interceptor.ts` (new, functional): attach `Authorization: Bearer <token>` when present; on 401 response clear session and redirect to `/auth/login`. Register in `withInterceptors` alongside the error interceptor.
- `core/auth.guard.ts` (new, `CanActivateFn`): block `/deploy` routes when no session, redirect to `/auth/login`.
- Login component: on success navigate to `/deploy`.

## Acceptance criteria

1. **Given** no `Authorization` header, **when** `GET /deploy`, **then** HTTP 401 with code `UNAUTHORIZED` (not 500).
2. **Given** valid credentials, **when** `POST /auth/login`, **then** response contains a token and a `sessions` row exists with ~30-day expiry.
3. **Given** a valid token, **when** `GET /auth/me`, **then** the user's `{ id, email, name, role }` is returned.
4. **Given** an expired session, **when** any authenticated request, **then** 401 and the session row is deleted.
5. **Given** a logged-out token, **when** reused, **then** 401.
6. **Given** user A's token, **when** `GET /deploy/:id` for user B's service, **then** 404.
7. **Given** a logged-in dashboard user, **when** the page is refreshed, **then** they remain logged in (user signal restored via `/auth/me`).
8. **Given** no session in the browser, **when** navigating to `/deploy`, **then** redirect to `/auth/login`.
9. `POST /auth/register` accepts `{ email, password, name? }`; the old `hashedPassword` field is gone from API and dashboard.

## Implementation checklist

- [ ] `packages/db/src/schema/sessions.ts` + export in `schema/index.ts`; run `db:generate` + `db:migrate`
- [ ] `apps/core/src/services/auth/session.service.ts` — create/validate/invalidate (sliding renewal, expiry cleanup)
- [ ] `apps/core/src/services/auth/auth.service.ts` — login issues session; register field rename
- [ ] `apps/core/src/routes/auth.routes.ts` — body rename; add `/logout`, `/me`
- [ ] `apps/core/src/plugins/auth.ts` — real validation via SessionService
- [ ] `apps/core/src/routes/deploy.routes.ts` — `UnauthorizedError`; ownership on `GET /:id`
- [ ] Backend tests — `tests/unit/session.service.test.ts`, extend `tests/integration/auth.routes.test.ts` (criteria 1–6, 9)
- [ ] `apps/dashboard/src/app/core/auth.service.ts` — token storage, restore, rename
- [ ] `apps/dashboard/src/app/core/auth.interceptor.ts` + `auth.guard.ts`; register in `app.config.ts` / `app.routes.ts`
- [ ] e2e — `apps/dashboard/tests/e2e/auth.spec.ts` (criteria 7, 8)
- [ ] Update `docs/STATE.md` (move items out of bugs #1–#5, #10; changelog)

## Test plan

Unit: session create/validate/expiry/renewal boundaries (14 d 23 h → renews; 15 d 1 h → doesn't). Integration: full register→login→me→logout→reuse-token flow; deploy 401/ownership. E2E: login persists across reload; guard redirect.

## Risks & edge cases

- Same generic 401 message for unknown email vs wrong password (no enumeration).
- localStorage is XSS-readable — accepted for v1 (SPA + bearer); revisit with cookies+CSRF later.
- Concurrent requests during sliding renewal must not fail (renewal is a best-effort UPDATE).
- Existing dev DBs need the migration; seed script may need a demo session/user update.

## Out of scope / follow-ups

Password reset, session management UI, admin role checks on routes, rate limiting login attempts, moving `logout` cleanup of expired sessions to a scheduled job.
