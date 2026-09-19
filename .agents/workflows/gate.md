---
description: Check status against the four build gates in the dossier
---
When the user types `/gate <n>`, verify gate <n> honestly and report pass/fail.

// turbo
1. Run `git log --oneline -20` to see recent work.

Gate 1 (hour 8) — bridge alive:
  - companion indexes a real React repo and writes index.sfx
  - a test payload written on the phone side lands on a branch
  - Verify by running `npm run test:bridge` in companion/

Gate 2 (hour 14) — end-to-end forge:
  - one fixture sketch goes image → JSON → TSX → file in a repo that compiles
  - quality may be poor; the PATH must be complete
  - Verify by running `npm run test:e2e`

Gate 3 (hour 22) — feature freeze:
  - `npm run bench` completes on the 40-sketch set and prints scores
  - no open work in progress on any lane

Gate 4 (hour 27) — demo locked:
  - `npm run demo:check` passes
  - APK built, permissions verified, spare device paired

Report each as PASS or FAIL with the specific failing check. Do not report
PASS on the basis of code existing. Run the verification.

If a gate FAILS, read `docs/CUT-LIST.md` and recommend the next cut.
