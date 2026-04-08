# TypeScript Type Conventions

## Imports

```ts
import type { PositiveInteger, NonEmptyString } from '@chassisjs/hermes'
import type { DeepReadonly, Flavour, Command, Event } from '@event-driven-io/emmett'
```

## Value Objects — Flavour / Brand types

Use `Flavour` to distinguish primitives with different domain meanings:

```ts
type PatientId   = Flavour<string, 'PatientId'>
type DoctorId    = Flavour<string, 'DoctorId'>
type AlertId     = Flavour<string, 'AlertId'>
type AltLevel    = Flavour<PositiveInteger, 'AltLevel'>
```

Use `NonEmptyString` for strings that must be non-empty:
```ts
type EMail = NonEmptyString<'EMail'>
```

Parse and validate at system boundaries:
```ts
class InvalidAltLevel extends Error {}

const parseAltLevel = (value: number): AltLevel => {
  if (!Number.isInteger(value) || value < 0) throw new InvalidAltLevel()
  return value as AltLevel
}
```

## Domain types — DeepReadonly + union of types

Wrap domain object types in `DeepReadonly`. Use **unions instead of merged objects** to
represent different states:

```ts
type AltSmallAlert = DeepReadonly<{
  alertId: AlertId
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  value: AltLevel
}>
type FibrosisLevelSmallAlert = DeepReadonly<{
  alertId: AlertId
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  value: FibrosisLevel
}>
type SmallAlert = AltSmallAlert | FibrosisLevelSmallAlert
```

## Write model — discriminated union for state machine

Encode impossible states as unrepresentable types. Tuple lengths are the discriminant:

```ts
type AlertPair = [AltSmallAlert, FibrosisLevelSmallAlert]

type LiverCancerRiskMonitor =
  | { pairs: [];                    bigAlert: null }
  | { pairs: [AlertPair];           bigAlert: null }
  | { pairs: [AlertPair, AlertPair]; bigAlert: null }
  | { pairs: [AlertPair, AlertPair, AlertPair]; bigAlert: LiverCancerRiskBigAlert }
```

## Commands

```ts
type RaiseAlert = Command<
  'RaiseAlert',
  { value: AltLevel; testResultId: TestResultId; takenAt: Date },  // data: business payload
  { patientId: PatientId }                                          // metadata: context
>
type AlertCommand = RaiseAlert | ResolveAlert   // union for exhaustive switch
```

## Events

```ts
type AlertRaised = Event<
  'AlertRaised',
  { value: AltLevel; takenAt: Date },           // data: what happened
  { alertId: AlertId; patientId: PatientId }    // metadata: context
>
type AlertEvent = AlertRaised | AlertResolved   // union for exhaustive switch
```

## Rules

- No `any`
- No merged objects — use union types
- Suggest timestamps and cross-entity IDs that green sticky notes omit
- All suggested fields must be annotated `// AI-suggested. Confirm.` in spec.md first
- `assertNever` can be imported from `@chassisjs/hermes` (>= `1.0.0-alpha.16`)

## Read model types (Pongo JSONB)

Read models are stored as JSONB in PostgreSQL via Pongo. Their types must:
- Extend `PongoDocument` (from `@event-driven-io/pongo`) — adds `_id: string`
- Be plain JSON-serialisable objects: no class instances, no `Symbol`, no functions
- Use `string` for dates at rest (store as ISO 8601), not `Date`
- Use `string` for Flavour/Brand ID types at rest (JSONB has no branded types)

```ts
import type { PongoDocument } from '@event-driven-io/pongo'

// Write model — in-memory only, uses domain types (Date, Flavour, DeepReadonly)
type LiverCancerRiskMonitor = DeepReadonly<{ ... }>

// Read model — Pongo JSONB document, uses plain serialisable types
type LiverCancerRiskReadModel = PongoDocument & {
  patientId: string          // plain string, not PatientId Flavour
  raisedAt: string           // ISO 8601, not Date
  bigAlert: { ... } | null
}
```