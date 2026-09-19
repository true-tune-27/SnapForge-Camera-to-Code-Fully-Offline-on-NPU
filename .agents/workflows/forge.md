---
description: Run the full offline forge pipeline on a fixture and report timings
---
When the user types `/forge <fixture-name>`:

// turbo
1. `cd renderer && npm run forge -- --fixture bench/fixtures/<fixture-name>.json --index bench/repos/acme-web/index.sfx`
2. Print the generated TSX.
3. `cd bench/repos/acme-web && npx tsc --noEmit` — report pass/fail.
4. Print the stage timing table.
5. If any `unresolved` entries exist in the fixture, confirm they appear as
   `TODO(snapforge)` comments in the output and not as invented components.
