# AI Development Process

This document captures how AI tooling (Claude Code) and was used throughout this assessment — the prompts, decisions, iterations, and where human judgment was applied.

## Tools Used

- **Claude Code** (CLI) — primary development tool, used for all implementation, testing, and documentation

## Development Log

### Phase 1: Project Setup & Guidelines

**Goal:** Establish a strong foundation before writing any code.

**Prompt summary:** I provided Claude Code with the full tech test brief, and Karpathy-inspired coding principles. I asked it to create a `CLAUDE.md` file that would govern all AI-generated code throughout the project.

**What the AI produced:**
- A `CLAUDE.md` with four core principles (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution)
- Project-specific rules tailored to the assessment (strict TypeScript, Zod validation, SSE over WebSockets, in-memory Map)
- An explicit "What NOT To Do" section to prevent over-engineering

**Human decisions made:**
- I chose to embed the Karpathy guidelines directly into the project rather than installing a generic plugin — more specific, and visible to assessors as an artefact
- I added explicit SOLID/SRP/DRY principles on top of the AI's initial setup, drawing from my own experience across multiple projects and industries
- I chose the tech stack (Express, Vitest, Zod) based on pragmatism — lightweight, no magic, fast tests

**Key insight:** Setting up guardrails *before* writing code meant every subsequent prompt operated within constraints that matched the assessment criteria. The AI couldn't over-engineer because the rules explicitly forbade it.

---

### Phase 2: Architecture Planning

**Goal:** Break down the requirements and design the full system before writing any code.

**Prompt:** *"lets build our backend for frontend, this is how i start any piece of work as in my opinion it forms a solid base from which our frontend can work — lets break down the requirements [pasted requirements] and lets get into plan mode"*

**What the AI produced:**
- A `PLAN.md` file with complete file structure, data model, API endpoints, event system architecture, and implementation order
- Each step had a verification checkpoint (compile check, test suite, manual curl)
- Status transition state machine: `processing → ready → published ↔ unpublished` and `processing → failed`

**Human decisions made:**
- I insisted on plan mode before any code was written — I always start backend work by designing the API layer first, as it forms the contract for any frontend
- I reviewed and approved the plan before implementation began
- The separation into `routes → handlers → services → store` was a deliberate choice: having a centralised service layer means we can test business logic independently of HTTP, and if we scale to Lambda or other runtimes in the future, the service layer lifts out cleanly. It also makes it trivial to pinpoint failure points on APIs vs business logic vs storage

**Key insight:** The service layer as the single source of truth for business rules (especially status transitions) means the store stays dumb and handlers stay thin. This is how I've structured production systems — when something breaks, you know exactly which layer to look at.

---

### Phase 3: Implementation

**Goal:** Build the full backend following the plan, bottom-up.

**Prompt:** After plan approval, the AI executed the implementation steps in order. No additional prompting was needed — the `CLAUDE.md` and `PLAN.md` provided sufficient constraints.

**Implementation order:**
1. Scaffolding — `package.json`, `tsconfig.json` (strict mode), `vitest.config.ts`
2. Types + Zod schemas — single file, schemas double as runtime validators and TS type generators
3. In-memory store — `Map<string, Asset>` wrapper with filtering
4. Event emitter + downstream handlers — singleton `EventEmitter`, auto-assigns URL on processing complete
5. Service layer — business logic, status transition validation, event emission
6. Handlers + routes + error middleware — thin HTTP translation with Zod validation
7. SSE endpoint — `Set<Response>` of clients, cleanup on disconnect
8. App entry — `createApp()` factory for testability

**What the AI got right first time:**
- Clean layer separation — each file has a single responsibility
- Zod validation on all inputs with structured error responses
- Status transition enforcement in the service layer only
- `createApp()` factory pattern so supertest can import without starting a server
- 43 tests across 4 test files, all passing on first run

**What needed fixing:**
- TypeScript strict mode flagged `req.params.id` as `string | string[]` with newer Express types — the AI fixed this by using typed request params (`Request<{ id: string }>`)
- EventEmitter listener leak warning in tests due to the singleton being shared across `createApp()` calls — fixed by raising `maxListeners` (appropriate for a test environment with a shared singleton)

**Human decisions made:**
- I validated the test output and confirmed the approach was correct
- I noted that the centralised service pattern is excellent for future scalability — if we moved to Lambda, the service layer could be tested independently and reused across different entry points

---

