# Provenance — blind-authored vanilla bundle (atlas)

**What this is.** `index.ts` + `README.md` were authored 2026-07-16 by a SEPARATE Fable session
("blind session") that never saw this repo, the looprun specs, GUARDS.md, the eval cases,
rubrics, judge prompt, or the raw WORLD-MODEL.md. It is the "how a dev would normally generate an
agent with a frontier LLM" arm of the looprun value experiment.

**Exact inputs handed to the blind session** (isolated scratch dir, no repo paths):
- `BRIEF.md` — sanitized business brief (sha256 `2d979583ba137c7b…d85a34`), derived from
  WORLD-MODEL.md + presets.ts policies with all pipeline/architecture vocabulary stripped
  (sanitization audit grep = 0 hits). Canonical copy: `../../BRIEF.md`.
- `tools.json` — the 54-op surface, byte-identical to
  the subject `tools.json` (sha256 `5616b41d…3cd92`).

**Platform context given** (fixed constraints, not design hints): agents run on Mastra
(`new Agent({instructions, model, tools})`), temperature 0, up to 16 tool steps/turn, model varies
by deployment, instructions are static (no live-state injection).

**What the blind session decided on its own:** the 5-agent decomposition with overlapping tool
scopes (rentals 37 / billing 25 / fleet 21 / claims 23 / admin 10), all instruction content, the
shared operating core + per-area playbooks. See its `README.md`.

**What THIS repo added afterwards (plumbing, not agent design):** `CASE-MAP.tsv` — routing of eval
cases to the blind agents by business area (rentals→rentals, billing→billing, claims→claims,
inventory→fleet, admin→admin), the functional equivalent of the governed arm's user-as-classifier
routing. The blind session never saw case ids.

**Iteration ledger** (parity budget: ≤3 measured iterations, mirroring the governed T-loop):
- v1: first shot, zero feedback. Measured full-61: FL N=3 85.2 mean/85.2 modal; ram24 N=3 72.1
  mean/70.5 modal. (`index.v1.ts.bak`)
- v2 (2026-07-16, sha256 2036a5b6…): blind session revised after `BUGREPORT-v1.md` (business bug
  report, 6 failure classes, transcripts only — no rubric/gold). Blind session's own decisions:
  EXCLUSIVE write-ownership per agent (dropped the overlap), "Iron rules" preamble, billing gained
  listAssets/getAsset, invoice-status law. Tool counts 32/27/20/22/10. Measured N=1 (protocol
  adjusted by user: N=1 on intermediate iterations, N=3 only on the final round):
  **FL 60/61 = 98.4 · ram24 52/61 = 85.2.** (`index.v2.ts.bak`)
- v3 (2026-07-16, sha256 7eb1906e…): blind session revised after `BUGREPORT-v2.md` (local
  flow-completion pattern + numeric copy-verbatim + investigatory-hold path + system-is-authority
  on release preconditions). Key change: per-turn branch protocol ("user answered your confirmation
  → the confirmed:true call is your FIRST action, args copied verbatim from the preview"), per-flow
  turn checklists, prompts SHORTER than v2 (8.2–9.0k chars). **NOT YET MEASURED — experiment paused
  by the user (skill adjustments pending) before any v3 run.**
