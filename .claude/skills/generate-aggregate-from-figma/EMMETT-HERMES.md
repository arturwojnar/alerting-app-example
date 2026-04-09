# Emmett & HermesJS — Practical Reference

Version constraints: `@event-driven-io/emmett ~0.42.0`, `@chassisjs/hermes ~1.0.0-alpha.16`.

---

## Package Structure

| Package | Role |
|---------|------|
| `@event-driven-io/emmett` | Core types, event store abstraction, command/decider patterns |
| `@event-driven-io/emmett-postgresql` | PostgreSQL event store + Pongo projection helpers |
| `@event-driven-io/pongo` | JSONB document storage client (used directly via `PongoDocument`) |
| `@chassisjs/hermes` | Value Object primitives, utility functions |
| `@event-driven-io/dumbo` | PostgreSQL pool/connection abstraction used by emmett-postgresql |

---

## Core Type Primitives (`@chassisjs/hermes`)

```ts
import type { Flavour, PositiveInteger, NonEmptyString } from '@chassisjs/hermes'

type PatientId = Flavour<string, 'PatientId'>   // nominal typing via brand
type AltLevel  = Flavour<PositiveInteger, 'AltLevel'>
```

- `Flavour<T, Brand>` — nominal type wrapper (same as `Brand` in other frameworks)
- `PositiveInteger` — branded `number` that must be > 0
- `NonEmptyString` — branded `string` that must be non-empty

---

## Utility Functions — Import from `@chassisjs/hermes`, NOT `@event-driven-io/emmett`

**Critical:** `assertNever` and `literalObject` are exported from `@chassisjs/hermes`.
Even though emmett's `.d.ts` re-exports them, `tsc` fails to resolve them from `emmett` at ~0.42.0.

```ts
// ✅ correct
import { assertNever, literalObject } from '@chassisjs/hermes'

// ❌ causes TS2305 at compile time
import { assertNever, literalObject } from '@event-driven-io/emmett'
```

### `assertNever(x: never): never`

Exhaustive switch guard. Put in the `default` branch of every `switch(type)`.

```ts
switch (type) {
  case 'EventA': ...
  default:
    return assertNever(type)  // compile error if a case is missing
}
```

### `literalObject<T>(obj: T): T`

Identity function that forces TypeScript to check the object literal against `T`.
Use it when constructing events to get strict type checking on `data` and `metadata`.

```ts
literalObject<AltSmallALertRaised>({
  type: 'AltSmallALertRaised',
  data: { value, testTakenAt },
  metadata: { alertId },
})
```

---

## Event & Command Types (`@event-driven-io/emmett`)

```ts
import type { Event, Command } from '@event-driven-io/emmett'

// Event<Type, Data, Metadata>
type AltSmallALertRaised = Event<
  'AltSmallALertRaised',
  { value: AltLevel; testTakenAt: Date },
  { alertId: AlertId }
>

// Command<Type, Data, Metadata>
// Default metadata is `undefined` (not `unknown`)
type RaiseAlertsAfterAltResultRegistered = Command<
  'RaiseAlertsAfterAltResultRegistered',
  { value: AltLevel; testTakenAt: Date },
  { patientId: PatientId }
>
```

**`Command` default metadata is `undefined`** — a `Command` with a typed metadata object does NOT
satisfy `Command<string, DefaultRecord, undefined>`. This means `DeciderCommandHandler` cannot
be used when commands have custom metadata.

---

## Write Model Pattern — Decider (`@event-driven-io/emmett`)

```ts
// f(command, state) → events[]
const decide = (command: AlertCommand, state: MyAggregate | null): AlertEvent[] => { ... }

// f(state, event) → new state
const evolve = (state: MyAggregate | null, event: AlertEvent): MyAggregate | null => { ... }

const initialState = (): MyAggregate | null => null
```

### Discriminated union state

Use `status` as the discriminant to make illegal states unrepresentable:

```ts
type MyAggregate =
  | { status: 'ACTIVE'; ... bigAlert: null }
  | { status: 'RESOLVED'; ... bigAlert: BigAlert }
```

### Write model is in-memory only

**Never persist the write model directly.** It is rebuilt from the event stream on every command
via `aggregateStream` (or `CommandHandler`). Only read models/projections are persisted to Pongo.

---

## Command Handler (`@event-driven-io/emmett`)

Use `CommandHandler` (not `DeciderCommandHandler`) when commands have non-`undefined` metadata:

```ts
import { CommandHandler } from '@event-driven-io/emmett'
import type { EventStore } from '@event-driven-io/emmett'

const handler = CommandHandler<MyAggregate | null, AlertEvent>({ evolve, initialState })

const handle = (store: EventStore, patientId: PatientId, command: AlertCommand) =>
  handler(store, `myAggregate-${patientId}`, (state) => decide(command, state))
```

`CommandHandler` takes a lambda `(state) => events` — avoids the `Command` metadata constraint.

### Why NOT `DeciderCommandHandler`

`DeciderCommandHandler<State, CommandType, Event>` constrains `CommandType extends Command<string, DefaultRecord, undefined>`.
Commands with custom metadata (e.g. `{ patientId: PatientId }`) do not satisfy this because
their metadata is not `undefined`.

---

## PostgreSQL Event Store (`@event-driven-io/emmett-postgresql`)

