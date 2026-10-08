# 005 — Service Detail: Status, Jobs, Logs, Actions

- **Status:** in-progress
- **Owner approval:** approved
- **Created:** 2026-08-06 · **Updated:** 2026-08-06
- **Depends on:** 003 (build pipeline), 004 (run & route)

## Problem

El dashboard no expone lo que Phase 3 y 4 construyeron. La lista de servicios solo muestra nombre, slug y status badge con un botón "Logs" que lleva a un componente placeholder (`PLACEHOLDER_LOGS = "No logs available"`). No hay página de detalle, no hay acciones (stop/start/delete/redeploy), no hay historial de jobs, y no hay logs del contenedor.

Sin esta fase, el usuario tiene que usar curl o Docker CLI para operar sus servicios.

## Goals

- Página de detalle de servicio (`/deploy/:id`) con status, metadata, acciones, historial de jobs y logs.
- Acciones de servicio (stop, start, delete, redeploy) funcionan desde el dashboard.
- Logs del contenedor accesibles vía API (`GET /deploy/:id/logs`).
- Polling automático mientras el servicio está en estado transicional.
- El componente `LogsComponent` placeholder se reemplaza con datos reales.

## Non-goals

- Tiempo real (SSE/WebSocket) — v1 usa polling cada 3-5s.
- Métricas del contenedor (CPU, RAM).
- Edición de configuración del servicio (nombre, slug, gitUrl, branch).
- Multi-tab UI (todo en una sola página con secciones).
- E2E con build real (se mockea o se usa un repo con build rápido).

## User story

Como usuario de Wisp, quiero ver el estado de mi servicio, su historial de builds, sus logs, y poder detenerlo/reiniciarlo/eliminarlo desde el dashboard, para no tener que usar SSH ni Docker CLI.

## Design

### API contracts

#### `GET /deploy/:id/logs` (nuevo)

- Auth: session cookie + ownership.
- Query params: `lines` (default `200`, max `1000`).
- Success: `200 OK`
  ```json
  {
    "logs": "string"
  }
  ```
  Retorna las últimas N líneas de `docker logs wisp-<slug>`.
- Errors:
  - `401` UnauthorizedError
  - `403` ForbiddenError
  - `404` NotFoundError (servicio o contenedor no existe)

#### Endpoints existentes usados por esta fase

- `GET /deploy/:id` — metadata del servicio (ya existe).
- `GET /deploy/:id/jobs` — historial de jobs (ya existe, Phase 3).
- `POST /deploy/:id/stop` — detener servicio (ya existe, Phase 4).
- `POST /deploy/:id/start` — iniciar servicio (ya existe, Phase 4).
- `DELETE /deploy/:id` — eliminar servicio (ya existe, Phase 4).
- `POST /deploy/:id/redeploy` — redeployar (ya existe, Phase 4).

### DB changes

Sin cambios de schema.

### Backend changes

#### `apps/core/src/services/deploy/deploy.service.ts`

- `getContainerLogs(serviceId: string, lines: number): Promise<string>` — usa `ContainerEngine` para obtener `docker logs wisp-<slug> --tail <lines>`.

#### `apps/core/src/engine/container.engine.ts`

- `getLogs(slug: string, lines: number): Promise<string>` — ejecuta `docker logs` via dockerode `container.logs({ stdout: true, stderr: true, tail: lines })`.

#### `apps/core/src/routes/deploy.routes.ts`

- Añadir `GET /:id/logs` con auth + ownership, query param `lines` (default 200, max 1000).

### Frontend changes

#### `apps/dashboard/src/app/features/deploy/service-detail/service-detail.component.ts` (nuevo)

Componente principal de la página de detalle. Recibe `id` como route input (`input.required<string>()`).

**Secciones:**

1. **Header**: botón "Back to services", nombre del servicio, slug, status badge grande.
2. **Metadata card**: git URL, branch, puerto, creado, última actualización.
3. **Actions card**: botones de acción según status:
   - `running` → Stop, Redeploy, Delete
   - `stopped` → Start, Redeploy, Delete
   - `building` / `pending` → (sin acciones, solo spinner)
   - `error` → Redeploy, Delete
   - Delete con modal de confirmación (o `confirm()` nativo para v1).
4. **Jobs section**: tabla/lista de jobs con tipo, status badge, timestamp. Cada job es expandible para mostrar `logOutput` en `<pre>`.
5. **Container logs section**: terminal-style dark panel (reutiliza el estilo del `LogsComponent` actual) con las últimas líneas de `docker logs`.

**Estado:**
- `service = signal<Service | null>(null)`
- `jobs = signal<Job[]>([])`
- `containerLogs = signal<string>('')`
- `loading = signal(true)`
- `actionLoading = signal<string | null>(null)` — nombre de la acción en progreso.

**Polling:**
- Al cargar: fetch service + jobs + container logs.
- Si `service.status` es `'pending'` o `'building'`: iniciar `setInterval` cada 3s que re-fetch service + jobs.
- Al destruir el componente o cuando status deja de ser transicional: `clearInterval`.

#### `apps/dashboard/src/app/features/deploy/service-detail/service-detail.component.ts` — template

```
<div moveEnter="fade-up">
  <!-- Back link -->
  <!-- Header: name + status badge -->
  <!-- Metadata card -->
  <!-- Actions card -->
  <!-- Jobs section: @for job of jobs -->
  <!-- Container logs section -->
</div>
```

#### `apps/dashboard/src/app/features/deploy/deploy.routes.ts`

