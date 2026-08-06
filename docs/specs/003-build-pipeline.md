# 003 — Build Pipeline

- **Status:** done
- **Owner approval:** approved
- **Created:** 2026-08-06 · **Updated:** 2026-08-06
- **Depends on:** 001 (auth sessions)

## Problem

Crear un servicio hoy guarda una fila en `services` pero no hace nada: `BuildService.build` devuelve un éxito falso, `deploy.worker.ts` escucha la cola `'deploy'` mientras `QueueService` produce en `'build'` (bug #6 de STATE.md), y ningún worker se instancia en `src/index.ts`. El dashboard muestra "No logs available." porque no existe endpoint de jobs.

Sin esta fase, Wisp es un formulario que guarda URLs — no construye nada.

## Goals

- Al crear un servicio, Wisp clona el repo, construye una imagen Docker, y persiste el progreso en la tabla `jobs`.
- El worker de build se instancia al arrancar el backend y procesa jobs de la cola `'build'`.
- El estado del servicio refleja el progreso (`pending → building → error`; `running` llega en Phase 4).
- `GET /deploy/:id/jobs` expone el historial de builds al usuario autenticado.
- Bug #6 de STATE.md resuelto (nombre de cola unificado).

## Non-goals

- No se ejecuta el contenedor ni se registra ruta en Caddy (Phase 4).
- No webhooks de GitHub (Phase 6).
- No buildpacks ni detección automática de Dockerfile — v1 requiere `Dockerfile` en la raíz del repo.
- No reintentos automáticos de BullMQ (v1: el job falla y queda `failed`).
- No streaming de logs en tiempo real (SSE/WebSocket) — solo polling del endpoint.
- No cleanup de imágenes Docker antiguas.

## User story

Como usuario de Wisp, quiero que al crear un servicio con una URL de git, Wisp clone el repo y construya una imagen Docker, para que en la siguiente fase pueda correrla.

## Design

### API contracts

#### `POST /deploy` (modificación)

- Auth: session cookie (sin cambios).
- Request body: sin cambios.
- Success: `200 OK` — ahora además de crear el servicio, inserta un job `type: 'build'`, `status: 'pending'` y lo encola en la cola `'build'`.
  ```json
  { "id": "string" }
  ```
- El servicio se crea con `status: 'pending'` (sin cambios en la respuesta).

#### `GET /deploy/:id/jobs` (nuevo)

- Auth: session cookie + ownership check (igual que `GET /deploy/:id`).
- Success: `200 OK`
  ```json
  [
    {
      "id": "string",
      "type": "build",
      "status": "pending | running | success | failed",
      "serviceId": "string",
      "logOutput": "string | null",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
  ```
  Ordenados por `createdAt` desc.
- Errors:
  - `401` UnauthorizedError: sin sesión.
  - `403` ForbiddenError: servicio ajeno.
  - `404` NotFoundError: servicio no existe.

### DB changes

Sin cambios de schema — la tabla `jobs` ya existe con las columnas necesarias (`id`, `type`, `status`, `serviceId`, `logOutput`, `createdAt`, `updatedAt`). No se requiere migración nueva.

### Backend changes

#### `apps/core/src/config/index.ts` + `.env.example`

- Añadir `WORK_DIR` (default `./data/builds`). Directorio donde se clonan repos y se construyen imágenes.

#### `apps/core/src/services/deploy/build.service.ts`

Reemplazar el stub actual. Constructor recibe `docker: Dockerode` y `workDir: string`.

- `build(input: BuildInput & { slug: string; jobId: string }): Promise<BuildResult>`
  1. Crear directorio `{workDir}/{slug}/{jobId}`.
  2. `git clone --depth 1 --branch {branch} {gitUrl} {dir}` via `Bun.spawn`.
  3. Verificar que `{dir}/Dockerfile` existe; si no, lanzar error tipado.
  4. `docker.buildImage(tarStream, { t: ['wisp/{slug}:{jobId}', 'wisp/{slug}:latest'] })` — el tar stream se genera con `tar` del directorio.
  5. Retornar `{ success: true, log: string }` con la salida del build.
  6. En cualquier error, retornar `{ success: false, log: string }` con el mensaje de error.
  7. Limpiar el directorio de trabajo al terminar (éxito o fallo).

- Tipo de retorno:
  ```ts
  interface BuildResult { success: boolean; log: string }
  ```

#### `apps/core/src/services/queue/queue.service.ts`

- Renombrar método `addBuildJob` a `addBuildJob` (mantiene nombre) pero asegurar que produce en la cola `'build'` (ya lo hace — confirmar).
- Añadir parámetro `jobId: string` para que el worker pueda correlacionar con la fila de DB.

#### `apps/core/src/queue/build.worker.ts` (renombrar desde `deploy.worker.ts`)

- Renombrar archivo de `deploy.worker.ts` a `build.worker.ts`.
- Escuchar la cola `'build'` (corrige bug #6).
- El processor:
  1. Extraer `{ serviceId, slug, gitUrl, branch, jobId }` del job data.
  2. Actualizar job en DB: `status: 'running'`.
  3. Actualizar service en DB: `status: 'building'`.
  4. Llamar `BuildService.build(...)`.
  5. Actualizar job: `status: success ? 'success' : 'failed'`, `logOutput: result.log`.
  6. Actualizar service: `status: success ? 'building' : 'error'` (se queda en `building` hasta que Phase 4 lo mueva a `running`; si falla → `error`).
  7. Retornar `{ success, jobId }`.

#### `apps/core/src/services/deploy/deploy.service.ts`

- `create(...)` ahora también:
  1. Inserta fila en `jobs` con `type: 'build'`, `status: 'pending'`, `id: generateId()`.
  2. Encola via `QueueService.addBuildJob(serviceId, slug, gitUrl, branch, jobId)`.
- Constructor recibe `db`, `queueService`, y `buildService` (o se inyectan via parámetros).
- Nuevo método: `getJobsByServiceId(serviceId: string)` — retorna jobs ordenados por `createdAt` desc.

#### `apps/core/src/routes/deploy.routes.ts`

- `POST /deploy`: inyectar `QueueService` y `BuildService` al `DeployService`.
- Añadir `GET /deploy/:id/jobs` con auth + ownership.

#### `apps/core/src/index.ts`

- Instanciar `BuildService` (con `docker` del plugin y `config.WORK_DIR`).
- Instanciar `QueueService` (con `redis` del plugin).
- Crear `buildWorker` via `createBuildWorker(redis, buildService, db)`.
- En graceful shutdown (`SIGTERM`/`SIGINT`): `buildWorker.close()`.

### Frontend changes

Sin cambios en esta fase — el dashboard ya muestra la lista de servicios. El endpoint de jobs estará disponible para Phase 5.

### Other (infra, config)

- `.env.example`: añadir `WORK_DIR=./data/builds`.
- Asegurar que `data/builds/` está en `.gitignore`.
- El directorio se crea automáticamente en `BuildService.build` si no existe.

## Acceptance criteria

1. **Given** un usuario autenticado, **when** crea un servicio con `POST /deploy` apuntando a un repo público con `Dockerfile`, **then** se crea el servicio, se inserta un job `type: 'build'` en estado `pending`, y el job se encola.
2. **Given** un job de build encolado, **when** el worker lo procesa, **then** clona el repo, construye la imagen Docker `wisp/{slug}:latest`, actualiza el job a `success` con el log de build en `logOutput`, y el servicio queda en `building`.
3. **Given** un repo sin `Dockerfile`, **when** el worker intenta construir, **then** el job queda en `failed` con el error en `logOutput` y el servicio en `error`.
4. **Given** un repo inalcanzable (URL inválida, repo privado sin credenciales), **when** el worker intenta clonar, **then** el job queda en `failed` con el error en `logOutput` y el servicio en `error`.
5. **Given** un usuario autenticado dueño de un servicio, **when** hace `GET /deploy/:id/jobs`, **then** recibe la lista de jobs ordenados por `createdAt` desc.
6. **Given** un usuario autenticado que no es dueño, **when** hace `GET /deploy/:id/jobs`, **then** recibe 403.
7. **Given** el backend arranca, **when** se envía `SIGTERM`, **then** el worker se cierra gracefulmente sin perder jobs en progreso.

## Implementation checklist

- [x] Config: añadir `WORK_DIR` a `apps/core/src/config/index.ts` y `.env.example`.
- [x] Config: añadir `data/builds/` a `.gitignore`.
- [x] Renombrar `apps/core/src/queue/deploy.worker.ts` → `apps/core/src/queue/build.worker.ts`; escuchar cola `'build'`.
- [x] Backend: reescribir `apps/core/src/services/deploy/build.service.ts` con clone + docker build reales.
- [x] Backend: actualizar `apps/core/src/services/queue/queue.service.ts` para pasar `jobId` y `slug`.
- [x] Backend: actualizar `apps/core/src/services/deploy/deploy.service.ts` — insertar job, encolar, nuevo método `getJobsByServiceId`.
- [x] Backend: actualizar `apps/core/src/routes/deploy.routes.ts` — inyectar dependencias, añadir `GET /:id/jobs`.
- [x] Backend: actualizar `apps/core/src/index.ts` — instanciar worker, graceful shutdown.
- [x] Backend: actualizar `apps/core/src/types/deploy.ts` — añadir `BuildResult`, extender `BuildInput`.
- [x] Tests unitarios: `BuildService` con mocks de `Bun.spawn` y `dockerode`.
- [x] Tests unitarios: `DeployService` — verifica que `create` inserta job y encola.
- [x] Tests integración: `GET /deploy/:id/jobs` — auth, ownership, 403.
- [x] Verificar gates: `bun run lint`, `bun run check-types`, `bun run test`.
- [x] Actualizar `docs/STATE.md`: cerrar bug #6, mover stubs a "What works", changelog.
- [x] Actualizar este spec: `Status: done`, fecha, checkboxes.

## Test plan

| Criterio | Tests |
|---|---|
| 1 | Integración: POST /deploy → service + job creados |
| 2 | Unitario: BuildService.build con mocks → success path |
| 3 | Unitario: BuildService.build sin Dockerfile → failed |
| 4 | Unitario: BuildService.build con git clone fallido → failed |
| 5 | Integración: GET /deploy/:id/jobs con sesión → lista de jobs |
| 6 | Integración: GET /deploy/:id/jobs sin ownership → 403 |
| 7 | Manual: arrancar backend, SIGTERM, verificar que worker se cierra |

## Risks & edge cases

- **Docker socket permissions**: en dev el backend corre como el usuario host; el socket debe ser accesible. En prod (container) se monta el socket — documentar en Phase 7.
- **Espacio en disco**: cada build clona un repo y genera una imagen. Sin cleanup, `WORK_DIR` crece indefinidamente. Mitigación: cleanup post-build en `BuildService` (borrar directorio de trabajo). Las imágenes antiguas se limpian en Phase 4 al re-deployar.
- **Concurrencia**: dos builds del mismo servicio simultáneos podrían pisarse. v1: sin protección — documentar como limitación. Phase 4 puede añadir lock por servicio.
- **Repos grandes**: `--depth 1` mitiga pero repos con assets pesados pueden tardar. v1: sin timeout explícito (Bun.spawn hereda el del proceso).
- **Imagen Docker sin tag**: si `docker build` falla a mitad, puede quedar una imagen parcial. dockerode maneja esto — la imagen no se taguea si el build falla.
- **`tar` dependency**: `dockerode.buildImage` necesita un tar stream. Usar `tar` npm package o `Bun.spawn(['tar', ...])`. Verificar disponibilidad.

## Out of scope / follow-ups

- Ejecutar el contenedor y registrar ruta en Caddy (Phase 4).
- Endpoint de logs del contenedor (`docker logs`) — Phase 5.
- Webhook de GitHub para re-deploy automático (Phase 6).
- Streaming de logs en tiempo real via SSE/WebSocket.
- Reintentos automáticos de jobs fallidos.
- Cleanup de imágenes Docker antiguas (`docker image prune`).
- Buildpacks o detección automática de Dockerfile.
- Timeout configurable por build.
