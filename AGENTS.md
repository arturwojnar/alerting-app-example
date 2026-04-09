# AGENTS.md

## Project overview

Medical alerting application built around **Event Sourcing** and the **Decider pattern**. Business capabilities are organised as slices under `src/<capability>/<slice>/`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js, ESM (`"type": "module"`) |
| Language | TypeScript ~6.0, `nodenext` modules, strict mode |
| Web framework | Fastify ~5 |
| Event store | `@event-driven-io/emmett` ~0.42.0 (in-memory + PostgreSQL via `emmett-postgresql`) |
| Read model storage | Pongo (`@event-driven-io/pongo`) — JSONB documents in PostgreSQL |
| Domain primitives | `@chassisjs/hermes` ~1.0.0-alpha.16 — `Flavour`, `assertNever`, `literalObject` |
| Type utilities | `DeepReadonly`, `Command`, `Event`, `Flavour` from `@event-driven-io/emmett` and `@chassisjs/hermes` |
| Database pool | `@event-driven-io/dumbo` (PostgreSQL pool abstraction) |
| Tests | Jest ~30 + `@jest/globals`; projection integration tests use `@testcontainers/postgresql` |
| Config | `dotenv` |

## Slice structure

Each slice follows this file layout:

```
src/<capability>/<slice>/
  type.ts          — domain types (Flavour, DeepReadonly)
  command.ts       — Command<> union
  event.ts         — Event<> union
  decide.ts        — pure f(command, state, context?) → events[]
  evolve.ts        — pure f(state, event) → state; exports initialState
  handler.ts       — CommandHandler wiring; loads read context (e.g. PatientContext)
  patientContext.ts — (where applicable) read model stub for decision context
  projection.ts    — pongoSingleStreamProjection / pongoMultiStreamProjection
  spec.md          — living spec: invariants, commands, events, write/read models, flow, history
  decide.spec.ts   — unit tests for decide
  projection.spec.ts — integration tests (Testcontainers PostgreSQL)
```

## Key conventions

### Types
- Use `DeepReadonly<{ ... }>` on **every** domain object type — write model sub-types, each union variant of the write model, alert states, pairs, etc.
- Use `Flavour<T, Brand>` for nominal primitive types (`PatientId`, `AlertId`, `AltLevel`, …).
- Write model union variants are each individually wrapped in `DeepReadonly`.
- Read model types (Pongo) extend `PongoDocument`, use plain serialisable types (`string` for dates and IDs).

### Decide / Evolve
- `decide(command, state, context?) → events[]` — pure, no side effects.
- `evolve(state, event) → state` — pure, export alongside `initialState`.
- `default` branch in every `switch` must call `assertNever(x)` (imported from `@chassisjs/hermes`).
- Use `literalObject<T>(...)` (from `@chassisjs/hermes`) when constructing event/state objects for strict type checking.

### Command handlers
- Use `CommandHandler` (not `DeciderCommandHandler`) — commands carry custom metadata so the stricter overload doesn't apply.
- Fetch any decision context (e.g. `PatientContext`) before calling `decide`.

### Projections
- `pongoSingleStreamProjection` for one-stream → one-document; `pongoMultiStreamProjection` otherwise.
- Extract `patientId` from `event.metadata.streamName` when it is not on the event metadata type (cast via `as unknown as { streamName: string }`).
- String literal fields in spread objects need `as const` when the return type is inferred (no explicit return type annotation).

### Imports
- `assertNever`, `literalObject` → `@chassisjs/hermes` (not `@event-driven-io/emmett`).
- All file imports use `.js` extensions (ESM / `nodenext`).

## Validation

```bash
npx tsc --noEmit       # zero errors required
npx prettier --check src/
```

> ESLint config (`eslint.config.js`) is not yet set up.

## Spec format

Each slice has a `spec.md` following the structure in
`.claude/skills/generate-aggregate-from-figma/SPEC-FORMAT.md`:
Invariants → Commands → Events → Write Models → Read Models → Flow → History.

Flow notation:
- `→` sequential causation (command triggers invariant, invariant triggers event)
- `|` simultaneity (co-evaluated invariants, co-emitted events, multiple events feeding one read model)
