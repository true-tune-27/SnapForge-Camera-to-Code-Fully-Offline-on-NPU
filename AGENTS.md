# SnapForge

Camera → on-device AI → a React component inside the user's own repo, delivered
as a git branch. Fully offline. Built for iQOO Hackathon 2026, Developer Tools track.

## Architecture in one paragraph

A phone camera sweeps a whiteboard. OpenCV rectifies 8 frames into a square,
glare-suppressed composite. MediaPipe detects boxes, arrows and text regions.
A 500M vision model (SmolVLM, INT4, on the Hexagon NPU via QNN/Genie) emits
~280 tokens of grammar-constrained layout JSON — NOT code. A deterministic
renderer we wrote converts that JSON into TSX, resolving every node against an
index of the user's real repository that was shipped to the phone over iQOO
Office Kit. The file lands back on the laptop on a new git branch.

## The one rule that defines this project

**No model ever writes code.** Models emit typed, schema-constrained structure.
All source generation is deterministic TypeScript we own and snapshot-test.
If a task appears to require a model to emit TSX, the task is wrong. Stop and ask.

## Repo layout

- `schema/`     — layout.v1 + index.sfx JSON Schemas, generated GBNF. FROZEN.
- `renderer/`   — TS. JSON → TSX. Shared phone + desktop. Snapshot-tested.
- `companion/`  — Node CLI. Indexer, watcher, landing service.
- `android/`    — Kotlin + Compose app.
- `native/`     — C++20. Rectification, glare suppression, grammar sampler.
- `models/`     — conversion scripts, AI Hub configs, committed benchmarks.
- `bench/`      — 40-sketch benchmark set + scoring harness.
- `docs/SPEC.md`— the authoritative spec. Read it before any non-trivial task.

## Non-negotiables

1. `android/app/src/main/AndroidManifest.xml` MUST NOT declare
   `android.permission.INTERNET`. Ever. This is the product's core claim.
   CI fails the build if it appears.
2. Generated TSX must pass `tsc --noEmit` against the host repo before commit.
3. The renderer is deterministic: same layout JSON → byte-identical output.
4. Import paths in generated code are LOOKED UP in the index, never synthesised.
5. Scope is React + TypeScript only. No Vue, no Flutter, no React Native output.

## Definition of done for any task

- Code compiles.
- Tests pass (`npm test` in the affected package).
- No new eslint errors.
- A `walkthrough.md` artifact exists showing what changed and how it was verified.
