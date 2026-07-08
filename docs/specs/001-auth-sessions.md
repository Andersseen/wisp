# 001 — Auth Sessions

- **Status:** done
- **Owner approval:** approved
- **Created:** 2026-07-08 · **Updated:** 2026-07-08
- **Depends on:** —

## Problem

No endpoint autenticado funciona end-to-end porque `authPlugin` (`apps/core/src/plugins/auth.ts`) siempre devuelve `{ user: null }`. `AuthService.login` solo devuelve `{ id, email }`, así que el dashboard no tiene token ni cookie que enviar. No existe tabla `sessions`. Además, el body de registro usa el nombre confuso `hashedPassword` para la contraseña en texto plano (bug #3 de STATE.md), y `GET /deploy/:id` no verifica ownership (bug #5).

Sin sesiones, todo el dashboard autenticado está bloqueado: crear servicios, listar servicios propios, ver detalle/logs, etc.

## Goals

- Usuarios pueden registrarse, iniciar sesión y cerrar sesión.
- El backend valida sesiones desde una cookie `HttpOnly` y expone `user` en el contexto de Elysia.
- Rutas autenticadas funcionan (`POST /deploy`, `GET /deploy`, `GET /deploy/:id` con ownership).
- El dashboard mantiene la sesión tras recargar y envía credenciales automáticamente.
- Todos los criterios de aceptación tienen tests automatizados.

## Non-goals

- No OAuth, no 2FA, no reset de contraseña.
- No refresco de sesiones: expiran y el usuario vuelve a login.
- No RBAC avanzado: solo se valida que el recurso pertenezca al usuario autenticado.
- No cambio de contraseña ni edición de perfil.

## User story

Como usuario de Wisp, quiero iniciar sesión una vez y que el dashboard recuerde quién soy, para poder crear y gestionar mis servicios sin volver a autenticarme en cada acción.

## Design

### API contracts

Todas las respuestas de error usan el envelope `{ success: false, code, message }` del error handler existente.

#### `POST /auth/register`

- Auth: none
- Request body:
  ```json
  {
    "email": "string",
    "password": "string",        // renombrado desde "hashedPassword"
    "name": "string | undefined"
  }
  ```
- Success: `201 Created`
  ```json
  {
    "id": "string",
    "email": "string"
  }
  ```
- Errors:
  - `400` ValidationError: email inválido, password < 8 chars, etc.
  - `409` ConflictError: email ya existe.

#### `POST /auth/login`

- Auth: none
- Request body:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- Success: `200 OK`, set cookie `sessionId=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=<seconds>` (Secure en producción).
  ```json
  {
    "id": "string",
    "email": "string"
  }
  ```
- Errors:
  - `401` UnauthorizedError: credenciales inválidas.

#### `POST /auth/logout`

- Auth: session cookie
- Success: `200 OK`, cookie `sessionId` invalidada (misma cookie con `Max-Age=0` o fecha expirada).
  ```json
  { "ok": true }
  ```
- Errors:
  - `401` UnauthorizedError: sin sesión.

#### `GET /auth/me`

- Auth: session cookie
- Success: `200 OK`
  ```json
  {
    "id": "string",
    "email": "string",
    "name": "string | null",
    "role": "admin | user"
  }
  ```
- Errors:
  - `401` UnauthorizedError: sesión inválida o expirada.

#### `GET /deploy/:id`

- Auth: session cookie (igual que `POST /deploy` y `GET /deploy`)
- Ownership: el servicio debe pertenecer al usuario autenticado.
- Success: `200 OK` (respuesta existente).
- Errors:
  - `401` UnauthorizedError: sin sesión.
  - `403` ForbiddenError: servicio no pertenece al usuario.
  - `404` NotFoundError: servicio no existe.

### DB changes

Añadir tabla `sessions` en `packages/db/src/schema/`:

```ts
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),           // token opaque, 32 bytes base64url (~43 chars)
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
})
```

Relaciones:
- `users.sessions` → uno-a-muchos.
- Exportar `InsertSession`, `SelectSession` y los esquemas de drizzle-zod.

Migración generada con `bun run db:generate` (no editar a mano).

### Frontend changes

#### `apps/dashboard/src/app/core/auth.service.ts`

- `user = signal<User | null>(null)`.
- `login(email, password)` → `POST /auth/login`, actualiza `user()` con respuesta.
- `register(...)` → `POST /auth/register`.
- `logout()` → `POST /auth/logout`, limpia `user()`.
- `fetchMe()` → `GET /auth/me`, actualiza `user()` al arrancar la app.
- Todas las llamadas usan `withCredentials: true` para enviar la cookie.

#### `apps/dashboard/src/app/core/api.service.ts`

- Mantener `baseUrl = '/api'`.
- Configurar `credentials: 'include'` en todas las peticiones para que las cookies `HttpOnly` crucen dominio/subdominio en dev/prod.

#### `apps/dashboard/src/app/core/auth.interceptor.ts` (nuevo)

- No se necesita añadir header `Authorization` (la cookie lo hace automáticamente).
- Interceptar respuestas `401` para redirigir a `/login` y limpiar `user()`.

#### `apps/dashboard/src/app/core/auth.guard.ts` (nuevo)

- CanActivate que usa `AuthService.user()`.
- Si no hay usuario, intenta `fetchMe()`; si falla, redirige a `/login` con `returnUrl`.
- Proteger `/deploy` y `/deploy/:id`.

#### `apps/dashboard/src/app/app.config.ts`

- Añadir `provideHttpClient(withInterceptors([authInterceptor, errorHandlerInterceptor]))`.
- Inyectar `AuthService` e invocar `fetchMe()` en APP_INITIALIZER (o en `AppComponent` ngOnInit) para restaurar sesión al recargar.

#### `apps/dashboard/src/app/app.routes.ts`

- Añadir `canActivate: [authGuard]` a rutas protegidas.

#### `apps/dashboard/src/app/features/auth/login/login.component.ts`

- En éxito, redirigir a `/deploy`.

#### `apps/dashboard/src/app/app.component.ts`

- Header muestra `user()?.email` y botón logout; si `user()` es null, muestra links a login/register.

### Backend changes

#### `apps/core/src/plugins/auth.ts`

- Leer cookie `sessionId` (Elysia expone cookies en `cookie` o parsear manualmente del header `Cookie`).
- Si no hay cookie → `{ user: null }`.
- Buscar sesión en DB por `id` y comprobar `expiresAt > now()`.
- Si válida, cargar usuario y devolver `{ user: { id, email, name, role } }`.
- Si inválida/expirada → `{ user: null }`.

#### `apps/core/src/services/auth/session.service.ts` (nuevo)

- `createSession(userId): Promise<string>` — genera token criptográfico aleatorio, inserta fila, devuelve token.
- `validateSession(token): Promise<UserContext | null>` — lookup + expiry check.
- `invalidateSession(token): Promise<void>` — delete.
- `invalidateAllUserSessions(userId): Promise<void>` — delete where userId (out of scope para v1, pero helper útil).

#### `apps/core/src/services/auth/auth.service.ts`

- `register(data)` cambia `data.hashedPassword` → `data.password` y usa `PasswordService` para hashear.
- `login(email, password)` verifica credenciales y devuelve `{ user, sessionId }` (el route crea la cookie).

#### `apps/core/src/services/auth/password.service.ts`

- Empezar a usarlo desde `AuthService` (actualmente importa directamente de `@node-rs/argon2`).

#### `apps/core/src/routes/auth.routes.ts`

- `POST /auth/register`: validar body con zod, llamar `AuthService.register`, responder 201.
- `POST /auth/login`: validar body, llamar `AuthService.login`, crear sesión via `SessionService`, set cookie.
- `POST /auth/logout`: requerir `user` del contexto, invalidar sesión, clear cookie.
- `GET /auth/me`: requerir `user`, devolver datos públicos.

#### `apps/core/src/routes/deploy.routes.ts`

- Añadir `authPlugin` a `GET /deploy/:id`.
- Comprobar `service.userId === user.id`; si no, lanzar `ForbiddenError` (añadir a `types/error.ts` si no existe).

#### `apps/core/src/types/error.ts`

- Añadir `ForbiddenError` (HTTP 403) si no existe.

#### `apps/core/src/config/index.ts` + `.env.example`

- Añadir:
  - `SESSION_COOKIE_NAME` (default `sessionId`)
  - `SESSION_MAX_AGE_MS` (default `7 * 24 * 60 * 60 * 1000` — 7 días)
  - `NODE_ENV` (para decidir `Secure` en la cookie; ya puede existir)

### Other

- No cambios en infra/compose.
- No cambios en colas ni motores.

## Acceptance criteria

1. **Given** un usuario registrado, **when** hace `POST /auth/login` con credenciales correctas, **then** recibe 200, cookie `sessionId` seteada, y `GET /auth/me` con esa cookie devuelve sus datos.
2. **Given** un usuario con sesión válida, **when** hace `POST /auth/logout`, **then** la cookie se invalida y `GET /auth/me` posterior devuelve 401.
3. **Given** un usuario autenticado, **when** crea un servicio con `POST /deploy`, **then** el servicio se guarda con `userId` del usuario y `GET /deploy` lista solo sus servicios.
4. **Given** un usuario autenticado que no es dueño de un servicio, **when** hace `GET /deploy/:id` de ese servicio, **then** recibe 403.
5. **Given** un usuario no autenticado, **when** hace `POST /deploy` o `GET /deploy/:id`, **then** recibe 401.
6. **Given** un dashboard logueado, **when** recarga la página, **then** sigue viendo el email del usuario y la lista de servicios sin volver a login.
7. **Given** un dashboard con sesión expirada/inválida, **when** intenta navegar a `/deploy`, **then** es redirigido a `/login`.
8. **Given** el body de registro con campo `password`, **when** se envía `POST /auth/register`, **then** se crea el usuario y el campo `hashedPassword` antiguo ya no se acepta.

## Implementation checklist

Ordenado por slices verdes mínimos.

- [x] DB: añadir tabla `sessions` y relaciones en `packages/db/src/schema/`.
- [x] DB: generar migración (`bun run db:generate`) y aplicar (`bun run db:migrate`).
- [x] Backend: añadir `ForbiddenError` a `apps/core/src/types/error.ts` y al error handler si es necesario.
- [x] Backend: crear `apps/core/src/services/auth/session.service.ts`.
- [x] Backend: actualizar `apps/core/src/services/auth/password.service.ts` y usarlo desde `AuthService`.
- [x] Backend: actualizar `AuthService` para renombrar `hashedPassword` → `password` en el contrato de entrada.
- [x] Backend: actualizar `authPlugin` para validar cookie de sesión.
- [x] Backend: actualizar `apps/core/src/routes/auth.routes.ts` (login setea cookie, logout la borra, /me devuelve usuario).
- [x] Backend: actualizar `apps/core/src/routes/deploy.routes.ts` para proteger `GET /deploy/:id` y chequear ownership.
- [x] Backend: añadir config de cookie (`SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_MS`, `NODE_ENV`) en `config/index.ts` y `.env.example`.
- [x] Backend tests: actualizar tests de auth (login devuelve cookie, /me funciona, logout invalida).
- [x] Backend tests: añadir tests de deploy ownership (403) y 401 sin sesión.
- [x] Frontend: añadir `auth.interceptor.ts` y `auth.guard.ts`.
- [x] Frontend: actualizar `ApiService` para `credentials: 'include'`.
- [x] Frontend: actualizar `AuthService` para usar `password`, manejar cookie implícita, y exponer `fetchMe`.
- [x] Frontend: actualizar `app.config.ts` para registrar interceptor/guard y restaurar sesión al boot.
- [x] Frontend: actualizar `app.routes.ts` con `canActivate`.
- [x] Frontend: actualizar `login.component.ts` para redirigir a `/deploy`.
- [x] Frontend: actualizar `app.component.ts` para mostrar usuario logueado y logout.
- [x] Frontend tests: actualizar/añadir tests unitarios de `AuthService` y guard/interceptor.
- [x] E2E: añadir/actualizar test de login que persista tras reload.
- [x] Verificar gates: `bun run lint`, `bun run check-types`, `bun run test`, `bun run test:e2e`.
- [x] Actualizar `docs/STATE.md` (cerrar bugs #1, #2, #3, #5, #10; añadir changelog).
- [x] Actualizar este spec: `Status: done`, fecha, y marcar checkboxes.

## Test plan

| Criterio | Tests |
|---|---|
| 1 | Integración: login → cookie → /me |
| 2 | Integración: logout → /me 401 |
| 3 | Integración: POST /deploy y GET /deploy con sesión |
| 4 | Integración: GET /deploy/:id ajeno → 403 |
| 5 | Integración: endpoints sin cookie → 401 |
| 6 | E2E Playwright: login → reload → sigue en dashboard |
| 7 | E2E Playwright: sesión rota → redirige a login |
| 8 | Integración: registro con `password`, rechazo con `hashedPassword` |

Además, tests unitarios de `SessionService` (crear/validar/expirar) y de `AuthService` (hash con `PasswordService`).

## Risks & edge cases

- **Migración en BD existente:** `packages/db` usa SQLite; la migración añade tabla nueva, no altera datos existentes. Los usuarios demo seguirán funcionando, pero tendrán que volver a loguearse.
- **Cookie en dev vs prod:** en dev `Secure` debe ser `false` (http://localhost). En prod `Secure=true` requiere HTTPS.
- **Token generation:** usar `crypto.randomBytes(32).toString('base64url')`, no `Math.random()`.
- **Timing attacks:** mantener camino de login constante (igual tiempo si email existe o no); ya se hace con argon2 verify.
- **Race condition en registro:** el `ConflictError` actual ya maneja email duplicado; no cambia.
- **Angular `credentials: 'include'`:** en dev con proxy de Angular (`proxy.conf.json`) puede requerir que el proxy reenvíe cookies. Verificar.

## Out of scope / follow-ups

- Refresh tokens / sliding sessions.
- OAuth (GitHub login).
- Rate limiting en login.
- Cambio de contraseña y forgot-password.
- Invalidación masiva de sesiones desde admin.
