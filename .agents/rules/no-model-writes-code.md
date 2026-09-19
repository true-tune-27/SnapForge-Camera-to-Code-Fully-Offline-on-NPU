---
description: The architectural invariant that defines SnapForge
---
Models in this project produce STRUCTURE, never SOURCE.

- The VLM emits `layout.v1` JSON under GBNF grammar constraint.
- The edit LLM emits RFC 6902 JSON-Patch against that layout.
- Nothing else.

If you find yourself writing a prompt that asks a model to emit TSX, JSX, HTML
or CSS — stop. That work belongs in `renderer/`, written as deterministic
TypeScript that builds a TypeScript AST and prints it.

Rationale: a 500M model cannot reliably produce 2000 tokens of correct TSX, and
a 4B model takes 90-200s to try. 280 tokens of JSON takes 1.4s and is
schema-valid by construction. Output quality becomes a property of our code,
which means it is testable and fixable.
