# schema/

**STATUS: FROZEN after Phase 1.**

This directory contains:

- `layout.v1.schema.json` — JSON Schema (Draft 2020-12) for the document the vision model emits
- `index.sfx.schema.json` — JSON Schema for the design system index
- `src/types.ts` — TypeScript types generated from both schemas
- `src/gbnf/` — GBNF grammar compiler and generated grammar files

## Changing these files

These schemas are the frozen contract between all three lanes (Android, Companion, Renderer).
**All three lane owners must agree** before any change. Every change bumps the version in `$id`.

The GBNF grammar must be regenerated whenever the schema changes:
```bash
npm run gbnf -- layout.v1.schema.json
```

CI will fail if the committed `.gbnf` is stale.
