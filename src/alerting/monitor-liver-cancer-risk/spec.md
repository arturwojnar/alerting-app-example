## Invariants

- **Invariant(AC2):** ALT > 35 U/L for women / > 45 U/L for men generates a small alert.
- **Invariant(AC3):** Fibrosis levels F1, F2, F3, F4 generate a small alert.
- **Invariant(AC4-formula):** After three consecutive alarming ALT–fibrosis pairs (≥1 month apart):
  ```
  riskLevel = (patientAge / 70) * (medianFibrosis / 4) * (meanALT / (lastALT + firstALT))
  ```
  `patientAge` is derived from `PatientContext.dateOfBirth` at decision time.
- **Invariant(AC4-resolve-small):** Doctor can resolve small alerts only when `status === 'MONITORING'` (blocked when `BIG_ALERT_RAISED`).
- **Invariant(AC3-resolve-big):** Resolving the big alert emits resolved events for all 6 small alerts in the 3 pairs, then the big alert resolved event.

## Commands

### Command(RaiseAlertsAfterAltResultRegistered)

```json
{
  "data": { "value": "AltLevel", "testTakenAt": "Date" },
  "metadata": { "patientId": "PatientId" }
}
```

> `patientGender` and `patientAge` are resolved at command-handler time from `PatientContext` (stub — see patientContext.ts).

### Command(RaiseAlertsAfterFibrosisLevelRegistered)

```json
{
  "data": { "value": "FibrosisLevel", "testTakenAt": "Date" },
  "metadata": { "patientId": "PatientId" }
}
```

### Command(ResolveAltSmallAlert)

```json
{
  "data": {},
  "metadata": {
    "patientId": "PatientId",
    "alertId": "AlertId",
    "resolvedBy": "DoctorId"
  }
}
```

### Command(ResolveFibrosisSmallAlert)

```json
{
  "data": {},
  "metadata": {
    "patientId": "PatientId",
    "alertId": "AlertId",
    "resolvedBy": "DoctorId"
  }
}
```

### Command(ResolveLiverCancerRiskBigAlert)

```json
{
  "data": {},
  "metadata": {
    "patientId": "PatientId",
    "alertId": "AlertId",
    "resolvedBy": "DoctorId"
  }
}
```

## Events

| Event                             | data                                      | metadata                                                                             |
| --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `AltSmallAlertRaised`             | `{ value: AltLevel; takenAt: Date }`      | `{ alertId: AlertId; patientId: PatientId }`                                         |
| `FibrosisSmallAlertRaised`        | `{ value: FibrosisLevel; takenAt: Date }` | `{ alertId: AlertId; patientId: PatientId }`                                         |
| `LiverCancerRiskBigAlertRaised`   | `{ riskLevel: number }`                   | `{ alertId: AlertId; patientId: PatientId; raisedAt: Date }`                         |
| `AltSmallAlertResolved`           | `{}`                                      | `{ alertId: AlertId; patientId: PatientId; resolvedBy: DoctorId; resolvedAt: Date }` |
| `FibrosisSmallAlertResolved`      | `{}`                                      | `{ alertId: AlertId; patientId: PatientId; resolvedBy: DoctorId; resolvedAt: Date }` |
| `LiverCancerRiskBigAlertResolved` | `{}`                                      | `{ alertId: AlertId; patientId: PatientId; resolvedBy: DoctorId; resolvedAt: Date }` |

> FigJam stickies 1:305 and 1:340 appear mislabeled as "…Raised" in the resolve rows — treated as "…Resolved".

## Write Models

### WriteModel(LiverCancerRiskMonitor)

```ts
type AltSmallAlertState = { alertId: AlertId; value: AltLevel; takenAt: Date }
type FibrosisSmallAlertState = {
  alertId: AlertId
  value: FibrosisLevel
  takenAt: Date
}
type AlertPair = { alt: AltSmallAlertState; fibrosis: FibrosisSmallAlertState }
type LiverCancerRiskBigAlert = {
  alertId: AlertId
  riskLevel: number
  raisedAt: Date
}

type LiverCancerRiskMonitor =
  | {
      status: 'MONITORING'
      pairs: AlertPair[]
      pendingAlt: AltSmallAlertState | null
      pendingFibrosis: FibrosisSmallAlertState | null
      bigAlert: null
    }
  | {
      status: 'BIG_ALERT_RAISED'
      pairs: [AlertPair, AlertPair, AlertPair]
      pendingAlt: null
      pendingFibrosis: null
      bigAlert: LiverCancerRiskBigAlert
    }
```

## Read Models

### ReadModel(PatientContext) — stub

```ts
type PatientContext = PongoDocument & {
  patientId: string
  gender: 'male' | 'female'
  dateOfBirth: string // ISO 8601 — age calculated at decision time
}
```

> Stub. Will be a projection consuming patient registration events.

### ReadModel(LiverCancerRiskSummary)

```ts
type LiverCancerRiskSummary = PongoDocument & {
  patientId: string
  status: 'MONITORING' | 'BIG_ALERT_RAISED'
  smallAlerts: Array<{
    alertId: string
    kind: 'ALT' | 'FIBROSIS'
    value: number | string
    takenAt: string
  }>
  bigAlert: { alertId: string; riskLevel: number; raisedAt: string } | null
}
```

## Flow

```
Command(RaiseAlertsAfterAltResultRegistered) → Invariant(AC2) → Event(AltSmallAlertRaised) → Invariant(AC4-formula) → Event(LiverCancerRiskBigAlertRaised)
Command(RaiseAlertsAfterFibrosisLevelRegistered) → Invariant(AC3) → Event(FibrosisSmallAlertRaised) → Invariant(AC4-formula) → Event(LiverCancerRiskBigAlertRaised)
Command(ResolveAltSmallAlert) → Invariant(AC4-resolve-small) → Event(AltSmallAlertResolved)
Command(ResolveFibrosisSmallAlert) → Invariant(AC4-resolve-small) → Event(FibrosisSmallAlertResolved)
Command(ResolveLiverCancerRiskBigAlert) → Invariant(AC3-resolve-big) → Event(AltSmallAlertResolved) | Event(FibrosisSmallAlertResolved) | Event(LiverCancerRiskBigAlertResolved)
Event(AltSmallAlertRaised) | Event(FibrosisSmallAlertRaised) | Event(LiverCancerRiskBigAlertRaised) | Event(AltSmallAlertResolved) | Event(FibrosisSmallAlertResolved) | Event(LiverCancerRiskBigAlertResolved) → ReadModel(LiverCancerRiskSummary)
```

## History

- 09042026-0: Initial spec from FigJam board (node 1:49).
  dateOfBirth stored in PatientContext instead of age (AI-suggested, confirmed).
  patientGender/patientAge resolved from PatientContext stub at handler time, not from command metadata (user decision).
  Board stickies 1:305 and 1:340 treated as Resolved events (appear mislabeled in FigJam).
