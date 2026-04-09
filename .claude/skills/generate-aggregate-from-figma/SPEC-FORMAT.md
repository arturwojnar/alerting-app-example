# Spec Format

Generate or update `spec.md` in the slice folder. Sections in this order:

## 1. Invariants (first section)

```markdown
## Invariants

- Invariant(AC2): ALT > 35 U/L for women / > 45 U/L for men triggers a small alert.
- Invariant(AC4-formula)
  ```
  After three consecutive alarming ALT–fibrosis pairs (≥1 month apart), calculate:
  (patientAge / 70) * (medianFibrosis / 4) * (meanALT / (lastALT + firstALT))
  ```
```

## 2. Commands

One subsection per command. JSON body uses TypeScript types, not values.
Mark AI-suggested fields with a comment.

```markdown
## Commands

### Command(RaiseAlertsAfterAltResultRegistered)
\```json
{
  "data": {
    "value": "AltLevel",
    "testResultId": "TestResultId",   // AI-suggested: traceability. Confirm.
    "testTakenAt": "Date"
  },
  "metadata": {
    "patientId": "PatientId",
    "patientGender": "PatientGender"  // AI-suggested: required for AC2 threshold. Confirm.
  }
}
\```
```

## 3. Events

Same format as Commands.

## 4. Write Models

```markdown
## Write Models

### WriteModel(LiverCancerRiskMonitor)
\```
type LiverCancerRiskMonitor =
  | { pairs: []; bigAlert: null }
  | { pairs: [AlertPair]; bigAlert: null }
  | { pairs: [AlertPair, AlertPair, AlertPair]; bigAlert: LiverCancerRiskBigAlert }
\```
```

Use `WriteModel(A) = WriteModel(B)` when two commands share the same write model.

## 5. Read Models

Same format as Write Models.

## 6. Flow

Wrap all lines in a single code block. One line per command or projection.

**`→`** — sequential causation: one thing triggers the next (command → invariant, invariant → event, event → invariant).
**`|`** — simultaneity: things happen at the same time or are evaluated together:
  - Multiple invariants checked in parallel for the same command/event
  - Multiple events emitted at once
  - Multiple events feeding one read model

```markdown
## Flow

\```
Command(RaiseAlertsAfterAltResultRegistered) → Invariant(AC2) → Event(AltSmallAlertRaised) → Invariant(AC4-formula) → Event(LiverCancerRiskBigAlertRaised)
Command(ResolveAltSmallAlert) → Invariant(AC4-resolve) → Event(AltSmallAlertResolved)
Event(AltSmallAlertRaised) | Event(FibrosisLevelSmallAlertRaised) → ReadModel(PatientAlertSummary)
\```
```

Do not put Write Models in the Flow — they are declared in Write Models section.

## 7. History

One entry per session. Include version label once generated.
If suggested fields were confirmed, change the comment to `// AI-suggested. Confirmed`.

```markdown
## History

- DDMMYYYY-0: Initial spec from FigJam board (node X:Y). Commands/events/write model generated.
  Added patientGender to RaiseAlertsAfterAltResultRegistered (AI-suggested, confirmed).
```

## Annotation rules

| Comment | Meaning |
|---------|---------|
| `// AI-suggested. Confirm.` | Field proposed by AI — user has not yet confirmed |
| `// AI-suggested. Confirmed.` | User confirmed the suggestion |
| `// MISSING in current code — fix required.` | Bug found in existing implementation |
| `// Fix: <description>` | Correction applied (typo, rename, etc.) |
