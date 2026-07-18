# Atlas results — curated export

These are **curated** verdicts and dumps from the Atlas runs. The full raw per-run traces live in the
canonical `neurono-bench` repo (`bench/results/` and `eval-logs/results/`); this export keeps what is
needed to re-read the verdicts and audit each case.

## What was kept vs curated out

For the `bench/results/` families (all except the two `eval-logs` dirs below) each run dir keeps:

- `*.judged.json` — the folded verdict per agent bucket (rubric + pass/fail + judge reasoning)
- `*.verdicts.jsonl` — the raw LLM-judge verdicts (`{caseId, rep, verdicts:[…], overall}`)
- `*.dump.autofail.json` — deterministic invariant-gate autofails
- `*.dump.json` — the run dump (prompts/replies/traces) — **included** here (the whole export is ~17 MB)
- `.manifest.tsv` — the run manifest (model, set, flags)

**Curated out** (regenerable, or heavy): `*.dump.tasks.jsonl`, `*.benchlog`, `*.dumplog`.

The two `eval-logs` dirs (`2026-07-17-atlas-v2-optimized`, `2026-07-17-lote-a-recert-retest`) are
**already-curated verdict sets** in the canonical repo and are copied **whole**.

## Dir families

| family | dirs | what it is |
|---|---|---|
| `2026-07-1[78]-atlas-vanilla-v2-set…-or-*` | 56 | **Traditional (ungoverned) cloud matrix.** `setatlas15`/`setatlas3` = the 15/3-case screen; `setfull` (+`-rep1`/`-rep2`) = the full-61 N=3 over 13 OpenRouter models. Bundle = the cloud-optimized "v2" form. |
| `2026-07-16-atlas-vanilla-setfull*` / `…-v2-setfull*` / `2026-07-17-…-v3-setfull-ram24-MTPon` | 9 | **Traditional local/cloud arms** — v1/v2/v3 iterations of the ungoverned agent (v3 = ram24-optimized). |
| `2026-07-17-atlas-vanilla-v{2,3}-case62fix*` | 2 | Single-case fix runs (case 62). |
| `2026-07-17-atlasr2-s15-setfull*` | 6 | **Governed (looprun / s15) local cert** — `atlas-r2` bundle, full-61, cloud + ram24-MTPon, N=3 reps. |
| `2026-07-17-atlasv2-band-ram24-mtpon-p1..3` | 3 | **Perturbed local band** — the honest local certification (K=3 inert-byte perturbations; see `../docs/flip-root-cause-2026-07-16.md` Part 8). |
| `2026-07-17-atlas-v2-optimized` | 1 | Curated verdict set: per-model optimized-form runs (D25). Copied whole. |
| `2026-07-17-lote-a-recert-retest` | 1 | Curated verdict set: the Lote-A eval recert/retest. Copied whole. |

Per agent bucket the file stem is one of `rentals` / `billing` / `claims` / `fleet` / `admin`
(the 5 Atlas agents).
