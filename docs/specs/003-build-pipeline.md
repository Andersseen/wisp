# 003 — Build pipeline

- **Status:** done
- **Owner approval:** approved
- **Created:** 2026-08-05 · **Updated:** 2026-08-05
- **Depends on:** [001](001-auth-sessions.md), 002 (dashboard shell)

## Problem

Crear un servicio en Wisp solo lo guarda en `services` (`apps/core/src/services/deploy/deploy.service.ts`). No se clona el repo, no se ejecuta `docker build`, no se persiste progreso en `jobs`, y el worker de build no está cableado en `apps/core/src/index.ts`. El dashboard muestra el servicio como `pending` para siempre.

Esto bloquea el core value de Wisp: convertir un repo git en una imagen Docker lista para correr.

## Goals

- Al crear un servicio, Wisp encola un job de build que clona el repo y ejecuta `docker build`.
- El progreso y los logs del build se guardan incrementalmente en `jobs.logOutput`.
- El worker de build está cableado al arranque y se cierra gracefulmente al apagar.
- El servicio actualiza su estado: `pending → building → error` (en fase 4 llegará `running`).
- El dashboard puede listar los jobs de un servicio vía `GET /deploy/:id/jobs`.
- Todos los caminos felices y de error tienen tests automatizados.

## Non-goals

- No ejecutar el contenedor ni exponerlo por Caddy (fase 4).
- No buildpacks ni detección automática de lenguaje: v1 requiere un `Dockerfile` en la raíz del repo.
- No cache de capas de Docker entre jobs (se acepta lo que haga el daemon por defecto).
- No webhooks de GitHub (fase 6).
- No logs en tiempo real ni SSE/WebSocket: se persiste `logOutput` y se consulta al final.
- No retry automático de jobs fallidos.

## User story

Como usuario de Wisp, quiero pegar la URL de un repo git y que Wisp lo compile en una imagen Docker, para poder luego desplegarlo sin tocar la terminal.

## Design

### API contracts

Todas las respuestas de error usan el envelope `{ success: false, code, message }` del error handler existente.

#### `POST /deploy` (cambio de comportamiento)

- Auth: session cookie
- Request body: sin cambios (`name`, `slug`, `gitUrl`, `branch`)
- Success: `201 Created` con `{ id: string }`. Además:
  1. Inserta una fila en `jobs` (`type: build`, `status: pending`).
  2. Inserta el job en la cola BullMQ `'build'`.
  3. Marca el servicio `status = 'pending'` (ya es el default).
- Errors: sin cambios (`400`, `401`, `409`).

#### `GET /deploy/:id/jobs`

- Auth: session cookie + ownership del servicio.
- Success: `200 OK`
  ```json
  {
    "jobs": [
      {
        "id": "string",
        "type": "build | deploy",
        "status": "pending | running | success | failed",
        "logOutput": "string | null",
        "createdAt": "ISO-8601 string",
        "updatedAt": "ISO-8601 string"
      }
    ]
  }
  ```
  Ordenados por `createdAt` descendente.
- Errors:
  - `401` UnauthorizedError: sin sesión.
  - `403` ForbiddenError: servicio no pertenece al usuario.
  - `404` NotFoundError: servicio no existe.

### DB changes

Sin cambios de schema. Las tablas `services` y `jobs` ya soportan los estados y campos necesarios (`packages/db/src/schema/services.ts`, `packages/db/src/schema/jobs.ts`).

Se actualizará `jobs.logOutput` y `jobs.status` durante la ejecución, y `services.status` al finalizar.

### Frontend changes

Mínimos en esta fase (el detalle completo llega en fase 5):

- `apps/dashboard/src/app/features/deploy/services/deploy.service.ts`: añadir `getJobs(serviceId: string)` → `GET /deploy/:id/jobs`.
- `apps/dashboard/src/app/features/deploy/service-list/service-list.component.ts`: mostrar `status` del servicio (`pending`, `building`, `error`) con el badge correspondiente.
- Opcionalmente, en `create-service.component.ts`, tras crear el servicio redirigir a `/deploy` y mostrarlo con estado `pending` hasta que el usuario recargue.

No se añade página de detalle ni visor de logs en esta fase.

### Other (queues, engines, infra, config)

#### Configuración (`apps/core/src/config/index.ts` + `.env.example`)

Añadir:

- `WORK_DIR` (default `./data/builds`): directorio base para clones temporales.
- `DOCKER_SOCKET` ya existe (default `/var/run/docker.sock`).

Convención de tags (hardcodeada en `BuildService`):

- Tag por job: `wisp/<slug>:<jobId>`
- Alias moving: `wisp/<slug>:latest`

#### QueueService (`apps/core/src/services/queue/queue.service.ts`)

- Mantener cola `'build'`.
- Añadir método `addBuildJob(serviceId, gitUrl, branch)` existente.
- No encolar `deploy` todavía (fase 4).

#### BuildService (`apps/core/src/services/deploy/build.service.ts`)

Reemplazar el stub por una implementación real con bordes testeables:

- `BuildService` recibe inyectables opcionales para test (`{ exec, docker }`); en producción usa `Bun.spawn` y `dockerode`.
- Método `build(input: BuildInput): Promise<{ success: boolean; log: string }>`:
  1. Determinar `workDir = WORK_DIR/<slug>/<jobId>`.
  2. Ejecutar `git clone --depth 1 --branch <branch> <gitUrl> <workDir>`.
  3. Verificar que existe `<workDir>/Dockerfile`.
  4. Empaquetar el directorio como tar stream y llamar a `docker.buildImage` con tag `wisp/<slug>:<jobId>`.
  5. Capturar stream de salida de Docker y acumular en `log`.
  6. Al finalizar, taggear como `wisp/<slug>:latest` si fue exitoso.
  7. Limpiar `<workDir>` siempre (try/finally).
  8. Devolver `{ success, log }`.

Errores mapeados a job `failed`:

- Repo no accesible / `git clone` falla.
- No existe `Dockerfile`.
- `docker build` devuelve error.
- Worker crash: BullMQ no hará retry en v1; el job queda `failed` por timeout/excepción.

#### Build worker (`apps/core/src/queue/build.worker.ts`)

- Recibir `db: DatabaseClient` además de `redis`.
- Antes de procesar: actualizar `jobs.status = 'running'`.
- Después de procesar: actualizar `jobs.status = 'success' | 'failed'`, `jobs.logOutput = log`.
- Actualizar `services.status`: `pending → building` al inicio; `building → error` si falla. En éxito dejar `building` (fase 4 lo pasará a `running`).

#### Cableado en `apps/core/src/index.ts`

- Crear `createBuildWorker(redis, db)` tras inicializar Elysia.
- Guardar referencia al worker para llamar `worker.close()` al recibir `SIGTERM` / `SIGINT`.
- Cerrar también el servidor Elysia (`app.stop()`) y luego el worker.

#### Infra

- Ningún cambio en compose. Se asume que el daemon Docker es accesible en `DOCKER_SOCKET` (ya montado en `infra/docker/dev.yml` y `prod.yml`).

## Acceptance criteria

1. **Given** un servicio creado, **when** `POST /deploy` devuelve 201, **then** existe un job `build` en estado `pending` en la cola y la tabla `jobs`.
2. **Given** un job de build pendiente, **when** el worker lo procesa, **then** clona el repo, detecta el `Dockerfile`, construye la imagen `wisp/<slug>:<jobId>` y la etiqueta como `wisp/<slug>:latest`.
3. **Given** un build exitoso, **when** finaliza, **then** `jobs.status = 'success'`, `jobs.logOutput` contiene el output de Docker, y `services.status = 'building'` (listo para fase 4).
4. **Given** un repo sin `Dockerfile`, **when** el worker procesa el job, **then** `jobs.status = 'failed'` y `logOutput` indica "Dockerfile not found".
5. **Given** un repo inaccesible o docker build falla, **when** el worker procesa el job, **then** `jobs.status = 'failed'` con el error en `logOutput`, y `services.status = 'error'`.
6. **Given** un usuario autenticado con servicios propios, **when** hace `GET /deploy/:id/jobs`, **then** recibe los jobs ordenados por `createdAt` descendente.
7. **Given** un usuario autenticado que no es dueño del servicio, **when** hace `GET /deploy/:id/jobs`, **then** recibe 403.
8. **Given** el backend corriendo, **when** se envía `SIGTERM`, **then** el worker de build cierra gracefulmente sin dejar jobs bloqueados.

## Implementation checklist

Ordenado por slices verdes mínimos.

