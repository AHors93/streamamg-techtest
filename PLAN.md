# StreamAMG Media Asset API — Implementation Plan

## Context

Greenfield backend API for the StreamAMG tech assessment. The goal is a simplified RESTful API managing streaming media assets with event-driven state changes. Pragmatism over polish — this is a 2-hour POC, not production infrastructure.

## File Structure

```
src/
  index.ts                    # Server bootstrap
  app.ts                      # Express app setup (separate for testability)
  types/
    asset.ts                  # Zod schemas + inferred TS types
  store/
    asset-store.ts            # In-memory Map<string, Asset>
  services/
    asset-service.ts          # Business logic + status transitions + event emission
  events/
    asset-events.ts           # EventEmitter singleton + event types
    event-handlers.ts         # Downstream side effects (e.g. set URL on processing complete)
  handlers/
    asset-handler.ts          # Thin request → validate → service → response
  routes/
    asset-routes.ts           # CRUD route definitions
    sse-routes.ts             # GET /events SSE stream
  middleware/
    error-handler.ts          # Zod errors → 400, not found → 404, unexpected → 500
tests/
  asset-api.test.ts           # Integration tests (supertest)
  asset-service.test.ts       # Service unit tests
  asset-events.test.ts        # Event system tests
  sse.test.ts                 # SSE endpoint test
```

## Data Model

### Asset Statuses

```
processing → ready → published ↔ unpublished
processing → failed
```

- `processing` — asset uploaded, being prepared
- `ready` — processing complete, can be published
- `published` — live, available to viewers
- `unpublished` — taken down, no longer available
- `failed` — processing failed

### Content Types

`video` | `audio` | `live-stream`

### Asset Fields

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | Auto-generated |
| title | string | Required, 1-255 chars |
| description | string? | Optional, max 1000 chars |
| contentType | ContentType | Required |
| status | AssetStatus | Auto-set to `processing` on create |
| url | string? | Set automatically when processing completes |
| duration | number? | Seconds, set when processing completes |
| createdAt | string (ISO) | Auto-generated |
| updatedAt | string (ISO) | Auto-updated on changes |

### Inputs

**Create:** title + contentType + optional description

**Update:** title?, description?, status? (only `published` or `unpublished` allowed manually)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/assets` | Create asset (starts as `processing`) |
| `GET` | `/assets` | List with optional `?status=` and `?contentType=` filters |
| `GET` | `/assets/:id` | Get single asset |
| `PATCH` | `/assets/:id` | Update title/description or publish/unpublish |
| `DELETE` | `/assets/:id` | Delete asset |
| `POST` | `/assets/:id/process` | Simulate processing → `ready` (or `?fail=true` → `failed`) |
| `GET` | `/events` | SSE stream of all asset state changes |

## Event System

### Architecture

```
Service (state change) → EventEmitter (singleton) → Event Handlers (side effects)
                                                   → SSE Clients (real-time push)
```

### Event Types

- `asset.created` — new asset added
- `asset.updated` — title/description changed
- `asset.processing.complete` — processing finished successfully
- `asset.processing.failed` — processing failed
- `asset.published` — asset went live
- `asset.unpublished` — asset taken down
- `asset.deleted` — asset removed

### SSE Implementation

- `GET /events` sets appropriate headers (`text/event-stream`, `no-cache`, `keep-alive`)
- Connected clients stored in `Set<Response>`
- EventEmitter events forwarded to all connected clients as `data: JSON.stringify(event)\n\n`
- Cleanup on client disconnect via `req.on('close')`

### Downstream Handlers

- On `asset.processing.complete`: auto-set a dummy `url` and `duration` on the asset
- All events logged to console

## Implementation Order

### Step 1: Scaffolding
- `package.json` with deps: express, zod, uuid, typescript, vitest, @types/express, @types/uuid, tsx, supertest, @types/supertest
- `tsconfig.json` — strict mode, ES2022, NodeNext
- `vitest.config.ts` — minimal
- Scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist), `test` (vitest)
- **Verify:** `npm install` + `tsc --noEmit`

### Step 2: Types + Zod Schemas
- `src/types/asset.ts` — all schemas, inferred types, status enum, content type enum
- **Verify:** `tsc --noEmit`

### Step 3: In-Memory Store
- `src/store/asset-store.ts` — class wrapping `Map<string, Asset>`
- Methods: `create`, `getById`, `getAll(filters?)`, `update`, `delete`
- **Verify:** unit tests pass

### Step 4: Event Emitter + Handlers
- `src/events/asset-events.ts` — singleton EventEmitter, event type constants, AssetEvent interface
- `src/events/event-handlers.ts` — register downstream listeners
- **Verify:** event tests pass

### Step 5: Service Layer
- `src/services/asset-service.ts` — business logic
- Methods: `createAsset`, `getAsset`, `listAssets`, `updateAsset`, `deleteAsset`, `processAsset`
- Status transition validation lives here
- Emits events after state changes
- **Verify:** service tests pass

### Step 6: Handlers + Routes + Error Middleware
- `src/handlers/asset-handler.ts` — validate (Zod) → call service → send response
- `src/routes/asset-routes.ts` — wire to Express
- `src/middleware/error-handler.ts` — Zod → 400, not found → 404, unexpected → 500
- **Verify:** integration tests with supertest pass

### Step 7: SSE Endpoint
- `src/routes/sse-routes.ts` — `GET /events` handler
- **Verify:** SSE tests pass

### Step 8: App + Server Entry
- `src/app.ts` — configure Express, mount routes, error handler
- `src/index.ts` — import app, listen, register event handlers
- **Verify:** `npm run dev` + curl endpoints + `npm test` all green

### Step 9: Documentation
- Update `README.md` — setup, architecture, endpoints with curl examples, scaling discussion
- Update `AI_DEVELOPMENT_PROCESS.md` — log all phases
- **Verify:** follow README from scratch

## Key Design Decisions

1. **`app.ts` separate from `index.ts`** — supertest imports `app` without starting a real server
2. **`/assets/:id/process` simulation endpoint** — deterministic testing of event flow, no setTimeout hacks
3. **Status transitions enforced in service only** — store is dumb, handlers are dumb, service owns the rules
4. **Single EventEmitter singleton** — no event bus framework, no abstraction layer
5. **Zod schemas colocated with types** — one file, double duty as validators and type generators
6. **No interface for the store** — one implementation exists, no premature abstraction
7. **SSE over WebSockets** — simpler, unidirectional, right tool for one-way event feeds