```ts
import { getPostgreSQLEventStore } from '@event-driven-io/emmett-postgresql'

const store = getPostgreSQLEventStore(connectionString)
```

`PostgresReadEventMetadata = ReadEventMetadataWithGlobalPosition` — includes:
- `streamName: string` — the stream the event belongs to
- `globalPosition: bigint`
- `streamPosition: bigint`

---

## Pongo Projections (`@event-driven-io/emmett-postgresql`)

Read models are JSONB documents stored via Pongo. All domain types must be serialised to
plain JSON-compatible types (`string`, `number`, `boolean`, plain objects, arrays).

```ts
import { pongoSingleStreamProjection } from '@event-driven-io/emmett-postgresql'
import type { PostgresReadEventMetadata } from '@event-driven-io/emmett-postgresql'
import type { ReadEvent } from '@event-driven-io/emmett'
import type { PongoDocument } from '@event-driven-io/pongo'
import { assertNever } from '@chassisjs/hermes'

type MyReadModel = PongoDocument & {   // PongoDocument = Record<string, unknown>
  patientId: string                     // all domain types flattened to primitives
  someDate: string                      // Date → ISO 8601 string
}

const projection = pongoSingleStreamProjection<MyReadModel, MyEvent>({
  canHandle: ['EventA', 'EventB'],
  collectionName: 'myCollection',
  getDocumentId: (event) => {
    // patientId is NOT on event metadata in this schema — extract from streamName:
    const streamName = (event.metadata as unknown as { streamName: string }).streamName
    return `doc-${streamName.slice('myStream-'.length)}`
  },
  evolve: (
    doc: MyReadModel | null,
    event: ReadEvent<MyEvent, PostgresReadEventMetadata>,
  ): MyReadModel | null => {
    const current = doc ?? { patientId: '...', ... }
    switch (event.type) {
      case 'EventA': return { ...current, ... }
      default: return assertNever(event.type)
    }
  },
})
```

**`patientId` not on event metadata by default.** Events only carry what's in their `metadata`
type. If `patientId` isn't in the event schema, extract it from `event.metadata.streamName`
(available at runtime via `PostgresReadEventMetadata` but requires a cast since the event type
doesn't declare `streamName` in its own metadata).

---

## Testing (`@event-driven-io/emmett`, `@event-driven-io/emmett-postgresql`)

### decide unit tests — `DeciderSpecification`

```ts
import { DeciderSpecification } from '@event-driven-io/emmett'
import { describe, it, expect } from '@jest/globals'

const spec = DeciderSpecification.for({ decide, evolve, initialState })

spec([/* prior events (givenEvents) */])
  .when(command)
  .then([expectedEvent])         // checks output events
  // or:
  .thenNothingHappened()         // asserts no events emitted
```

- `then()` does partial matching — only check the fields you care about; omit fields you don't.
- Use `expect.any(String)` / `expect.any(Date)` for generated IDs / timestamps.
- For complex state setup with generated values (IDs from prior events), call `decide()` directly
  and use `expect().toHaveLength()` / `expect().toBe()` instead of `spec().then()`.

### projection integration tests — `PostgreSQLProjectionSpec`

Requires a real PostgreSQL database (Testcontainers or `DATABASE_URL`).

```ts
import { PostgreSQLProjectionSpec, eventInStream, expectPongoDocuments } from '@event-driven-io/emmett-postgresql'
import { PostgreSqlContainer } from '@testcontainers/postgresql'

// PostgreSqlContainer requires an image argument:
const container = await new PostgreSqlContainer('postgres:16-alpine').start()
const connectionString = container.getConnectionUri()

const spec = PostgreSQLProjectionSpec.for({ projection, connectionString })

await spec([/* givenEvents */])
  .when([eventInStream('streamName', event)])
  .then(
    expectPongoDocuments
      .fromCollection<MyReadModel>('collectionName')
      .withId(documentId)
      .toBeEqual({ _id: documentId, ... })   // must include _id
  )
```

- `eventInStream(streamName, event)` — wraps an event with a stream name for the projection spec.
- `expectPongoDocuments.fromCollection<Doc>(name).withId(id).toBeEqual(doc)` — asserts exact match.
  The type param `Doc` must extend `PongoDocument | WithId<PongoDocument>`.
  `toBeEqual` argument must include `_id` when the type has it.
- `PostgreSqlContainer(image)` — always pass the image string; constructor requires 1 argument.

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `assertNever`/`literalObject` TS2305 from emmett | Import from `@chassisjs/hermes` |
| `DeciderCommandHandler` type error with metadata commands | Use `CommandHandler` with a lambda instead |
| `patientId` not on event metadata | Extract from `event.metadata.streamName` (cast needed) |
| `noUnusedLocals` error on unexported utility | Export it or prefix with `_` |
| Projection `evolve` has implicit `any` | Annotate params: `(doc: MyDoc \| null, event: ReadEvent<MyEvent, PostgresReadEventMetadata>)` |
| `PostgreSqlContainer()` TS error | Pass image string: `new PostgreSqlContainer('postgres:16-alpine')` |
| `toBeTheSame` not found on expectPongoDocuments | Correct method is `.toBeEqual()` |
| `void` is not iterable | `DeciderSpecification.then()` returns `void` — don't destructure it |
