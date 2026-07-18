# Atlas results — curated export

These are **curated** verdicts and dumps from the Atlas runs — kept to re-read the verdicts and audit
each case. Heavy or regenerable per-run traces are curated out (see below).

## What was kept vs curated out

For most run dirs (all except the two already-curated verdict sets below) each run dir keeps:

- `*.judged.json` — the folded verdict per agent bucket (rubric + pass/fail + judge reasoning)
- `*.verdicts.jsonl` — the raw LLM-judge verdicts (`{caseId, rep, verdicts:[…], overall}`)
- `*.dump.autofail.json` — deterministic invariant-gate autofails
- `*.dump.json` — the run dump (prompts/replies/traces) — **included** here (the whole export is ~17 MB)
- `.manifest.tsv` — the run manifest (model, set, flags)

**Curated out** (regenerable, or heavy): `*.dump.tasks.jsonl`, `*.benchlog`, `*.dumplog`.

The two dirs (`2026-07-17-atlas-v2-optimized`, `2026-07-17-lote-a-recert-retest`) are
**already-curated verdict sets** and are copied **whole**.

## Dir families

| family | dirs | what it is |
|---|---|---|
| `2026-07-1[78]-atlas-vanilla-v2-set…-or-*` | 56 | **Traditional (ungoverned) cloud matrix.** `setatlas15`/`setatlas3` = the 15/3-case screen; `setfull` (+`-rep1`/`-rep2`) = the full-61 N=3 over 13 OpenRouter models. Bundle = the cloud-optimized "v2" form. |
| `2026-07-16-atlas-vanilla-setfull*` / `…-v2-setfull*` / `2026-07-17-…-v3-setfull-ram24-MTPon` | 9 | **Traditional local/cloud arms** — v1/v2/v3 iterations of the ungoverned agent (v3 = tuned for the local quantized model). |
| `2026-07-17-atlas-vanilla-v{2,3}-case62fix*` | 2 | Single-case fix runs (case 62). |
| `2026-07-17-atlasr2-governed-setfull*` | 6 | **Governed (looprun) local cert** — `atlas-r2` bundle, full-61, cloud + the local quantized model (Qwen3.6-35B-A3B, IQ2_XXS quant), N=3 reps. |
| `2026-07-17-atlasv2-band-ram24-mtpon-p1..3` | 3 | **Perturbed local band** — the honest local certification (K=3 inert-byte perturbations; see `../../docs/flip-root-cause-2026-07-16.md` Part 8). |
| `2026-07-17-atlas-v2-optimized` | 1 | Curated verdict set: per-model optimized-form runs. Copied whole. |
| `2026-07-17-lote-a-recert-retest` | 1 | Curated verdict set: the Lote-A eval recert/retest. Copied whole. |

Per agent bucket the file stem is one of `rentals` / `billing` / `claims` / `fleet` / `admin`
(the 5 Atlas agents).
