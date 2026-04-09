# Code Patterns

## Data layer: Pongo (PostgreSQL JSONB)

**Pongo** (https://github.com/event-driven-io/Pongo) is the storage layer for all read models
and projections. It stores documents as JSONB in PostgreSQL.

| Layer | Storage | Notes |
|-------|---------|-------|
| Write model (aggregate state) | In-memory only | Rebuilt from event stream on each command via `aggregateStream` — never persisted directly |
| Read models / projections | Pongo JSONB document | Persisted via `pongoSingleStreamProjection` or `pongoMultiStreamProjection` |

Read model types must be JSON-serialisable JSONB objects:
- No class instances, no functions, no `Symbol`
- `Date` fields → store as ISO 8601 string (`string`) or let Pongo handle serialisation
- Prefer flat or shallowly nested plain objects

```ts
import { pongoSingleStreamProjection, pongoMultiStreamProjection } from '@event-driven-io/emmett-postgresql'
import type { PongoDocument } from '@event-driven-io/pongo'
```

## decide.ts

`f(command, state) → events`. One `case` per command. `default` must use `assertNever`.

```ts
import { literalObject, assertNever } from '@chassisjs/hermes'

const decide = (command: AlertCommand, state: LiverCancerRiskMonitor): AlertEvent[] => {
  const { type, data, metadata } = command

  switch (type) {
    case 'RaiseAlertsAfterAltResultRegistered': {
      // check invariants against state, return events
      return [
        objectLiteral<AltSmallAlertRaised>({
          type: 'AltSmallAlertRaised',
          data: { value: data.value, takenAt: data.testTakenAt },
          metadata: { alertId: generateId(), patientId: metadata.patientId },
        }),
      ]
    }
    case 'ResolveAltSmallAlert': {
      if (state.bigAlert !== null) return []   // invariant: locked when big alert raised
      return [
        objectLiteral<AltSmallAlertResolved>({
          type: 'AltSmallAlertResolved',
          data: {},
          metadata: { alertId: metadata.alertId, resolvedBy: metadata.resolvedBy, timestamp: new Date() },
        }),
      ]
    }
    default:
      return assertNever(type)
  }
}

export { decide }
```

## evolve.ts

`f(state, event) → new state`. One `case` per event. `default` must use `assertNever`.
Initial state = `null`; return `null` unchanged for unrecognised state transitions.

```ts
import { literalObject, assertNever } from '@chassisjs/hermes'

const initialState = null

const evolve = (state: LiverCancerRiskMonitor | null, event: AlertEvent): LiverCancerRiskMonitor | null => {
  const { type, data, metadata } = event

  switch (type) {
    case 'AltSmallAlertRaised':
      return objectLiteral<LiverCancerRiskMonitor>({
        patientId: metadata.patientId,
        pairs: state?.pairs ?? [],
        pendingAlt: { alertId: metadata.alertId, value: data.value, timestamp: data.takenAt, patientId: metadata.patientId },
        pendingFibrosis: state?.pendingFibrosis ?? null,
        bigAlert: null,
      })
    case 'AltSmallAlertResolved':
      if (!state) return state
      return objectLiteral<LiverCancerRiskMonitor>({ ...state, pendingAlt: null })
    default:
      return assertNever(type)
  }
}

export { evolve, initialState }
```

## Command handler

Uses `aggregateStream` to load state, calls `decide`, appends events.
One handler per command (or one per tightly related command group).

```ts
import { getEventStore } from '../infrastructure'

const STREAM_PREFIX = 'liverCancerRisk'
const streamName = (patientId: PatientId) => `${STREAM_PREFIX}-${patientId}`

const handleRaiseAlertsAfterAltResultRegistered = async (
  command: RaiseAlertsAfterAltResultRegistered,
) => {
  const store = getEventStore()
  const { metadata } = command

  const { state } = await store.aggregateStream(streamName(metadata.patientId), {
    evolve,
    initialState,
  })

  const events = decide(command, state)
  if (events.length === 0) return

  await store.appendToStream<AlertEvent>(streamName(metadata.patientId), events)
}

export { handleRaiseAlertsAfterAltResultRegistered }
```

See Emmett docs: https://event-driven-io.github.io/emmett/api-reference/commandhandler.html

## Projection (read model)

Read models are **Pongo JSONB documents**. The type must extend `PongoDocument` (adds `_id`).
Use `pongoSingleStreamProjection` when one stream → one document.
Use `pongoMultiStreamProjection` when many streams → one document.

```ts
import { pongoSingleStreamProjection } from '@event-driven-io/emmett-postgresql'
import type { PongoDocument } from '@event-driven-io/pongo'
import { assertNever } from '@chassisjs/hermes'

// Read model type — must be a plain JSON-serialisable object
type LiverCancerRiskReadModel = PongoDocument & {
  patientId: string
  smallAlerts: Array<{ alertId: string; kind: 'ALT' | 'FIBROSIS'; raisedAt: string }>
  bigAlert: { alertId: string; riskLevel: number; raisedAt: string } | null
}

const collectionName = 'liverCancerRiskAlerts'
const getDocumentId = (patientId: PatientId) => `patient-${patientId}`

const liverCancerRiskProjection = pongoSingleStreamProjection<
  LiverCancerRiskReadModel,
  AlertEvent
>({
  canHandle: ['AltSmallAlertRaised', 'FibrosisLevelSmallAlertRaised', 'LiverCancerRiskBigAlertRaised',
              'AltSmallAlertResolved', 'FibrosisLevelSmallAlertResolved', 'LiverCancerRiskBigAlertResolved'],
  collectionName,
  evolve: (state, event) => {
    const { type, data, metadata } = event
    const current = state ?? { patientId: metadata.patientId, smallAlerts: [], bigAlert: null }

    switch (type) {
      case 'AltSmallAlertRaised':
        return { ...current, smallAlerts: [...current.smallAlerts, { alertId: metadata.alertId, kind: 'ALT', raisedAt: data.takenAt.toISOString() }] }
      case 'LiverCancerRiskBigAlertRaised':
        return { ...current, bigAlert: { alertId: metadata.alertId, riskLevel: data.riskLevel, raisedAt: metadata.timestamp.toISOString() } }
      case 'LiverCancerRiskBigAlertResolved':
        return { ...current, bigAlert: null, smallAlerts: [] }
      // handle remaining cases...
      default:
        return assertNever(type)
    }
  },
  getDocumentId: (event) => getDocumentId(event.metadata.patientId),
})

export { liverCancerRiskProjection }
```

See Emmett docs: https://event-driven-io.github.io/emmett/guides/projections.html

## Test spec — decide function

```ts
import { describe, it, expect } from 'vitest'
import { decide } from './decide'

describe('decide: RaiseAlertsAfterAltResultRegistered', () => {
  it('raises AltSmallAlertRaised when ALT exceeds threshold', () => {
    const command: RaiseAlertsAfterAltResultRegistered = { ... }
    const state = null

    const events = decide(command, state)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('AltSmallAlertRaised')
  })

  it('returns no events when ALT is within threshold', () => {
    // ...
  })
})
```

See Emmett testing guide: https://event-driven-io.github.io/emmett/guides/testing.html

## Test spec — projection

```ts
import { ProjectionSpec } from '@event-driven-io/emmett'

ProjectionSpec.for(liverCancerRiskProjection)
  .given([
    { type: 'AltSmallAlertRaised', data: { ... }, metadata: { patientId: 'p1' } },
  ])
  .when({ type: 'FibrosisLevelSmallAlertRaised', data: { ... }, metadata: { patientId: 'p1' } })
  .then({ /* expected read model state */ })
```
