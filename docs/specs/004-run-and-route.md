# 004 — Run Containers & Caddy Routing

- **Status:** done
- **Owner approval:** approved
- **Created:** 2026-08-06 · **Updated:** 2026-08-06
- **Depends on:** 003 (build pipeline)

## Problem

Phase 3 construye imágenes Docker pero no las ejecuta. Tras un build exitoso, el servicio queda en `building` para siempre. No hay forma de correr el contenedor, registrar una ruta en Caddy, ni detener/reiniciar/eliminar un servicio. `CaddyEngine` lanza `Not implemented`.

Sin esta fase, Wisp construye imágenes que nadie usa.

## Goals

- Tras un build exitoso, Wisp corre el contenedor y registra una ruta en Caddy para que sea accesible vía `http://<slug>.localhost` (dev) / `https://<slug>.<domain>` (prod).
- El servicio transiciona a `running` cuando el contenedor está activo.
- Acciones de servicio: stop, start, delete (con cleanup de contenedor + ruta + filas DB).
- Redeploy reemplaza el contenedor (stop + rm + run nueva imagen).
- Caddy admin API expuesta en la red Docker para configuración dinámica.

## Non-goals

- Zero-downtime deploys (v1 reemplaza contenedor, hay downtime breve).
- Health checks del contenedor (Caddy hace retry; si el contenedor muere, Docker lo reinicia con `unless-stopped`).
- Multi-container / docker-compose por servicio (v1: un contenedor por servicio).
- TLS custom por servicio (Caddy maneja HTTPS automático con dominio real).
- Service port configuration UI (se detecta del Dockerfile `EXPOSE`; fallback `PORT` env var).
- Dashboard UI para stop/start/delete (Phase 5).

## User story

Como usuario de Wisp, quiero que mi servicio construido se ejecute automáticamente y sea accesible vía URL, para poder usarlo sin tocar SSH ni Docker manualmente.

## Design

### API contracts

#### `POST /deploy/:id/stop` (nuevo)

- Auth: session cookie + ownership.
- Success: `200 OK`
  ```json
  { "ok": true }
  ```
- Detiene el contenedor `wisp-<slug>`, remueve la ruta de Caddy, actualiza servicio a `stopped`.
- Errors:
  - `401` UnauthorizedError
  - `403` ForbiddenError
  - `404` NotFoundError

#### `POST /deploy/:id/start` (nuevo)

- Auth: session cookie + ownership.
- Success: `200 OK`
  ```json
  { "ok": true }
  ```
- Corre el contenedor `wisp-<slug>` (imagen `wisp/<slug>:latest`), registra ruta en Caddy, actualiza servicio a `running`.
- Errors:
  - `401` UnauthorizedError
  - `403` ForbiddenError
  - `404` NotFoundError

#### `DELETE /deploy/:id` (nuevo)

- Auth: session cookie + ownership.
- Success: `200 OK`
  ```json
  { "ok": true }
  ```
- Detiene y remueve contenedor, remueve ruta de Caddy, elimina jobs y servicio de DB.
- Errors:
  - `401` UnauthorizedError
  - `403` ForbiddenError
  - `404` NotFoundError

#### `POST /deploy/:id/redeploy` (nuevo)

- Auth: session cookie + ownership.
- Success: `200 OK`
  ```json
  { "id": "string" }
  ```
- Inserta nuevo job `build`, encola, y al completarse el build el deploy worker reemplaza el contenedor.
- Errors:
  - `401` UnauthorizedError
  - `403` ForbiddenError
  - `404` NotFoundError

### DB changes

#### Schema: `services` table

Añadir columna `port` (nullable integer):

```ts
port: integer('port'),
```

- Si el Dockerfile tiene `EXPOSE`, se detecta del image inspect.
- Si no, fallback a `port` configurado manualmente (futuro).
- Si ninguno, error al deployar.

Migración generada con `bun run db:generate`.

### Backend changes

#### `apps/core/src/config/index.ts` + `.env.example`

- `WISP_DOMAIN` (default `localhost` en dev).
- `CADDY_ADMIN_URL` (default `http://localhost:2019`).
- `DOCKER_NETWORK` (default `wisp-net`).

#### `apps/core/src/engine/caddy.engine.ts`

Reemplazar stub. Usa Caddy admin API (`:2019`).

