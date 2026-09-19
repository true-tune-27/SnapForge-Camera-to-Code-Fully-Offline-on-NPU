# SnapForge — Authoritative Specification

> Extracted from Technical Dossier SF-001 Rev C. This is the single source of truth for any agent
> rebuilding context after a session reset. Read this before any non-trivial task.

---

## 1 · PRODUCT

SnapForge is a developer tool that turns a hand-drawn UI sketch into a production-shaped React component inside a real codebase, using only a phone camera and on-device models, with the network off. A phone camera sweeps a whiteboard; OpenCV rectifies 8 frames into a square, glare-suppressed composite; MediaPipe detects boxes, arrows and text regions; a 500M vision model (SmolVLM, INT4, on the Hexagon NPU via QNN/Genie) emits ~280 tokens of grammar-constrained layout JSON — NOT code; a deterministic renderer converts that JSON into TSX, resolving every node against an index of the user's real repository shipped to the phone over iQOO Office Kit. The file lands back on the laptop on a new git branch. The only tool that is camera-input, codebase-aware and fully offline at the same time.

---

## 2 · INVARIANTS

The five non-negotiables, with the reasoning from the dossier:

1. **No model ever writes code.** Models emit typed, schema-constrained structure. All source generation is deterministic TypeScript we own and snapshot-test. A 500M model cannot reliably produce 2,000 tokens of correct TSX. 280 tokens of JSON takes 1.4s and is schema-valid by construction. Output quality becomes a property of our code, which means it is testable and fixable. (§09)

2. **No INTERNET permission in the Android manifest. Ever.** This is the product's core claim. The Android app does not declare `android.permission.INTERNET`. A network call is not something we have chosen not to make — it is something the operating system will not let the process do. Anyone can confirm by reading the manifest in the APK. CI fails the build if it appears. (§12)

3. **Generated TSX must pass `tsc --noEmit` against the host repo before commit.** A tool that emits code which does not compile has not saved anyone any time — it has added a debugging task. (§18)

4. **The renderer is deterministic: same layout JSON → byte-identical output.** No `Date.now()`, no `Math.random()`, no UUID generation in the output path. Object key iteration must be explicitly ordered. Map/Set iteration must be sorted before emission. (§09)

5. **Import paths in generated code are LOOKED UP in the index, never synthesised.** The component name, import path and token names are all looked up in the index, which is why they cannot be wrong. (§09, Fig 9.1)

**Scope constraint:** React + TypeScript only. No Vue, no Flutter, no React Native output. A general indexer is a six-month product; a React-only one demos identically. (§02)

---

## 3 · PIPELINE

The 8 stages from §07, with latency budgets:

| Stage | Budget | Accelerator | Notes |
|---|---|---|---|
| Camera sweep (user action) | 1,200 ms | ISP + CPU | 8 frames captured, IMU-guided angular displacement |
| Multi-frame rectification | 180 ms | OpenCV homography, CPU NEON | De-keystone, dual-lens baseline |
| Region detection | 95 ms | MediaPipe, LiteRT + QNN delegate (HTP) | Box/arrow/text-region detect |
| VLM prefill (rectified crop) | 420 ms | SmolVLM vision tower, Hexagon NPU | |
| VLM decode — 280 tok layout JSON | 980 ms | ~285 tok/s, grammar-constrained | GBNF logit mask |
| Schema validate + resolve | 18 ms | CPU, no model | Design-system index lookup |
| Deterministic render to TSX | 6 ms | CPU, no model | TypeScript AST emission |
| Bundle + WebView hot reload | 620 ms | esbuild-wasm, CPU | |
| **Sweep to running preview** | **4,299 ms** | | |

### Voice edit loop (separate, tighter cycle):

| Stage | Time | Tokens |
|---|---|---|
| Whisper-Tiny.en, 3s utterance | 340 ms | — |
| Qwen2.5-Coder-1.5B, patch decode | 1,080 ms | ~94 out |
| Patch apply + re-render + HMR | 186 ms | — |
| **Speak to updated preview** | **1,606 ms** | |

### Cold start:
First launch after reboot must page 1.4 GB of quantised weights into the NPU context. One-time 2.8–3.4s cost. Hidden by warming the VLM context when camera permission dialog is dismissed.

### Thermal:
A forge is a ~1.5s NPU burst, not sustained load. Twenty consecutive forges keep skin temperature under 40°C and cost about 6% of battery.

### Memory:
Peak RSS during a forge is budgeted at 2.4 GB. The VLM and the edit model share one QNN context. Frame ring buffer capped at 8 YUV frames.

---

## 4 · MODELS

| Model | Job | Params | Quant | On disk | Runtime & accelerator | Input → Output |
|---|---|---|---|---|---|---|
| SmolVLM-500M-Instruct | Read the sketch | 507 M | W4A16 | 386 MB | QNN Genie · Hexagon HTP | Rectified 768×768 crop + region hints → layout.v1 JSON, ~280 tok |
| Qwen2.5-Coder-1.5B-Instruct | Apply voice edits | 1.54 B | W4A16 | 912 MB | QNN Genie · Hexagon HTP | Current layout JSON + transcript → RFC 6902 JSON-Patch, ~60–120 tok |
| Whisper-Tiny.en | Hear the edit | 39 M | INT8 | 41 MB | LiteRT + QNN delegate | 16 kHz mono PCM → transcript |
| MediaPipe detector bundle | Find the shapes | 4.1 M | INT8 | 9 MB | LiteRT + QNN delegate | Frame → boxes, arrows, text regions with confidence |

