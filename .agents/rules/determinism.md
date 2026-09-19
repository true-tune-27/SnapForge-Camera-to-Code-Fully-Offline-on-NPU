---
description: Renderer output guarantees
---
`renderer/` must be a pure function: layout JSON + index → source string.

- No Date.now(), no Math.random(), no UUID generation in the output path.
- Object key iteration must be explicitly ordered, never Object.keys() order.
- Map/Set iteration must be sorted before emission.
- Every change to the renderer updates snapshots in the same commit, and the
  diff must be reviewed — an unexpectedly large snapshot diff means a bug.

Test: running the renderer twice on the same fixture must produce identical
bytes. There is a test for this. Do not skip it.