- Añadir ruta `:id` → `ServiceDetailComponent`.
- Mantener `:id/logs` como redirect a `:id` (o eliminar y redirigir).

#### `apps/dashboard/src/app/features/deploy/service-list/service-list.component.ts`

- Cambiar el link de cada service card de `[service.id, 'logs']` a `[service.id]` (va a la página de detalle).
- El botón "Logs" se elimina (los logs están en la página de detalle).

#### `apps/dashboard/src/app/features/deploy/logs/logs.component.ts`

- Eliminar o redirigir a la página de detalle. El componente se reemplaza por la sección de logs dentro de `ServiceDetailComponent`.

#### Interfaces compartidas

Mover `Service` interface de `service-list.component.ts` a un archivo compartido (`features/deploy/types.ts` o similar) para reutilizarla en `service-detail.component.ts`. Añadir `port`, `createdAt`, `updatedAt`.

```ts
export interface Service {
  id: string
  name: string
  slug: string
  status: string
  gitUrl: string
  branch?: string
  port?: number
  createdAt?: string
  updatedAt?: string
}

export interface Job {
  id: string
  type: 'build' | 'deploy'
  status: 'pending' | 'running' | 'success' | 'failed'
  serviceId: string
  logOutput: string | null
  createdAt: string
  updatedAt: string
}
```

### Other

Sin cambios en infra/compose.

## Acceptance criteria

1. **Given** un servicio existente, **when** el usuario navega a `/deploy/:id`, **then** ve la página de detalle con status, metadata, jobs y container logs.
2. **Given** un servicio `running`, **when** el usuario hace click en "Stop", **then** el servicio se detiene y el status cambia a `stopped`.
3. **Given** un servicio `stopped`, **when** el usuario hace click en "Start", **then** el servicio se inicia y el status cambia a `running`.
4. **Given** un servicio, **when** el usuario hace click en "Delete" y confirma, **then** el servicio se elimina y el usuario es redirigido a `/deploy`.
5. **Given** un servicio, **when** el usuario hace click en "Redeploy", **then** se encola un nuevo build y el polling muestra el progreso.
6. **Given** un servicio en estado `building`, **when** la página de detalle está abierta, **then** el status y los jobs se actualizan automáticamente cada 3s.
7. **Given** un servicio con contenedor activo, **when** la página de detalle carga, **then** muestra las últimas 200 líneas de `docker logs`.
8. **Given** un servicio con jobs, **when** el usuario expande un job, **then** ve el `logOutput` completo en un bloque `<pre>`.

## Implementation checklist

- [ ] Backend: añadir `getLogs` a `ContainerEngine`.
- [ ] Backend: añadir `getContainerLogs` a `DeployService`.
- [ ] Backend: añadir `GET /deploy/:id/logs` a `deploy.routes.ts`.
- [ ] Backend: tests de integración para `GET /:id/logs` (auth + ownership).
- [ ] Frontend: crear `features/deploy/types.ts` con interfaces `Service` y `Job`.
- [ ] Frontend: actualizar `ServiceListComponent` para usar `types.ts` y link a `/:id`.
- [ ] Frontend: crear `features/deploy/service-detail/service-detail.component.ts`.
- [ ] Frontend: actualizar `deploy.routes.ts` — añadir ruta `:id`.
- [ ] Frontend: eliminar/redirect ruta `:id/logs`.
- [ ] Frontend: eliminar `logs/logs.component.ts` (o redirect).
- [ ] Frontend: tests unitarios de `ServiceDetailComponent`.
- [ ] E2E: navegar a service detail, ver jobs, expandir log, click stop/start.
- [ ] Verificar gates: `bun run lint`, `bun run check-types`, `bun run test`, `bun run test:e2e`.
- [ ] Actualizar `docs/STATE.md`: mover stubs a "What works", changelog.
- [ ] Actualizar este spec: `Status: done`, fecha, checkboxes.

## Test plan

| Criterio | Tests |
|---|---|
| 1 | E2E: navegar a `/deploy/:id` → ve metadata + jobs |
| 2 | E2E: click Stop → status cambia a stopped |
| 3 | E2E: click Start → status cambia a running |
| 4 | E2E: click Delete + confirm → redirect a /deploy |
| 5 | Unitario: redeploy llama API y actualiza estado |
| 6 | Unitario: polling se activa en estado transicional |
| 7 | Integración: GET /:id/logs → 200 con logs del contenedor |
| 8 | E2E: expandir job → ve logOutput |

## Risks & edge cases

- **Contenedor no existe**: si el servicio nunca se deployó o fue eliminado, `GET /:id/logs` retorna error claro. El frontend muestra "Container not running".
- **Polling memory leak**: `clearInterval` en `ngOnDestroy` es crítico. Usar `DestroyRef` de Angular.
- **Race conditions en acciones**: si el usuario hace click rápido en Stop + Start, el segundo request puede fallar. `actionLoading` signal deshabilita botones durante la acción.
- **Logs muy grandes**: limitar a 200 líneas por defecto, max 1000. El virtual scroll del `LogsComponent` actual se reutiliza para logs largos.
- **Service no encontrado**: si el ID no existe, mostrar 404 o redirect a lista.

## Out of scope / follow-ups

- Streaming de logs en tiempo real (SSE/WebSocket).
- Métricas del contenedor (CPU, RAM, network).
- Edición de configuración del servicio.
- Búsqueda/filtrado en logs.
- Download de logs como archivo.
- Notificaciones toast al completar acciones.
- Multi-tab UI (overview / jobs / logs / settings).
