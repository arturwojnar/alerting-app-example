---
name: generate-aggregate-from-figma
description: >
  Generates boilerplate TypeScript code for a Root Aggregate (Decider pattern) from Event
  Storming sticky notes in a FigJam board. Produces types (type.ts), commands (command.ts),
  events (event.ts), decide/evolve functions, command handlers, projections, tests, and a
  spec.md. Use when the user shares a figma.com/board URL, mentions Event Storming, asks to
  generate an aggregate, or references commands/events/write models from a sticky note diagram.
  Do NOT use for general TypeScript questions, non-FigJam Figma files, or projection work
  without a FigJam board.
---

# Generate Aggregate From FigJam

## Workflow

Copy this checklist and track progress:

```
- [ ] 1. Ask for a FigJam selection link if not provided
- [ ] 2. Call get_figjam with the nodeId and fileKey from the URL
- [ ] 3. Read existing files in the target slice folder (if any)
- [ ] 4. Generate / update spec.md — see SPEC-FORMAT.md
- [ ] 5. Ask the user to approve the spec before writing code
- [ ] 6. Write / complete type.ts, command.ts, event.ts — see TYPES.md
- [ ] 7. Write decide.ts and evolve.ts — see PATTERNS.md
- [ ] 8. Write the command handler — see PATTERNS.md
- [ ] 9. Write projections and read models — see PATTERNS.md
- [ ] 10. Write test specs for decide and projections — see PATTERNS.md
- [ ] 11. Run validation (see below) and fix all errors
- [ ] 12. Add version label to the FigJam frame title (format: DDMMYYYY-X, e.g. 07042026-0)
- [ ] 13. (Optional) Ask the user: "Would you like me to update the FigJam sticky notes to reflect the changes applied (e.g. added fields, renamed events, new invariants)?"
```

## Slice folder

Ask the user:
> "What folder name should I use for this slice? It should be a verb-based name matching
> what the aggregate does, e.g. `monitor-liver-cancer-risk`."

Slices live inside a folder representing the business capability (e.g. `src/alerting/`).

## Validation — run after every file change

```bash
npx tsc --noEmit          # zero errors required before continuing
npx eslint src/           # zero lint errors
npx prettier --check src/ # formatting check
```

Fix all errors before moving to the next checklist step.

## Reference files

- **[STICKY-NOTES.md](STICKY-NOTES.md)** — how to interpret Event Storming colors, flow, and invariants from FigJam
- **[TYPES.md](TYPES.md)** — TypeScript conventions: Value Objects, Flavour, DeepReadonly, discriminated unions, Command/Event
- **[PATTERNS.md](PATTERNS.md)** — decide.ts, evolve.ts, command handler, and projection templates
- **[SPEC-FORMAT.md](SPEC-FORMAT.md)** — spec.md section structure, AI-suggested annotation format, history entries
- **[EMMETT-HERMES.md](EMMETT-HERMES.md)** — practical reference: imports, common pitfalls, API surface for emmett ~0.42.0 and hermes ~1.0.0-alpha.16
