# SnapForge — Cut List

> From Technical Dossier SF-001 Rev C §15. Take cuts **at gates**, never mid-feature. Every cut
> leaves a complete product.

---

## Ordered Cuts (in priority order — cut from top)

- [ ] **Cut 1:** Screen mirror (CH3) → show the laptop directly instead
- [ ] **Cut 2:** Live viewfinder overlay → static post-capture overlay
- [ ] **Cut 3:** Voice edits → tap-to-edit on the preview
- [ ] **Cut 4:** Dual-lens → single-lens multi-frame only

Nothing above touches the core forge path. Each cut removes a feature but leaves a working product.

---

## Never Cut

These are load-bearing. Removing any one of them breaks the product or the submission.

- **Office Kit CH1 + CH2** — 10% of score, and structural. Remove it and the phone has no idea what your components are called and nowhere to put the generated file.
- **Deterministic renderer** — it is the differentiation. The entire architecture argument rests on it.
- **Airplane-mode demo beat** — the unfakeable proof. No network, no account, no API key, same four seconds. This is the proof behind the compliance claim.
- **Showing the generated source on screen** — beat 4 of the demo is "the beat that wins". The imports using the repo's own component paths are the visible differentiator.

---

## Gate Actions

| Gate | Hour | If Failed |
|---|---|---|
| 1 | 08 | Switch to USB link-local fallback immediately. Bridge must be alive. |
| 2 | 14 | Cut live overlay + screen mirror. All three people on the forge path until it closes. |
| 3 | 22 | Nothing new is started after this point under any circumstances, including good ideas. |
| 4 | 27 | Present the last known-good build. Do not debug during the final three hours. |