### Phase 4: Audit Log — Strengthening the Event-Driven Requirement

**Goal:** The brief calls for *"asset updates triggering downstream actions"*. Our initial implementation had URL assignment and console logging as downstream actions. I reviewed the requirements and identified this as an area to strengthen with a tangible, queryable feature.

**Prompt:** *"yes, lets implement this to cover one of the key requirements"* — after the AI identified that the downstream event-driven action was thin and proposed an audit log.

**What the AI produced:**
- `AuditStore` — simple in-memory log with `add()` and `getByAssetId()`
- Updated `event-handlers.ts` — every event type now writes an audit entry with asset ID, action, timestamp, title, and status
- `GET /assets/:id/history` endpoint — returns the full audit trail for an asset
- 4 new tests (event-level audit recording + API integration)

**Human decisions made:**
- I identified the gap in the requirements coverage — the AI flagged it, but I made the call to implement it
- The audit log demonstrates real decoupling: the service doesn't know about the audit log, it just emits events. The event handler records the state change independently. This is exactly how you'd build an audit system in production — the business logic layer should never be coupled to observability concerns

**Key insight:** Reviewing requirements against implementation mid-build caught a gap that would have weakened the submission. The event system went from "it logs to console" to "it drives a queryable audit trail" — a much stronger demonstration of the event-driven pattern.

---

### Phase 5: Test Console & Manual Testing

**Goal:** Build a visual way to test the full API lifecycle and verify SSE works in a real browser, not just in unit tests.

**Prompt:** *lets build a small front end to help with our testing, we dont need to build any complex react frontends, a basic html file will suffice for this"*

**What the AI produced:**
- A single `public/index.html` — no React, no build tools, no dependencies
- Dark-themed test console with: create form, asset list with filtering, action buttons (process/publish/unpublish/delete/history), live SSE event feed
- Express static middleware to serve it at `http://localhost:3000`

**Human decisions made:**
- I asked for this specifically as a testing tool, not a frontend feature — the goal was to verify SSE multi-client behaviour and make the full lifecycle clickable
- I confirmed SSE fan-out works across two browser tabs — both receive events when one tab triggers an action

**What the AI then produced:**
- `TESTING.md` — 7 structured testing paths covering happy path, failure cases, invalid transitions, filtering, deletion, validation errors, and SSE multi-client
- Ran all 7 paths programmatically via curl, confirming every one passes

**Key insight:** The test console proved its worth immediately — it caught that SSE actually works in a browser (not just in a Node.js test with raw HTTP). Two tabs both receiving the same `asset.created` event is a much more convincing demo of the event-driven architecture than a unit test assertion.

---

### Phase 6: Scaling Discussion

**Goal:** The brief asks to *"briefly describe how your solution could scale during peak usage periods"*.

**Prompt:** *"now lets focus on how we would scale this. This is super important"*

**What the AI produced:**
- A complete rewrite of the scaling section, structured around specific bottlenecks rather than generic technology lists
- Each subsection names the bottleneck, explains why it breaks, proposes a solution, and discusses the trade-off
- Covers: database choice (Postgres vs DynamoDB with rationale for hybrid), event system (SNS/SQS vs Kafka with throughput thresholds), caching (Redis + CDN with cache invalidation strategy), SSE connection limits (API Gateway WebSocket vs managed push services), thundering herd on publish, and horizontal scaling with pre-warming

**Human decisions made:**
- The AI's initial version was decent but generic. The rewrite is structured around "what actually breaks and why" rather than "technologies you could use"
- I validated the technical accuracy against my own production experience — connection pooling limits, PgBouncer memory costs, the SNS/SQS vs Kafka decision point, pre-warming before scheduled events

**Key insight:** Structuring the scaling discussion around bottlenecks rather than solutions demonstrates that you understand *why* systems fail at scale, not just which AWS services exist. Anyone can list Redis/Kafka/DynamoDB — the value is knowing when each is the right (and wrong) choice.

---

### Phase 7: Code Quality Gates

**Goal:** Ensure every commit is linted, type-checked, and tested before it lands.

**Prompt:** *"So every commit gets linted, type-checked, and tested before it goes through. No other hook systems — just Husky."*

**What the AI produced:**
- ESLint with `typescript-eslint` strict config
- `npm run validate` script chaining `lint → typecheck → test`
- Husky pre-commit hook running `npm run validate`
- Caught one unused variable (`store` in `asset-api.test.ts`) that the linter flagged — fixed immediately

