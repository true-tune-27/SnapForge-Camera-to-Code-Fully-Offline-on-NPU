# Renderer Guarantees

> This document states plainly what the SnapForge renderer promises and what it does not. It is the answer to the question: "How do you know the output is good?"

## What the renderer IS

The renderer is a **deterministic, pure function**:

```
(layoutJSON, designSystemIndex) → TypeScript source string
```

It takes a grammar-constrained layout document emitted by the on-device vision model, looks up every node against the user's real component inventory, and produces a `.tsx` file that compiles against the user's repository.

No model writes code. The renderer is hand-written TypeScript that builds a TypeScript AST using `ts.factory.*` and prints it with `ts.createPrinter`. String concatenation is never used. AST emission is valid by construction.

## The five guarantees

### 1. Determinism
The same layout JSON and the same index produce **byte-identical** output, every time, in every environment. There are no calls to `Date.now()`, `Math.random()`, or UUID generation in the output path. Object key iteration is explicitly sorted. Map/Set iteration is sorted before emission.

**How we prove it:** The determinism test runs the full pipeline twice on every fixture in the same process and asserts byte equality. The snapshot suite commits 40 snapshots (20 fixtures × 2 repos) so any unintended change is visible in review.

### 2. No hallucinated imports
Every import path in the generated file is looked up in the design system index. Import paths are **never synthesised** — they are read from `component.import` in the index, which was extracted by static analysis of the user's actual `tsconfig.json` paths.

**How we prove it:** `no-hallucinated-imports.test.ts` parses every emitted file, extracts every import specifier, and asserts each one resolves to a real file in the test repo or a declared dependency.

### 3. Generated code compiles
Every emitted file passes `tsc --noEmit` against the host repository with zero diagnostics. If the renderer cannot produce typed output for a node, it emits an `unresolved` TODO comment — never `any`, never `// @ts-ignore`.

**How we prove it:** `compiles.test.ts` writes each emitted file into a temp copy of the test repo and runs the TypeScript compiler. Zero diagnostics is the pass condition.

### 4. Graceful degradation
When the renderer cannot find a matching component, it does not guess:

- **`primitive` resolution:** Falls back to an HTML element (`<div>`, `<button>`, etc.) and emits a TODO comment listing the three closest component candidates, sorted deterministically.
- **`unresolved` regions:** Become `{/* TODO(snapforge): <reason> at bbox [...] */}` placed at the correct position in the tree by bbox ordering.
- **Low-confidence tokens:** Emit a trailing comment with the exact pixel value so a human can verify the snap.
- **Dropped fields:** If a component's props don't accept a layout field, the field is dropped and a comment names what was dropped.

The renderer never invents a prop name that is not in the index.

### 5. No invented behaviour
The renderer produces a **scaffold**, not an application. It does not emit event handlers, state management, or business logic. There is no `onClick={() => {}}` — that would be inventing intent the sketch did not express.

## What the renderer is NOT

- **Not pixel-accurate.** The renderer produces structure, not styling. Exact spacing, colours, and typography come from the user's design system tokens, snapped to the nearest value. The snap may be wrong — that's why low-confidence snaps are commented.
- **Not a complete page.** If the sketch has regions the model couldn't parse (`unresolved`), those gaps are visible as TODO comments, not papered over.
- **Not infallible.** A 500M vision model working from a whiteboard photo will produce imperfect layout JSON. The renderer's job is to turn imperfect structure into code that still compiles, still uses real components, and still tells the human exactly where it was uncertain.

## The argument for this architecture

A 500M model cannot reliably produce 2000 tokens of correct TSX. A 4B model takes 90–200 seconds to try. 280 tokens of grammar-constrained JSON takes 1.4 seconds and is schema-valid by construction.

By separating structure (model) from source (renderer), output quality becomes a property of **our code** — which means it is testable, fixable, and improvable without retraining a model.
