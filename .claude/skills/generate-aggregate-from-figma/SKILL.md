---
name: generate-aggregate-from-figma
description: Generate a boilerplate code for an Root Aggregate based on Event Storming's sticky notes from FigJam.
---

# Interpret FigJam's sticky notes
- Context: Event Storming
- Green color is a read model (state) or just a event description
- Blue color is a command
- Orange color is an event

## Flow
- Sticky notes flow from left to right, representing, with a few exceptions, the passage of time.
- A series of events, one after another, represents events that are published at the same time, not one after another, so this is an exception to the previous point.
- Notes can point (by arrows) to a single note. It means their flows meet at a common point.

## Events
- When a green note precedes a blue one, then it describes a event and defines the command's body (properties).
- When two green notes preceed a blue one, then the first is a event and the latter is the write model for the command. The write model can also be a code block. A text can be placed above a write model. If so, it's a name of the write model.
- When a green note precedes an orange one, then it describes a event and defines the event's body (properties).
- When a green note comes after an orange one, it means an update of the read/write.
- Green notes do not contain all data, just the crucial ones. Suggest what else is needed (references to other entities, time stamps of what happened).

## Requirements
- Yellow sticky notes can exist between a command and resulting event(s), or between resulting events. Then, the yellow sticky notes are invariants (requirements/business logic) handled by the command execution.

## Root aggregate pattern
- A command that is converted into one or multiple events is a Root Aggregate pattern, following the pattern: `command → event(s)`.
- Root aggregate can consist of multiple mutually blocking commands. It means the commands work on a single write model, and the result of one command impacts the result of the other.
- The commands should be wrapped into a separate section.
- A math formula for handling one command is: `f(command, current state) → events`.
- Result events transform the input current state.
- Root aggregate is also a write model.
- Context: Decider Pattern by Jeremie Chassaing (https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider)

## Read model pattern
- An event or events that are converted into a state is a Read Model pattern, following the pattern: `event(s) → state`.
- A math formula of handling one event is: `f(event, current state) → new state` (state machine).

# Generate types
- TypeScript
- Functional approach
- Union of types
- Discriminated Unions
- No `any`
- Types and their constraints shall protect the business logic (invariants).

## Value Objects
- Types serve Value Objects (Domain-Driven Design) and should protect the business logic on a static-type analysis level.
- Use `Flavour`/`Brand` types. Use `Flavour` from `@event-driven-io/emmett` and `NonEmptyString` from `@chassisjs/hermes`. It's to distinguish between e.g. meanings of two strings or two integers.

Examples:
```ts
import type { NonEmptyString } from '@chassisjs/hermes'

export const EMailRegexp = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
export type EMail = NonEmptyString<'EMail'>
export const parseEmail = (value: string) => {
  if (EMailRegexp.test(value)) {
    return value as EMail
  }

  throw new InvalidEMail({ actual: value, expected: value })
}
```
- `PositiveInteger` and other guarded types are defined in `@chassisjs/hermes`.
- Use `DeepReadonly` to model types:
```ts
type AltSmallAlert = DeepReadonly<{
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  value: AltLevel
}>
type FibrosisLevelSmallAlert = DeepReadonly<{
  patientId: PatientId
  testResultId: TestResultId
  timestamp: Date
  value: FibrosisLevel
}>
type SmallAlert = AltSmallAlert | FibrosisLevelSmallAlert
```
- Use unions instead of merged objects.
- Use union to describe possible states of a type, so it protects the business logic. In the example below, `bigAlert` is `null` when `smallAlert` array contains either object of `FibrosisLevelSmallAlert` or `AltSmallAlert` type. But when both, it is of `LiverCancerRiskBigAlert` type. Business-wise, it means that only when two alerts are raised, then a big alert can be raised.
```ts
type LiverCancerRiskMonitor =
  | {
      smallAlert: [FibrosisLevelSmallAlert]
      bigAlert: null
    }
  | {
      smallAlert: [AltSmallAlert]
      bigAlert: null
    }
  | {
      smallAlert: [AltSmallAlert, FibrosisLevelSmallAlert]
      bigAlert: LiverCancerRiskBigAlert
    }
```