- `addRoute(domain: string, target: string): Promise<void>`
  - `POST /config/apps/http/servers/srv0/routes` con match de host + reverse_proxy al target.
  - Idempotente: si la ruta ya existe, no hace nada.
- `removeRoute(domain: string): Promise<void>`
  - `DELETE /config/apps/http/servers/srv0/routes/<index>` o busca por match y elimina.
- Constructor recibe `caddyAdminUrl: string`.

#### `apps/core/src/engine/container.engine.ts` (nuevo)

- `runContainer(slug: string, port: number): Promise<string>` — corre `wisp/<slug>:latest` como `wisp-<slug>`, restart `unless-stopped`, red `wisp-net`, expone `port`. Retorna container ID.
- `stopContainer(slug: string): Promise<void>` — stop + remove container `wisp-<slug>`.
- `startContainer(slug: string): Promise<void>` — start container existente.
- `removeContainer(slug: string): Promise<void>` — force remove.
- `getContainerPort(slug: string): Promise<number | null>` — inspect image `wisp/<slug>:latest`, extraer primer `ExposedPorts`.
- Constructor recibe `docker: Dockerode` y `network: string`.

#### `apps/core/src/queue/deploy.worker.ts` (nuevo)

- Escucha cola `'deploy'`.
- Processor:
  1. Extraer `{ serviceId, slug, port }`.
  2. Actualizar service: `status: 'running'` (transitorio, se actualiza al final).
  3. `ContainerEngine.runContainer(slug, port)`.
  4. `CaddyEngine.addRoute(slug.<WISP_DOMAIN>, wisp-<slug>:<port>)`.
  5. Actualizar service: `status: 'running'`.
  6. En error: `status: 'error'`, log.

#### `apps/core/src/queue/build.worker.ts` (modificación)

- Tras build exitoso, encolar job `'deploy'` con `{ serviceId, slug, port }`.
- `port` se detecta del image inspect (`ContainerEngine.getContainerPort`).

#### `apps/core/src/services/queue/queue.service.ts`

- Añadir `addDeployJob(serviceId: string, slug: string, port: number): Promise<string>`.

#### `apps/core/src/services/deploy/deploy.service.ts`

- `stop(serviceId: string)`: `ContainerEngine.stopContainer`, `CaddyEngine.removeRoute`, service `status: 'stopped'`.
- `start(serviceId: string)`: `ContainerEngine.startContainer`, `CaddyEngine.addRoute`, service `status: 'running'`.
- `delete(serviceId: string)`: `ContainerEngine.removeContainer`, `CaddyEngine.removeRoute`, delete jobs + service de DB.
- `redeploy(serviceId: string)`: insertar nuevo job `build`, encolar (el deploy worker reemplaza contenedor al completar).

#### `apps/core/src/routes/deploy.routes.ts`

- Añadir `POST /:id/stop`, `POST /:id/start`, `DELETE /:id`, `POST /:id/redeploy`.
- Todas con auth + ownership.

#### `apps/core/src/index.ts`

- Instanciar `CaddyEngine`, `ContainerEngine`.
- Crear `deployWorker` via `createDeployWorker(redis, containerEngine, caddyEngine, db)`.
- Graceful shutdown: `deployWorker.close()`.
- Crear red Docker `wisp-net` si no existe (al boot).

### Frontend changes

Sin cambios en esta fase — las acciones (stop/start/delete/redeploy) estarán disponibles vía API. Phase 5 añade UI.

### Other (infra, config)

#### `infra/docker/dev.yml`

- Exponer Caddy admin API: añadir `"2019:2019"` a puertos de caddy.
- Añadir red `wisp-net` (bridge).

#### `infra/docker/prod.yml`

- Igual: exponer `:2019` y red `wisp-net`.

#### `infra/caddy/Caddyfile.dev`

- Añadir config dinámica: Caddy debe aceptar rutas vía admin API además del Caddyfile estático.
- El Caddyfile actual sirve para el dashboard/API de Wisp; las rutas de servicios se añaden dinámicamente.

## Acceptance criteria

