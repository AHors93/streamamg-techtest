# StreamAMG Media Asset API

A simplified RESTful API for managing streaming media assets with event-driven state changes.

## Setup & Run

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Run tests
npm test

# Build for production
npm run build && npm start
```

The server starts on `http://localhost:3000` by default (override with `PORT` env var).

A browser-based test console is available at `http://localhost:3000` — it provides a UI for creating assets, triggering state changes, viewing the audit log, and watching SSE events stream in real-time. See [TESTING.md](./TESTING.md) for structured testing paths.

## API Endpoints

### Create Asset

```bash
curl -X POST http://localhost:3000/assets \
  -H "Content-Type: application/json" \
  -d '{"title": "Match Highlights", "contentType": "video", "description": "Premier League highlights"}'
```

Response `201`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Match Highlights",
  "description": "Premier League highlights",
  "contentType": "video",
  "status": "processing",
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:00:00.000Z"
}
```

Response `400` (validation error):
```json
{
  "error": "Validation failed",
  "details": [
    { "path": "title", "message": "Required" },
    { "path": "contentType", "message": "Invalid enum value. Expected 'video' | 'audio' | 'live-stream', received 'podcast'" }
  ]
}
```

### List Assets (with filtering)

```bash
# All assets
curl http://localhost:3000/assets

# Filter by status
curl http://localhost:3000/assets?status=published

# Filter by content type
curl http://localhost:3000/assets?contentType=video

# Both filters
curl "http://localhost:3000/assets?status=ready&contentType=audio"
```

Response `200`:
```json
[
  {
    "id": "550e8400-...",
    "title": "Match Highlights",
    "contentType": "video",
    "status": "published",
    "url": "https://cdn.streamamg.com/media/550e8400-.../playlist.m3u8",
    "duration": 3600,
    "createdAt": "2026-04-13T20:00:00.000Z",
    "updatedAt": "2026-04-13T20:01:00.000Z"
  }
]
```

### Get Single Asset

```bash
curl http://localhost:3000/assets/:id
```

Response `200`:
```json
{
  "id": "550e8400-...",
  "title": "Match Highlights",
  "contentType": "video",
  "status": "ready",
  "url": "https://cdn.streamamg.com/media/550e8400-.../playlist.m3u8",
  "duration": 3600,
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:00:30.000Z"
}
```

Response `404`:
```json
{ "error": "Asset not found" }
```

### Update Asset

```bash
curl -X PATCH http://localhost:3000/assets/:id \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Publish (asset must be in 'ready' status)
curl -X PATCH http://localhost:3000/assets/:id \
  -H "Content-Type: application/json" \
  -d '{"status": "published"}'
```

Response `200`:
```json
{
  "id": "550e8400-...",
  "title": "Updated Title",
  "contentType": "video",
  "status": "published",
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:02:00.000Z"
}
```

Response `409` (invalid status transition):
```json
{ "error": "Invalid status transition: processing → published" }
```

### Delete Asset

```bash
curl -X DELETE http://localhost:3000/assets/:id
```

Response `204`: No content

### Simulate Processing

```bash
# Complete processing (sets status to 'ready', assigns CDN URL)
curl -X POST http://localhost:3000/assets/:id/process

