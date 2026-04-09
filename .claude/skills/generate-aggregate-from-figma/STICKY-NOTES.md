# Interpreting Event Storming Sticky Notes

## Colors

| Color | Meaning |
|-------|---------|
| Blue | Command |
| Orange | Event |
| Green | Read model (state), write model, or event/command body description |
| Yellow | Invariant (business rule / acceptance criterion) |

## Flow direction

Notes flow left → right representing passage of time, with two exceptions:
- A series of orange events stacked vertically = published **simultaneously**, not sequentially.
- Notes joined by arrows = their flows **merge** at the arrow target.

## Green note rules

| Position | Meaning |
|----------|---------|
| Green → Blue | Defines the **command body** (properties). |
| Green → Blue (two greens precede) | First green = event description; second green = **write model** for the command. Text above the second green = write model name. |
| Green → Orange | Defines the **event body** (properties). |
| Orange → Green | The green is a **read/write model update** triggered by the event. |

Green notes show only the crucial fields. Always suggest what else is likely needed (IDs of related entities, timestamps of what happened).

## Yellow invariant rules

Yellow notes appearing between a command and its resulting event(s), or between resulting events, are **invariants** — business rules enforced during command execution.

## Patterns

**Root Aggregate** — one command produces one or more events:
`Command → Invariant(s) → Event(s)`
`f(command, current state) → events`

Multiple commands sharing a single write model = **mutually blocking commands** (result of one affects the other).

Different commands may share the same write model, but before the shared write model the event body sticky notes should be placed.

**Read Model** — one or more events produce a state:
`Event(s) → State`
`f(event, current state) → new state`