**Human decisions made:**
- I specified Husky specifically — no lefthook, no .githooks, just Husky. It's the standard and assessors will recognise it immediately
- The `validate` script running all three checks in sequence means a single failing step blocks the commit

---

### Phase 8: Final Requirements Audit

**Goal:** Cross-reference every requirement from the brief against the implementation before submission.

**Prompt:** *"one last time before i submit this to the client — how do we shape up against the tech test requirements?"*

**What the AI produced:**
- A full audit table mapping every requirement to its implementation
- Identified one gap: the AI_DEVELOPMENT_PROCESS.md was missing a summary of where AI helped most vs where human judgment was needed

**Human decisions made:**
- I asked for this audit — the AI didn't proactively suggest it. Checking requirements before submission is a habit from production work: you don't ship without verifying acceptance criteria

---

## Summary: Where AI Helped Most vs Where I Took Over

### Where AI excelled
- **Scaffolding and boilerplate** — project setup, tsconfig, vitest config, package.json. This is exactly the kind of work AI should do: correct, tedious, and low-judgment
- **Implementation speed** — the full layered architecture (10 source files, 4 test files) was generated in a single pass. The code was clean, followed the constraints in CLAUDE.md, and compiled first time
- **Test generation** — 47 tests covering happy paths, edge cases, and integration scenarios. The AI understood supertest patterns and wrote meaningful assertions, not just boilerplate
- **Documentation structure** — README layout, curl examples, response formats. The AI produced clear, consistent documentation that matched the brief's requirements

### Where I directed and took over
- **Guardrails before code** — I set up CLAUDE.md with Karpathy principles and project-specific rules *before* any implementation. This was the most impactful decision: it constrained every prompt and prevented over-engineering
- **Architecture decisions** — I chose the layered separation (routes → handlers → services → store) based on my experience with production systems. The centralised service pattern was my call — it enables Lambda migration, isolated testing, and clear failure point identification
- **Requirements gap analysis** — I spotted that the event-driven downstream action was weak (just console logging) and pushed for the audit log. The AI flagged it but I made the judgment call to implement it
- **Scaling section quality** — the AI's first pass was generic technology lists. I pushed for bottleneck-specific analysis with real numbers (connection pooling costs, SSE connection limits, pre-warming timelines). This came from production experience, not AI generation
- **Testing strategy** — I asked for the browser test console and SSE multi-client verification. The AI wouldn't have built a visual testing tool unprompted — it came from my instinct that proving SSE works in a real browser is more convincing than a unit test assertion
- **Swagger pushback** — I asked about adding Swagger for API docs. The AI pushed back suggesting that time was better spent on real code implementation rather than loads of documentation, as well as sticking to the time. This was a good example of the AI applying the constraints I'd set in CLAUDE.md — it passsed the test!

### The collaboration pattern
The most effective pattern was: **I set constraints and direction, the AI executed within them.** The CLAUDE.md file was the single most valuable artefact — it turned every prompt into a constrained problem rather than an open-ended one. Without it, the AI would have over-engineered. With it, every file traced back to a requirement. I have found that without this, it can go a bit nuts and sometimes get caught in some wild loops and gets a bit stuck.

### Some further notes on this
So I've gone into quite a lot of depth in this md file, with the help of Claude. Reason being, is that I really think that right now for me at least, Claude is another senior engineer sat next to me at all times, giving 100% 24/7. In the last few months, I've been able to ship a fully working Typescript, AWS and React Native app to the App Store, and I am able to release another, all with the help of Claude. It's taken a fair bit of tweaking for me to 'harness' this tool, but I think I've got it into a position where it absolutely flies. I've found this to be almost honestly insane when it comes to contraints on Claude and how you could set it up - https://github.com/forrestchang/andrej-karpathy-skills

I've followed Andrej on Twitter for a while (I hate calling it X), and is followed and seems to well respected by a lot of developers in the space, so I from my point of view seems to have good credit. Someone has created this off the back of his principles and I used it in my 2 other projects to build what I would argue are truly solid applications that will keep costs efficient, had the foundations laid to scale to millions (big dreams!) and generally backed up principles that I've picked up off others in my career so far. 

One thing I would like to highlight is my prompts. Now in my other projects I have been more specific and detailed because I was working with a much larger codebase. However for this one, by checking in at each checkpoint, referencing the requirements regularly and setting up Claude.md in a way that works well for me, it allowed for what I would describe as a smooth set up across the board.