## Commands and Events
- Use `Command` and `Event` from `@event-driven-io/emmett`.
- Use unions to aggregate related commands and events, so a discriminated unions can be applied.
- Suggest time stamps, or

Examples:
```ts
type CheckForAlerts = Command<
  'CheckForAlerts',
  {
    measurementId: DomainId
  }
>
type PotassiumLevelExceeded = Event<
  'PotassiumLevelExceeded',
  {
    patientId: PatientId
    measurementId: DomainId
    norm: typeof POTASSIUM_HIGH
    raisedAt: Date
  },
  {
    eventId: Sha256<DomainId>
    patientId: PatientId
    alertId: AlertId
    now: Date
  }
>
type AlertCommand = CheckForAlerts | ResolveAlert
type AlertEvent =
  | PotassiumLevelExceeded
  | PotassiumLevelFellBelow
  | AlertResolved
  | PatientAlertResolved
```

# Generate decide and evolve functions
- Context: Decider Pattern, Vertical Slice Architecture.
- A `decide` function is `f(command, current state) → events`.
- The slice code should be placed in a folder representing the slice. Ask the user [ASK_FOLDER_NAME]. The name should correspond to what happens in the aggregate, like `monitor-liver-cancer-risk`. Try to base it on a verb.
- Slices are contained in folders representing business capabilities.
- Each `case` and handled command is a "small" aggregate.
- The `default` of the `switch` shall check whether the whole union has been handled in the `switch` cases by `assertNever`.
- Decider should be created in a `decide.ts` file:
```ts
const decide = (command: ResolveAlert, alert: Alert) => {
  const { status } = alert.data

  switch (status) {
    case 'RESOLVED':
      // Nothing to do. The last alert has been already resolved.
      return []
    case 'NOT_RESOLVED':
      return [
        objectLiteral<AlertResolved>({
          type: 'AlertResolved',
          data: {
            resolvedBy: command.resolvedBy,
            measurementId: alert.measurementId,
            resolvedAt: command.resolveAt,
            comment: command.comment || '',
          },
          metadata: {
            patientId: alert.patientId,
            alertId: alert.alertId,
            now: new Date(),
            eventId: createSha256From([alert.measurementId]),
          },
        }),
      ]
    case 'LAST_RESOLVED':
      return []
    default:
      assertNever(status)
  }
}
```

- Evolve should be created in a `evolve.ts` file:
```ts
const evolveAlert = (state: Alert | null, event: AlertEvent) => {
  const { type, data, metadata } = event

  switch (type) {
    case 'PotassiumLevelExceeded':
    case 'PotassiumLevelFellBelow':
      return objectLiteral<Alert>({
        ...(state || {}),
        status: 'NOT_RESOLVED',
        alertId: metadata.alertId,
        patientId: data.patientId,
        measurementId: data.measurementId,
        raisedAt: data.raisedAt,
        reason: {
          kind: type === 'PotassiumLevelExceeded' ? 'ABOVE_NORM' : 'BELOW_NORM',
          reason: 'IncorrectPotassiumLevel',
        },
      })
    case 'AlertResolved':
      if (!state || state?.status === 'RESOLVED') {
        return state
      }

      return objectLiteral<Alert>({
        ...state,
        status: 'RESOLVED',
        resolvedAt: data.resolvedAt,
        resolvedBy: data.resolvedBy,
        comment: data.comment,
      })
    case 'PatientAlertResolved':
      if (!state || state.status === 'NOT_RESOLVED' || state.status === 'LAST_RESOLVED') {
        return state
      }

      return objectLiteral<Alert>({
        ...state,
        status: 'LAST_RESOLVED',
        resolvedAt: data.resolvedAt,
        measurementIds: data.measurementIds,
      })
    default:
      assertNever(type)
  }
}
```

