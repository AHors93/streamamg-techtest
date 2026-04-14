# CLAUDE.md — StreamAMG Assessment

## Project Context

A simplified RESTful API for managing streaming media assets, built as a technical assessment for StreamAMG. The API demonstrates clean architecture, event-driven patterns, and pragmatic engineering — not over-engineered enterprise infrastructure.

## Tech Stack

- **Runtime**: Node.js with TypeScript (strict mode, zero `any` types)
- **Framework**: Express.js
- **Database**: In-memory (simple Map-based store)
- **Testing**: Vitest
- **Events**: Node.js EventEmitter + Server-Sent Events (SSE) for client consumption
- **Validation**: Zod for runtime input validation

## Core Principles (Karpathy-Inspired)

### 1. Think Before Coding

- State assumptions explicitly before implementing
- Present multiple interpretations when ambiguity exists — don't pick silently
- Push back when a simpler approach exists
- Stop when confused — name what's unclear and ask for clarification
- Never make wrong assumptions and run with them

### 2. Simplicity First

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked
- No abstractions for single-use code
- No "flexibility" or "configurability" that wasn't requested
- No error handling for impossible scenarios
- If 200 lines could be 50, rewrite it
- **The test**: Would a senior engineer say this is overcomplicated? If yes, simplify.

### 3. Surgical Changes

- Touch only what you must
- Don't "improve" adjacent code, comments, or formatting
- Don't refactor things that aren't broken
- Match existing style, even if you'd do it differently
- Every changed line should trace directly to the request

### 4. Goal-Driven Execution

- Define success criteria before implementing
- Transform imperative tasks into verifiable goals
- For multi-step tasks, state a brief plan with verification steps:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  ```
- Loop until verified — don't claim success without proof

## Code Philosophy

- **Single Responsibility** — every file, function, and module does one thing
- **Small, manageable, testable pieces** — if a function is hard to test, it's doing too much
- **SOLID and DRY** — but pragmatically applied, not dogmatically (don't DRY two things into an abstraction prematurely)
- **Senior Full Stack Engineer** - remember you are you a senior full stack engineer with multiple years experience following our code philosophy

## Project-Specific Rules

- All API endpoints must have tests
- Use TypeScript strict mode — zero `any` types
- Runtime validation with Zod on all external inputs (request bodies, query params)
- Clean separation: routes → handlers → services → store
- Event emitter is a thin layer, not an over-abstracted message bus
- SSE over WebSockets — simpler, unidirectional, right tool for the job
- In-memory Map for storage — this is a 2-hour POC, not a production system
- OpenAPI spec is hand-written in `openapi.yaml` and served via Swagger UI at `/docs`. No code-generated specs, no decorator-based auto-generation — the spec is a single readable YAML file
- Tests verify behaviour, not implementation details

## What NOT To Do

- Do NOT over-engineer. No Docker, no AWS SAM, no EventBridge, no Redis implementation
- Do NOT generate mountains of boilerplate docs/config over actual business logic
- Do NOT add abstractions "for future flexibility"
- Do NOT use `any` type — ever
- Do NOT add unnecessary middleware layers
- Do NOT implement features not in the brief

## Assessment Priorities (in order)

1. **Working, clean code** — runs locally, does what it says
2. **Meaningful tests** — not generated boilerplate, actual behaviour coverage
3. **Clear README** — setup, architecture explanation, scaling discussion
4. **AI workflow documentation** — prompts, decisions, iterations in AI_DEVELOPMENT_PROCESS.md
5. **Event-driven component** — SSE endpoint showing asset state changes