**Resident footprint:** 1.35 GB, all NPU-resident.

### Rejected options and why:

| Option considered | Why tempting | Why rejected |
|---|---|---|
| Qwen3-4B writing HTML directly | One model, no renderer to build, impressive on paper | 90–200s per forge at realistic mobile decode rates, with quality varying run to run. Fatal for both the demo and the product. |
| MLC-LLM via OpenCL / Vulkan | Easiest Android path, works in an afternoon | Executes on the Adreno GPU, not the NPU, so we could not honestly say "NPU". Real hardware use is an explicit criterion. |
| Cloud VLM with a local cache | Far better accuracy, trivial to build | Destroys the entire wedge. The compliance market is the impact story; a network call ends it. |
| Moondream 2 (1.86B) as primary reader | Noticeably better on messy handwriting | Kept as opt-in "careful mode" on mains power. At 1.1 GB INT4 it doubles first-token latency. |

### Grammar-constrained decoding:
At each decode step, the logit vector is masked against a GBNF grammar compiled from the JSON Schema. Tokens that would produce invalid JSON, an unknown role, or an out-of-range coordinate get `-inf` and are never sampled. Invalid output is **unreachable**, not merely unlikely. No retry loop, no repair pass, no "please respond only in JSON" incantation.

---

## 5 · SCHEMAS

### layout.v1 (the VLM output format)
A typed JSON document the vision model emits under grammar constraint. ~280 tokens for a typical screen.

**Structure:**
- Top-level: `schema` (const `"snapforge.layout/v1"`), `surface`, `nodes`, `unresolved`
- `surface`: `{ kind: "screen"|"component"|"fragment", name: PascalCase string }`
- `nodes`: array of Node, recursive via `children`
- Node fields: `id`, `role` (closed enum), `variant` (optional, closed enum per role), `bbox` (normalised 0..1), `conf` (0..1), `pad`, `gap`, `radius`, `text`, `label`, `state`, `value`, `children`
- `unresolved`: array of `{ bbox, reason }` where reason is a closed enum: `illegible_handwriting | ambiguous_shape | occluded | out_of_frame | low_confidence`

**Design constraints:**
- Total token count of a typical emitted document under 300
- Every enum must be closed (open strings cannot be grammar-constrained)
- No fields "for future use" — unused schema surface becomes hallucination surface

### index.sfx (the design system index)
The compact map of the user's repo sent to the phone. ~40–120 KB gzipped.

**Structure (from §11 Fig 11.1):**
- `repo`: `{ name, framework, indexedAt }`
- `components[]`: `{ name, import, export ("named"|"default"), props[], maps[] (role.variant strings), usageCount }`
- `tokens`: `{ space: {1:4, 2:8, 3:12, 4:16, 6:24}, radius: {sm:4, md:10, lg:20} }`
- `conventions`: `{ screenDir, fileCase, ext, styleSystem, importAlias }`

---

## 6 · RENDERER CONTRACT

### Resolution flow (§09 Fig 9.1):
1. Layout node with `role` and `variant` → resolve against the design system index
2. Exact match on `maps[]` array → component with import path, props, export style
3. Tie-break by `usageCount` descending (the component the team actually uses wins)
4. If no match → fuzzy match by name similarity
5. If still no match → emit HTML primitive with TODO comment naming 3 closest candidates
6. Map layout node fields onto component props by name and type
7. Token snap: convert normalised measurements to repo's token scale
8. Emit TypeScript AST via compiler API, never string concatenation

### Five failure modes with required degradation behaviour:

| What went wrong | Where caught | What lands in file | Developer cost |
|---|---|---|---|
| Handwriting illegible | VLM declines, writes to `unresolved` | `TODO(snapforge)` comment at correct position, bbox noted | Read the board, type it |
| No component matches the role | Resolver finds no index entry above threshold | HTML primitive + 3 nearest candidates in comment | One import swap |
| Spacing matches no token | Token snapper, nearest neighbour | Nearest token + raw measurement in trailing comment | Usually nothing |
| Nested structure misread | **Not caught — the real failure** | A valid component, wrong hierarchy | Re-sweep or fix by voice |
| Renderer bug | Snapshot test in CI, before release | Nothing — it does not ship | None |

> Row four is the honest one. A misread hierarchy produces plausible but wrong code and no architecture prevents that.

---

## 7 · OFFICE KIT

The four channels from §11, their direction and payload:

| CH | Direction & payload | What it enables |
|---|---|---|
| 1 | PC → phone, `index.sfx` (40–120 KB) | Phone learns the repository: component inventory, prop signatures, design tokens, import paths, file-naming conventions |
| 2 | Phone → PC, `.tsx` + manifest | Generated component + layout JSON + provenance record land in the repo. Companion formats, type-checks and commits to a new branch |
| 3 | Phone → PC, preview stream | Live WebView preview mirrors onto laptop while developer iterates by voice. Put on room display in design review |
| 4 | Bidirectional, clipboard + control | Paste a component name from IDE to pin as hint; tap node on phone to jump laptop editor to that line |

**Transport:** USB-C or peer-to-peer Wi-Fi Direct via Office Kit. No router, no internet. Fallback: signed link-local channel over USB tethering (same wire format, same security model, degraded UX).

**Companion binds to 127.0.0.1 only, ephemeral port, per-session shared secret.** Never opens an outbound connection.

---

## 8 · ACCEPTANCE

Every measurable target from §18, as a checklist:

### Functional gates (must all be 100%):
- [ ] Generated file parses as valid TypeScript — 100%
- [ ] `tsc --noEmit` passes against the host repo — 100%
- [ ] Repo's own eslint config passes with no new errors — 100%
- [ ] Every import resolves to a real module in the repo — 100%
- [ ] Renderer is deterministic — same JSON, same bytes — 100%
- [ ] No network syscall observed under strace — 0 calls

### Quality gates (40-sketch benchmark):
- [ ] Layout F1 against hand-labelled ground truth — ≥ 0.85
- [ ] Component resolution accuracy — ≥ 0.90
- [ ] Token snap accuracy (within one step) — ≥ 0.95
- [ ] Hallucinated imports — 0
- [ ] Sketches needing more than one sweep — ≤ 10%

### Performance gates (device required):
- [ ] Sweep to running preview, warm — ≤ 6.0s
- [ ] Voice utterance to updated preview — ≤ 2.5s
- [ ] Cold start including model residency — ≤ 4.0s
- [ ] Peak RSS during a forge — ≤ 2.4 GB
- [ ] Battery drain across 20 consecutive forges — ≤ 6%
- [ ] Skin temperature after 20 forges — ≤ 40°C

### Three failure conditions reported as failures:
1. Generated code does not compile → "it does not work yet, here is the error"
2. Inference runs on CPU, not NPU → "this is running on CPU today — here is the conversion work and where it stopped"
3. Nobody on the team reaches for it → "we built something impressive that we would not use, and here is why"

---

## 9 · CUT LIST

**In order (nothing below the line touches the core forge path):**
1. Screen mirror (CH3) → show the laptop directly instead
2. Live viewfinder overlay → static post-capture overlay
3. Voice edits → tap-to-edit on the preview
4. Dual-lens → single-lens multi-frame only

**Never cut:**
- Office Kit CH1 + CH2 — 10% of score, and structural
- Deterministic renderer — it is the differentiation
- Airplane-mode demo beat — unfakeable proof
- Showing the generated source on screen

### Gates:

| Gate | Hour | What must demonstrably work | If it fails |
|---|---|---|---|
| 1 | 08 | Laptop indexes a real React repo; phone receives and parses index.sfx; dummy file lands on a branch | Switch to USB link-local fallback immediately |
| 2 | 14 | One sketch goes end-to-end on device → file in repo that compiles. Quality may be poor; path must be complete | Cut live overlay + screen mirror, all three people on forge path |
| 3 | 22 | Feature freeze. 40-sketch benchmark runs clean, we know our numbers | Nothing new started after this point, including good ideas |
| 4 | 27 | Demo locked and rehearsed twice. Phone charged/cooled, spare device paired | Present last known-good build. No debugging in final 3 hours |

---

## 10 · OPEN QUESTIONS

1. **Market sizing estimate is flagged as weak.** The 15–20% figure for "organisations that restrict cloud AI on source code" is an estimate the dossier cannot substantiate and flags rather than dresses up (§04). "Even at a third of that figure it is a population with zero incumbent product."

2. **Latency figures are targets, not measurements.** §22 states explicitly: "Latency figures, model sizes and benchmark scores are targets derived from published throughput for these model classes on Snapdragon 8-series hardware, plus our own conversion work. They are stated as commitments we expect to be held to, not as measurements already taken on the final build." All figures in §07 carry this label.

3. **Moondream 2 decision.** Kept as opt-in "careful mode" but not the default. Whether the accuracy gain justifies the latency cost on the demo device is an open measurement.

4. **Energy comparison.** §20 states that credible per-query energy figures for hosted models are not public, so no precise multiple is claimed.

5. **Condition 2 is the weakest.** §19 states: "Forges per user per week stays above one after the first month" is the condition the whole product rests on and the one the team is least sure of.

6. **RenderScript replacement kernel.** §10 mentions a "RenderScript replacement kernel" for glare suppression, but RenderScript is deprecated. The actual implementation path needs to be determined (likely NEON intrinsics as stated in the build pack).

7. **Worked example schema mismatch.** The worked example in §21 uses fields like `"emphasis"` on the button node and `"control"` and `"level"` on nodes that are not described in the schema section. The schema defined in P1.1 uses `variant` for buttons and `role` for controls. The example should be treated as illustrative, and the schema from P1.1 is authoritative.