1. **Given** un build exitoso, **when** el deploy worker procesa el job, **then** corre el contenedor `wisp-<slug>`, registra la ruta en Caddy, y el servicio queda en `running`.
2. **Given** un servicio `running`, **when** se hace `curl http://<slug>.localhost`, **then** se recibe la respuesta del contenedor.
3. **Given** un servicio `running`, **when** se hace `POST /deploy/:id/stop`, **then** el contenedor se detiene, la ruta se remueve, y el servicio queda en `stopped`.
4. **Given** un servicio `stopped`, **when** se hace `POST /deploy/:id/start`, **then** el contenedor se reinicia, la ruta se registra, y el servicio queda en `running`.
5. **Given** un servicio existente, **when** se hace `DELETE /deploy/:id`, **then** contenedor, ruta, jobs y servicio se eliminan.
6. **Given** un servicio `running`, **when** se hace `POST /deploy/:id/redeploy`, **then** se encola un nuevo build y al completarse se reemplaza el contenedor.
7. **Given** un usuario no dueño, **when** intenta stop/start/delete/redeploy, **then** recibe 403.

## Implementation checklist

- [x] Config: añadir `WISP_DOMAIN`, `CADDY_ADMIN_URL`, `DOCKER_NETWORK` a `config/index.ts` y `.env.example`.
- [x] DB: añadir columna `port` a `services`, generar migración.
- [x] Backend: reescribir `apps/core/src/engine/caddy.engine.ts` con Caddy admin API.
- [x] Backend: crear `apps/core/src/engine/container.engine.ts`.
- [x] Backend: crear `apps/core/src/queue/deploy.worker.ts`.
- [x] Backend: actualizar `apps/core/src/queue/build.worker.ts` para encolar deploy tras build exitoso.
- [x] Backend: actualizar `apps/core/src/services/queue/queue.service.ts` con `addDeployJob`.
- [x] Backend: actualizar `apps/core/src/services/deploy/deploy.service.ts` con stop/start/delete/redeploy.
- [x] Backend: actualizar `apps/core/src/routes/deploy.routes.ts` con nuevos endpoints.
- [x] Backend: actualizar `apps/core/src/index.ts` — instanciar engines, deploy worker, crear red Docker.
- [x] Infra: actualizar `infra/docker/dev.yml` — exponer `:2019`, red `wisp-net`.
- [x] Infra: actualizar `infra/docker/prod.yml` — igual.
- [x] Tests unitarios: `CaddyEngine` con mocks HTTP, `ContainerEngine` con mocks dockerode.
- [x] Tests integración: stop/start/delete/redeploy endpoints (auth + ownership).
- [x] Verificar gates: `bun run lint`, `bun run check-types`, `bun run test`.
- [x] Actualizar `docs/STATE.md`: mover stubs a "What works", changelog.
- [x] Actualizar este spec: `Status: done`, fecha, checkboxes.

## Test plan

| Criterio | Tests |
|---|---|
| 1 | Unitario: deploy worker corre contenedor + registra ruta |
| 2 | Manual: curl http://<slug>.localhost tras deploy |
| 3 | Integración: POST /:id/stop → 200, service stopped |
| 4 | Integración: POST /:id/start → 200, service running |
| 5 | Integración: DELETE /:id → 200, rows deleted |
| 6 | Integración: POST /:id/redeploy → 200, new job created |
| 7 | Integración: 403 en acciones sin ownership |

## Risks & edge cases

- **Caddy admin API sin autenticación**: en dev está bien; en prod debe protegerse con `admin.enforce_origin` o red interna. Documentar en Phase 7.
- **Puerto no detectado**: si el Dockerfile no tiene `EXPOSE` y no hay `PORT` env, el deploy falla. Error claro en `logOutput`.
- **Red Docker inexistente**: el backend la crea al boot si no existe. Si falla, log y continue (los deploys fallarán con error claro).
- **Contenedor ya existe**: `runContainer` verifica si existe, lo remueve primero (redeploy scenario).
- **Caddy route duplicada**: `addRoute` es idempotente — verifica si existe antes de añadir.
- **Docker socket en contenedor**: en prod el backend corre en contenedor y necesita acceso al socket. Montar `/var/run/docker.sock` — documentar en Phase 7.

## Out of scope / follow-ups

- Zero-downtime deploys (blue/green o rolling).
- Health checks y auto-restart inteligente.
- Multi-container por servicio (docker-compose).
- TLS custom por servicio.
- UI para stop/start/delete/redeploy (Phase 5).
- Logs del contenedor en tiempo real (Phase 5).
- Métricas de contenedor (CPU, RAM).
- Auto-scaling (v1: un VPS, un contenedor por servicio).
