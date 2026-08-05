# 004 — Run containers & Caddy routing

- **Status:** done
- **Owner approval:** approved
- **Created:** 2026-08-05 · **Updated:** 2026-08-05
- **Depends on:** [003](003-build-pipeline.md)

## Problem

Wisp ya construye imágenes Docker (`wisp/<slug>:latest`), pero no ejecuta contenedores, no los expone, y no configura Caddy. Un servicio se queda en estado `building` para siempre. No hay forma de detener, iniciar o eliminar un servicio desde la API.

## Goals

- Después de un build exitoso, Wisp ejecuta automáticamente un contenedor con la imagen `wisp/<slug>:latest`.
- El contenedor se nombra `wisp-<slug>`, se conecta a la red Docker `wisp-net`, y expone el puerto que detectemos de la imagen o del servicio.
- Caddy recibe dinámicamente una ruta `slug.<WISP_DOMAIN>` → `wisp-<slug>:<port>` vía su API admin.
- El estado del servicio evoluciona: `building → running → stopped` o `error` si falla.
- Se pueden llamar `POST /deploy/:id/stop`, `POST /deploy/:id/start`, y `DELETE /deploy/:id` (detiene, elimina contenedor, ruta, y filas).
- Un redeploy (nuevo build) reemplaza el contenedor y la ruta sin downtime cero (reemplazo simple).
- Todo tiene tests automatizados.

## Non-goals

- No downtime cero ni rolling deploys.
- No health checks del contenedor ni auto-restart más allá del restart policy de Docker.
- No múltiples réplicas ni balanceo.
- No certificados TLS personalizados: Caddy sigue gestionando HTTPS automáticamente.
- No logs en tiempo real ni SSE (Phase 5).

## User story

Como usuario de Wisp, quiero que mi servicio se ponga en línea automáticamente tras compilar, y poder pararlo, reiniciarlo o borrarlo desde el dashboard, para poder gestionar mis apps sin tocar SSH.

## Design

### API contracts

#### `POST /deploy/:id/stop`

- Auth: session cookie + ownership
- Success: `200 OK` `{ stopped: true }`
- Errors: 401, 403, 404

#### `POST /deploy/:id/start`

- Auth: session cookie + ownership
- Success: `200 OK` `{ started: true }` (encola deploy job)
- Errors: 401, 403, 404, 409 Conflict si ya está corriendo

#### `DELETE /deploy/:id`

- Auth: session cookie + ownership
- Success: `200 OK` `{ deleted: true }`
- Errors: 401, 403, 404

#### `GET /deploy/:id` (cambio menor)

- Incluye `port` en la respuesta (puede ser `null` hasta que se determine).

### DB changes

Añadir columna `port` a `services`:

```ts
port: integer('port'), // nullable
```

Migración generada con `bun run db:generate` (no editar a mano).

### Other (queues, engines, infra, config)

#### Config (`apps/core/src/config/index.ts` + `.env.example`)

- `WISP_DOMAIN`: default `localhost` (dev), dominio real en prod.
- `CADDY_ADMIN_URL`: default `http://localhost:2019` (dev), `http://caddy:2019` en prod.

#### Infra

- `infra/docker/dev.yml`: añadir `caddy` puerto/mapeo `2019:2019` y volumen para config; añadir red `wisp-net` compartida.
- `infra/docker/prod.yml`: igual; `core` y `caddy` deben estar en `wisp-net`.
- Asegurar que `core` puede llegar al socket Docker y a Caddy admin.

#### QueueService

- Añadir `addDeployJob(data: { serviceId, slug, port? })` que encola en cola `'deploy'`.

#### Build worker

- Tras `success`, actualizar `services.port` si Docker nos devuelve `ExposedPorts`.
- Encolar `deploy` job con `serviceId`, `slug`, y `port` determinado.

#### Deploy worker

- Recibe `db` y `runService`.
- Llama `runService.start(serviceId, slug, port)` para ejecutar contenedor + ruta.
- Actualiza `services.status = 'running'` o `'error'`.

#### RunService

- Responsabilidades:
  - Asegurar red Docker `wisp-net`.
  - Crear contenedor `wisp-<slug>` con imagen `wisp/<slug>:latest`.
  - Detectar puerto: primero `services.port`, luego `image.inspect().Config.ExposedPorts`, fallback `3000`.
  - No exponer puerto de host; solo conectar a `wisp-net`.
  - Llamar a `CaddyEngine.addRoute(slug, port)`.
- `stop(serviceId, slug)`: para contenedor y deja `services.status = 'stopped'`; no elimina ruta (aunque podría).
- `remove(serviceId, slug)`: para y elimina contenedor; llama `CaddyEngine.removeRoute(slug)`; elimina filas de `jobs` y `services`.
- `redeploy(serviceId, slug, port)`: si existe contenedor, `stop + remove`, luego `start`.

#### CaddyEngine

- Usa `fetch` contra `${CADDY_ADMIN_URL}/config/apps/http/servers/srv0/routes/<routeId>`.
- `addRoute(slug, port)`: PUT/POST idempotente con handler `reverse_proxy` a `wisp-<slug>:<port>` y host matcher `slug.<WISP_DOMAIN>`.
- `removeRoute(slug)`: DELETE.
- En dev `localhost`, usar `http://slug.localhost` para no requerir DNS.