# Simulate failure
curl -X POST http://localhost:3000/assets/:id/process?fail=true
```

Response `200` (success):
```json
{
  "id": "550e8400-...",
  "title": "Match Highlights",
  "contentType": "video",
  "status": "ready",
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:00:30.000Z"
}
```

Response `200` (failure):
```json
{
  "id": "550e8400-...",
  "title": "Match Highlights",
  "contentType": "video",
  "status": "failed",
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:00:30.000Z"
}
```

### Asset History (Audit Log)

```bash
curl http://localhost:3000/assets/:id/history
```

Response `200`:
```json
[
  {
    "assetId": "550e8400-...",
    "action": "asset.created",
    "timestamp": "2026-04-13T20:00:00.000Z",
    "assetTitle": "Match Highlights",
    "details": { "status": "processing" }
  },
  {
    "assetId": "550e8400-...",
    "action": "asset.processing.complete",
    "timestamp": "2026-04-13T20:00:05.000Z",
    "assetTitle": "Match Highlights",
    "details": { "status": "ready" }
  }
]
```

This is a downstream action driven entirely by the event system — every asset state change is recorded automatically via event listeners, demonstrating a real-world use of the event-driven architecture.

### SSE Event Stream

```bash
curl -N http://localhost:3000/events
```

Events are emitted for: `asset.created`, `asset.updated`, `asset.processing.complete`, `asset.processing.failed`, `asset.published`, `asset.unpublished`, `asset.deleted`.

```json
data: {"type":"asset.published","assetId":"550e8400-...","timestamp":"2026-04-13T20:01:00.000Z","data":{...}}
```

## Asset Status Flow

```
processing → ready → published ↔ unpublished
processing → failed
```

- New assets start as `processing`
- `POST /assets/:id/process` simulates transcoding completion (in production, this would be a callback from a transcoding pipeline)
- Only `published`/`unpublished` transitions are allowed via `PATCH` — all other transitions happen through dedicated endpoints
- Invalid transitions return `409 Conflict`

## Key Technical Decisions

- **Express + TypeScript strict mode** — lightweight, widely understood, zero `any` types
- **Zod for runtime validation** — schemas double as TypeScript type generators via `z.infer`, single source of truth for types and offering both build and runtime validation.
- **In-memory Map** — for this 2-hour POC I thought a Map would be the right tool, not SQLite or a fake ORM
- **SSE over WebSockets** — event flow is unidirectional (server → client). SSE is simpler, needs no extra dependencies, and is the right tool for one-way event feeds
- **`createApp()` factory** — separates app configuration from server startup so supertest can test the full HTTP stack without binding a port
- **Service layer owns all business rules** — the store is dumb storage, handlers are dumb HTTP translation. Status transitions, event emission, and validation all live in one place
- **`/assets/:id/process` simulation endpoint** — deterministic testing of the full event flow without `setTimeout` hacks or fake async processing - this is a good article i've used before and was useful for this test - https://medium.com/@promptedmind28/deterministic-software-testing-vs-non-deterministic-llm-agent-testing-what-you-need-to-know-f3abd5f9009d 
- **Audit log as event-driven downstream action** — every state change is recorded via event listeners, not inline in the service. This demonstrates real decoupling: the service doesn't know about the audit log, it just emits events
- **No generated API docs at this point** — curl examples in the README are clearer and more useful than a Swagger spec for a project this size. In the next iteration this is something I would implement as I think it would be useful to have proper docs for this that other team members can reference

## Scaling for Peak Usage

I've gone a little bit ham here on the scaling stuff because, with the help of Claude, I could input my experiences and tools I've used, as well as using Claude to offer alternatives that maybe I'm not so familiar with. Of course, trade-offs could be endless lists, but I've kept it to 3 key points - in-memory state, in-process events and latency under load as to me it seemed these could be certainly some of the more critical parts of a streaming application.

StreamAMG's traffic is spiky — a Premier League kick-off can go from baseline to peak in seconds. Here's how this architecture would evolve, layer by layer, with the specific bottlenecks each change addresses.

### The bottleneck: in-memory state

The first thing that breaks is the in-memory Map. It's single-process, single-instance, and lost on restart. The replacement depends on access patterns:

- **Read-heavy (asset catalogue browsing)**: PostgreSQL with read replicas. Assets are written once, read thousands of times. A primary handles writes, replicas handle reads. Connection pooling (PgBouncer) is critical — Node.js apps under load will exhaust connection limits without it, and each new connection to Postgres costs ~1.3MB of server memory.
- **Write-heavy (live event state changes)**: DynamoDB with on-demand capacity. It handles spiky write throughput without pre-provisioning, and single-digit millisecond latency at any scale. The trade-off is limited query flexibility — I would design around partition keys and GSI's. 

For StreamAMG's use case (catalogue + live state), a hybrid approach makes sense: PostgreSQL for the asset catalogue (complex queries, filtering, joins for future relationships), DynamoDB for real-time state and event logs (high write throughput during live events).

### The bottleneck: in-process events

The `EventEmitter` is synchronous and in-process. If a downstream handler is slow (e.g. CDN cache invalidation takes 200ms), it blocks the response. At scale, this becomes:

**SNS + SQS** The service publishes an event to an SNS topic. Multiple SQS queues subscribe — one for the audit log, one for CDN invalidation, one for analytics, one for push notifications. Each consumer scales independently. If the CDN API is slow, its queue backs up but doesn't affect the API response time or other consumers.

I don't know too much about Kafka as I've never really used it, but I am aware of its capabilities and how it could be useful at scale. SNS/SQS over Kafka for now, and certainly for a project this size. SNS/SQS is managed, requires no cluster ops, and handles the fan-out pattern natively. I think Kafka becomes the right choice when you need ordered event replay (e.g. rebuilding read models from an event stream) or when throughput exceeds ~100k messages/second, which I imagine can happen at peak times. For media asset state changes, even during a major live event, SNS/SQS handles the volume comfortably.

**Dead-letter queues (DLQ)** on each SQS queue catch failures. If the audit log consumer throws 3 times, the message goes to the DLQ for manual inspection rather than being lost. This is critical for compliance and tracking audit entries. This is also for me quite a crictical point for observability, in one of my previous roles at cinch, we could trace finance offer's that fell in to the DLQ at a key drop off point by being alert to a message in the DLQ. It certainly helped us 'save' those orders a lot of the time and ensure the customer got their car. 

### The bottleneck: read latency under load

During a live event, thousands of clients hit `GET /assets` and `GET /assets/:id` simultaneously. The database becomes the bottleneck as well as getting hammered. 

**Redis as a read-through cache**: Cache individual assets by ID with a TTL of 5-10 minutes. Cache invalidation is event-driven — when the service emits `asset.published`, a consumer invalidates the Redis key. This keeps invalidation consistent with the event system rather than requiring a separate cache-busting mechanism.

For list endpoints, caching is harder because filter combinations create a large key space. A possible approach: cache the most common queries (e.g. `status=published&contentType=video`) with a short TTL (30s), and let uncommon filter combinations hit the database. Monitor cache hit rates — if a specific filter combination gets heavy traffic during events, add it to the cache strategy. This in my opinion keeps critical areas of your application running smooth, with a sensible TTL keeping data quite fresh to the consumer. 

**CDN for the API itself**: For read-heavy, slowly-changing data (the asset catalogue), putting CloudFront in front of the API with `Cache-Control` headers is simpler than managing Redis. The trade-off is staleness — you accept that a newly published asset might take 30-60 seconds to appear for all users. For a streaming catalogue (not live state), I would say this is reasonably acceptable.

## Assumptions

- In-memory storage is intentionally ephemeral
- The `/process` endpoint simulates what would be an async transcoding pipeline callback in production
- Content types are limited to `video`, `audio`, `live-stream` — naturally this would likely need to be extended in a production system
- No authentication/authorisation — this is super super important but felt it was out of scope for this 2 hour test
- No pagination on list endpoints — would absolutely be needed at scale but not at current size

## AI Workflow

See [AI_DEVELOPMENT_PROCESS.md](./AI_DEVELOPMENT_PROCESS.md) for detailed documentation of prompts, decisions, and iterations throughout development.
