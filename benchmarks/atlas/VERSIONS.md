# Atlas benchmark — editions

Each **edition** of the Atlas benchmark is pinned to a published **looprun release** (npm `looprun@X.Y.Z`
+ the matching GitHub release tag). An edition bundles the subject, the specs, the control arm, and the
curated result verdicts that produced its published numbers.

## The versioning LAW

- **Published edition numbers are never retro-edited.** Once an edition's numbers are published they are
  frozen — corrections, re-tunes, and re-measurements do **not** overwrite them.
- **A new edition = a new `results/vX.Y.Z/` directory**, pinned to the looprun npm/GitHub release it was
  measured against. Nothing outside that directory changes an already-published edition's numbers.
- The headline numbers are always read from the edition's own `results/vX.Y.Z/` tree, never from a later
  edition's.

## Editions

| edition | date | looprun release | results dir | headline (aggregate) | anchors | scope |
|---|---|---|---|---|---|---|
| **v0.6.0** | 2026-07-18 | `looprun@0.6.0` (GitHub `v0.6.0`) | [`results/v0.6.0/`](results/v0.6.0/) | **governed 96.5 × ungoverned 92.6** — aggregate over **13 cloud models, N=3** | flash-lite (cloud subject) **100** · local-quantized (ram24) **91.8** | full cloud-model matrix + local band |
| v0.6.1 | pending | `looprun@0.6.1` (tag TBD) | `results/v0.6.1/` (pending) | matrix numbers **not re-measured** — remain those of v0.6.0 | anchors **re-certified** | runtime **P9** patch: two guard-tune fixes promoted after a per-case forensic campaign |

### v0.6.0 (2026-07-18) — current published edition

The full governance-vs-traditional matrix: **looprun (governed) 96.5 vs traditional (ungoverned) 92.6**
aggregate over 13 cloud models at N=3, with certified anchors flash-lite **100** (cloud subject) and
local-quantized (ram24) **91.8**. All verdicts — both arms — scored by the same held-constant LLM judge
(ruler-v2). Curated verdicts, dumps, and the per-family manifest live under
[`results/v0.6.0/`](results/v0.6.0/); the research reports are in [`docs/`](docs/).

### v0.6.1 (pending)

A runtime **P9** patch: **two guard-tune fixes** promoted after a per-case forensic campaign. The
**anchors are re-certified** on the patched runtime; the **cloud-model matrix numbers are NOT
re-measured** and therefore remain exactly those of v0.6.0. This row will be finalized — with its
`results/v0.6.1/` directory and the `looprun@0.6.1` release-tag link — when the release is published.
Per the LAW above, publishing v0.6.1 does not edit any v0.6.0 number.