#### Docker network

- `RunService` asegura `wisp-net` vía `docker.createNetwork({ Name: 'wisp-net', CheckDuplicate: true })` (ignorar si ya existe).
- `core` y `caddy` deben estar en la misma red para que Caddy resuelva `wisp-<slug>`.

## Acceptance criteria

1. **Given** un build exitoso, **when** el worker de deploy procesa el job, **then** existe un contenedor `wisp-<slug>` corriendo en red `wisp-net` y Caddy responde `200` en `http://<slug>.localhost`.
2. **Given** un servicio `running`, **when** se llama `POST /deploy/:id/stop`, **then** el contenedor se detiene y `services.status = 'stopped'`.
3. **Given** un servicio `stopped`, **when** se llama `POST /deploy/:id/start`, **then** se encola un job de deploy y al ejecutarse el contenedor vuelve a correr.
4. **Given** un servicio existente, **when** se llama `DELETE /deploy/:id`, **then** el contenedor se elimina, la ruta de Caddy se borra, y las filas de `services`/`jobs` desaparecen.
5. **Given** un servicio `running` con un nuevo build, **when** el deploy worker procesa el redeploy, **then** el contenedor antiguo se reemplaza por el nuevo y la ruta apunta al mismo puerto.
6. **Given** un usuario autenticado que no es dueño del servicio, **when** intenta start/stop/delete, **then** recibe 403.
7. **Given** el contenedor falla al arrancar, **when** el deploy worker lo intenta, **then** `services.status = 'error'` y el job queda `failed`.

## Implementation checklist

- [x] DB: añadir `services.port` en `packages/db/src/schema/services.ts`.
- [x] DB: generar migración (`bun run db:generate`) y aplicar (`bun run db:migrate`).
- [x] Config: añadir `WISP_DOMAIN` y `CADDY_ADMIN_URL` en `config/index.ts` y `.env.example`.
- [x] Infra: exponer puerto `2019` de Caddy en dev/prod compose y añadir red `wisp-net`.
- [x] Backend: implementar `CaddyEngine` en `apps/core/src/engine/caddy.engine.ts`.
- [x] Backend: implementar `RunService` en `apps/core/src/services/deploy/run.service.ts`.
- [x] Backend: añadir `addDeployJob` a `QueueService`.
- [x] Backend: actualizar `build.worker.ts` para detectar puerto y encolar deploy.
- [x] Backend: implementar `deploy.worker.ts` real usando `RunService`.
- [x] Backend: cablear `createDeployWorker` en `src/index.ts`.
- [x] Backend: añadir endpoints `POST /deploy/:id/stop`, `POST /deploy/:id/start`, `DELETE /deploy/:id` en deploy routes.
- [x] Backend: añadir `DeployService.start/stop/delete`.
- [x] Backend tests: unit `RunService` con docker/Caddy mockeados.
- [x] Backend tests: unit `CaddyEngine` con fetch mockeado.
- [x] Backend tests: integración de start/stop/delete (con mocks).
- [x] Verificar gates: `bun run lint`, `bun run check-types`, `bun run test`, `bun run build`.
- [x] Actualizar `docs/STATE.md` (cerrar stub de deploy worker; añadir changelog).
- [x] Actualizar este spec: `Status: done`, fecha, marcar checkboxes.

## Test plan

| Criterio | Tests |
|---|---|
| 1 | Integración: build success → deploy worker → contenedor + ruta (con mocks) |
| 2 | Integración: `POST /deploy/:id/stop` actualiza status y detiene contenedor |
| 3 | Integración: `POST /deploy/:id/start` encola deploy y worker inicia contenedor |
| 4 | Integración: `DELETE /deploy/:id` elimina contenedor, ruta y filas |
| 5 | Unit: `RunService.redeploy` llama stop+remove+start |
| 6 | Integración: start/stop/delete de servicio ajeno → 403 |
| 7 | Unit/Integración: deploy worker marca `error` ante fallo de contenedor |

## Risks & edge cases

- **Caddy admin API sin auth en dev/prod**: Caddy admin por defecto escucha localhost/2019; en compose se expone en la red. Aceptable para v1 en un VPS single-tenant, pero documentar como hardening pendiente.
- **Puerto no detectable**: fallback a `3000` y posiblemente `services.port` configurable en el futuro.
- **Nombre de contenedor duplicado**: si existe `wisp-<slug>` de otro servicio, `RunService` debe reutilizar/reemplazar según el caso. Usaremos `docker.getContainer` + `remove` si es necesario.
- **Red Docker no existe**: `createNetwork` con `CheckDuplicate` y catch `409`.
- **Ruta de Caddy ya existe**: `addRoute` debe ser idempotente (sobrescribir PUT).

## Out of scope / follow-ups

- Health checks y auto-healing.
- Múltiples dominios o subdominios personalizados.
- Zero-downtime deploys.
- Logs en tiempo real (Phase 5).
- Webhooks (Phase 6).