- [x] Config: añadir `WORK_DIR` a `apps/core/src/config/index.ts` y `.env.example`.
- [x] Infra: asegurar que `infra/docker/prod.yml` monta `/var/run/docker.sock` y volumen `build-data` para `WORK_DIR`.
- [x] DB: confirmar que `jobs` y `services` cubren estados necesarios (sin migración).
- [x] Backend: refactorizar `BuildService` para soportar inyección de `exec`/`docker` y exponer `build()` real.
- [x] Backend: implementar clon con `git` vía `Bun.spawn` y validar existencia de `Dockerfile`.
- [x] Backend: implementar `docker.buildImage` con tar stream, capturar logs y taggear `latest`.
- [x] Backend: actualizar `DeployService.create` para insertar job `build` y encolarlo.
- [x] Backend: actualizar `QueueService` para aceptar datos de job incluyendo `jobId` y `slug`.
- [x] Backend: actualizar `build.worker.ts` para recibir `db`, actualizar `jobs` y `services` durante ejecución.
- [x] Backend: cablear `createBuildWorker` en `apps/core/src/index.ts` y graceful shutdown.
- [x] Backend: añadir `GET /deploy/:id/jobs` en `apps/core/src/routes/deploy.routes.ts` con ownership.
- [x] Frontend: añadir `DeployService.getJobs()`.
- [x] Frontend: `service-list` ya muestra `status` actualizado con badges.
- [x] Backend tests: unit `BuildService` con `exec` y `docker` mockeados (éxito, sin Dockerfile, docker falla).
- [x] Backend tests: integración `POST /deploy` crea job y encola.
- [x] Backend tests: integración `GET /deploy/:id/jobs` (200 propio, 403 ajeno, 401 sin sesión).
- [x] Verificar gates: `bun run lint`, `bun run check-types`, `bun run test`.
- [x] Actualizar `docs/STATE.md` (cerrar bug #6 — worker cableado; añadir changelog).
- [x] Actualizar este spec: `Status: done`, fecha, y marcar checkboxes.

## Test plan

| Criterio | Tests |
|---|---|
| 1 | Integración: `POST /deploy` → fila `jobs` `pending` + mensaje en cola BullMQ. |
| 2 | Unit: `BuildService.build` con `git` y `docker` mockeados devuelve imagen taggeada. |
| 3 | Integración/Unit: worker actualiza `jobs` a `success` y `services.status` a `building`. |
| 4 | Unit: `BuildService.build` sin `Dockerfile` → `success: false` con mensaje esperado. |
| 5 | Unit/Integración: `git clone` falla o `docker.buildImage` devuelve error → `failed` + `error`. |
| 6 | Integración: `GET /deploy/:id/jobs` lista jobs ordenados. |
| 7 | Integración: `GET /deploy/:id/jobs` de servicio ajeno → 403. |
| 8 | Integración: enviar `SIGTERM` al backend no deja jobs en `running` artificialmente. |

## Risks & edge cases

- **Docker socket no montado:** el worker fallará al llamar a dockerode. Documentar requisito en `STATE.md` y validar en `dockerPlugin` si es posible.
- **Espacio en disco:** cada build clona el repo completo (aunque `--depth 1`). `WORK_DIR` debe limpiarse siempre, incluso ante excepciones.
- **Imágenes huérfanas:** si un build falla tras crear imagen parcial, puede quedar tag `wisp/<slug>:<jobId>`. Aceptable para v1; fase 7 puede añadir `docker image prune`.
- **Concurrencia de builds del mismo servicio:** v1 no rate-limita. Múltiples builds concurrentes sobreescribirán el tag `latest` en orden no determinista. Documentar como known limitation.
- **Seguridad:** se clona repo público con URL arbitraria. Validar que `gitUrl` sea `http(s)://` o `git@` (Elysia ya valida `format: 'uri'`). No ejecutar comandos shell con strings interpolados; usar arrays de argumentos en `Bun.spawn`.
- **Timestamps:** `jobs.createdAt` / `updatedAt` se serializan como ISO-8601 en JSON por el driver actual; confirmar formato en respuesta.
- **Worker no cableado hoy:** implementar shutdown correcto desde el inicio para evitar bug #6.

## Out of scope / follow-ups

- Ejecutar contenedor y routing Caddy (fase 4).
- Página de detalle de servicio con logs en el dashboard (fase 5).
- Webhook de GitHub para redeploy automático (fase 6).
- Cache de builds / layer cache optimizado.
- Buildpacks o autodetección de Dockerfile alternativo.
- Retry policy de BullMQ.