# Generate a command handler
- Implement using event sourcing with Emmett (https://event-driven-io.github.io/emmett/overview.html).
- See the Emmett's best practices: https://event-driven-io.github.io/emmett/api-reference/eventstore.html#_3-use-aggregatestream-for-commands
- It acts as an application service.
- Emmett makes it easier to define command handlers: https://event-driven-io.github.io/emmett/api-reference/commandhandler.html
- Inside the handler: get the current state, device, then append the events. Handle the concurrency.
- A stream represets the Root Aggregate.

Example:
```ts
// Inside a command handler...
const { data } = command

logger.info(command, `[handleResolveAlert] start`)

// get the current state
const { state } = await eventStore.aggregateStream(ALERTS_STREAM_NAME, {
  evolve,
  {},
});

// decide
const events = decide(command, alert)

// save result events
await eventStore.appendToStream<AlertEvent>(
  getStreamName(ALERTS_STREAM_NAME, measurementIdIdToStreamId(openAlertId)),
  events,
)

logger.info(command.metadata, `[handleResolveAlert] finish`)
```

# Generate read models based on projections

- Use the Emmett projections: https://event-driven-io.github.io/emmett/guides/projections.html

Example:
```ts
const getDocumentId = (measurementId: DomainId) => `measurement-${measurementId}`

const getEvaluationProjection = (messageBus: InMemoryMessageBus) =>
  pongoSingleStreamProjection<Evaluation, EvaluationEvent>({
    canHandle: ['MeasurementRegisteredSuccessfully', 'GFRCalculated'],
    collectionName,
    evolve: evolve(messageBus),
    getDocumentId: (event) => getDocumentId(event.data.measurementId),
  })
```

# Follow rules for generated code
- Test the generated code with eslint (tsconfig.json) and prettier (code formatting), if exists.

# Generate first a spec (intermediate text representation)

- Generate or update the slice's spec.md file

## Describe sticky notes and flow
- Represent the Root Aggregate based on Event Storming's sticky notes with a text representation.
- Each section represent a specific object
- The `# Events` section:
  - Each event is a separate subsection `## Event([NAME OF ENTITY])`, e.g. `## Event(ResolveAlert)`, which describes the `ResolveAlert` command.
  - In the event subsection place the JSON-formatted (2-spaces) event, like:
  ```json
  {
    alertId: AlertId
    resolvedBy: DoctorId
    resolvedAt: Date      // TODO: AI-suggested. Confirm.
  }
  ```
  - Suggested properties or changes should be explicitly shown as comments as in the above example.
- The `# Commands` section, as it is done for `# Events`.
- The `# WriteModels` section, describing a model used by the Root Aggregate, and representing its input state to aggregated from the event stream (to make a decision). Describe its JSON as for `# Events`.
- It is possible to write down the quality of objects: `WriteModel(A) = WriteModel(B)`.
- The `# ReadModels` section as for `# Events`.
- The `# Invariants` section:
  - Invariant(1)=`Resolves an alert by resolving all small alerts`, or:
  - Invariant(2)
    ```
    Multiple lines
    description of an invariant
    ```
- The section `# Flow` describing sticky notes flow as text:
  - Eeach line represents an object, part of the flow.
  - Example of `ResolveAlert` command, which is a "small" aggregate, its invariants (logic) and output events: `Command(ResolveAlert) → Invariant(1) → Event(SmallAlertResolved) | Event(BigAlertResolved)`
  - If multiple events shall be published, they snall be described as `Event(A) | Event(B) | Event(C)`. The same applies for `Invariant`.
  - Example of creating a read model: `Event(A) | Event(B) | Event(C) → ReadModel(PriorityPatient)`.
- The section `History`:
  - Write an entry shortly describing what happened.

# Generate an actual code
- Ask about a FigJam selection link.
- Generate and/or complete existing files with the types, projections, decide and evolve.
- Generate tests for projections: https://event-driven-io.github.io/emmett/guides/testing.html