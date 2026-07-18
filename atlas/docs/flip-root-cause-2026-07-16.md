> **Provenance:** exported verbatim from the canonical `neurono-bench` repo (internal research
> doc). Internal vocabulary: "s15" = the runtime published as `looprun`/`@looprun-ai/core` 0.6.0;
> "the Claude/Opus judge (D9, ruler-v2)" = the LLM judge used for every verdict in this benchmark
> (both arms, same judge). Decision labels (D9/D24/D25...) refer to the bench's decision ledger.

# Root cause of the "senseless" case flips on ram24 (minimal-repro, measured 2026-07-16)

**Question.** Why do atlas-v1 cases flip pass/fail under same-config re-runs, inert (placebo) edits,
and every ladder intervention — capping local iteration at ~82–90% no matter what we edit?
(Context: set19 ladder + Q4-vs-IQ2 probe. The raw `bench/results/2026-07-16-atlas-s15-set19-*` dirs
were pruned from the working tree on 2026-07-17 — recover them from git history if needed.)

**Method (minimal repro).** One always-flippy case (`31-quote-total-none-exists`, at-billing), replayed
RAW against llama-server (ram24 alias, IQ2_XXS, temp 0) at its exact decision point: step 2, after the
byte-identical `listAssets` call+result that both the PASS (ref61) and FAIL (recheck) runs produced.
Prompt rendered offline byte-exactly (`bench/scripts/dump-s15-prompt.ts` mirrors `mastra.ts:534-554`);
`/apply-template` + `/completion` with `n_probs` (MTP off for full distributions) reads the top-k
logprobs at the fork. Harness: session scratchpad `e_battery.py`.

## The decision is one token with ~0.5 nat of margin

The whole case grades a binary choice — READ the (non-existent) quote vs CREATE one:

| fork continuation | token path | logprob | p |
|---|---|---|---|
| `getQuote` (pass) | `=get` → `Quote` | −0.566 | ~57% |
| `generateQuote` (fail) | `=` → `generate` (98%) → `Quote` | −1.032 | ~36% |

Gap = **0.466 nat**. A fork census over the full generation: **the tool-choice token is the ONLY
position with top1−top2 < 0.7 nat** (1/14) — the near-tie concentrates exactly on the semantic
decision the eval grades; syntax/format positions are all safe.

## E-battery results

| exp | manipulation | result |
|---|---|---|
| **E0** | same bytes, same cache state, ×6 (cold/warm × MTP on/off) | **100% deterministic** — identical output every time |
| **E2** | inert single-char edits FAR from the quote rules | margin swings **±0.35 nat** (`the`→`a` in persona: 0.466→0.824; trailing space: →0.320; the REAL ladder placebo byte (double space): →0.489) |
| **E3** | same final bytes, different PRIOR server requests | margin **0.466 → 0.676** (50%-prefix prime, `cache_n=2952`); even a "full cache hit" restored via `--cache-ram` gives 0.53 — restored KV is a numeric **patchwork of its batch history** |
| **E4** | grow-back / leave-one-out by prompt section | margin is a **residual of opposing prose forces**: `full −core` flips the choice outright (gap −0.26 → `generateQuote`); no section owns the decision — it is an equilibrium |

Supporting triage from the real runs (free, `dump.tasks.jsonl` diffs): same-config divergences are
ACTION-level (ref61 `getQuote×4` vs recheck `generateQuote`; case 50 12-call exploration vs 3-call
`askUser`), and at least one recurring flip (51-pii) is **judge noise** — identical action trace,
identical disclosed fields, only phrasing differs; verdict flips anyway.

## Root cause (three stacked layers)

1. **Near-tie decisions.** The graded action decision rides a single greedy-argmax token whose margin
   (~0.25–0.5 nat on flippy cases) is the residual of a tug-of-war between prose blocks — not owned by
   any rule. (The magnet's "chronic mild form", now measured.)
2. **Two noise sources ≥ the margin.**
   (a) *Prose noise:* ANY byte edit — however semantically inert — shifts every margin by up to ±0.35 nat.
   (b) *Cache-state noise:* the KV a case runs on is a numeric patchwork of the run's batch history
   (prefix reuse split, `--cache-ram` restores, checkpoints). Same bytes shift ±0.21 nat across states.
   Determinism is real but **state-scoped** (E0), which is why rep-vs-rep is byte-identical while
   full-61 vs subset-19 diverged on 8/19 cases (different run shape → different patchwork).
3. **Judge noise on borderline rubrics** amplifies surviving language jitter into verdict flips (case 51).

**Consequence for iteration:** an N=1 A/B of a prose edit measures `edit effect + prose noise +
cache-state noise (+ judge noise)` where the noise terms are the same order as the margins. Fixing one
case and breaking another is the EXPECTED behavior of this system — "enxugar gelo" is structural, not
bad luck. This also explains: Q4≈IQ2 reshuffle (different quant = different logit landscape → different
near-tie set), lad1 lexicon no-op (byte-identical output), FL-cloud stability at 100% (larger margins),
and the stable hard fails 50/72/92 (margins firmly on the wrong side — a different class: genuine
spec/model gap, not flip noise).

## Part 2 — the margin-loop process, proven on the same substrate (2026-07-16)

**Instrument:** a fork-PAIR per decision (`margin_suite.py`): fork A = read-intent (case 31 verbatim,
correct=`getQuote`), fork B = create-intent (mirrored user text, correct=`generateQuote`). Signed
margin toward the correct tool; acceptance = worst-case margin across the FULL noise battery
(7 placebos + 3 cache states, both forks) must improve, with fork B guarding against the magnet.

| config | fork A margin | **worst-case under noise** | fork B (anti-magnet) | verdict |
|---|---|---|---|---|
| v1 baseline | 0.466 | **0.320** | 9.7 ✓ | coin (inside noise band) |
| iter1 — one disambiguation clause on the quote rule | 1.029 | **0.867** | 10.1 ✓ | **ACCEPT** |
| iter2 — "crisper" question-vs-request wording | 0.917 | 0.626 | 8.9 ✓ | REJECT (worse than iter1) |
| iter3 — iter1 + a Core-rules read-first bullet | 0.948 | 0.798 | 8.9 ✓ | REJECT |

- iter1's WORST noise excursion (0.867) sits above the baseline's BEST one (0.824): the entire noise
  cloud moved off the boundary. 0 flips in the battery (baseline real runs flipped).
- Ownership: baseline flipped outright without the Core section (gap −0.26); iter1 stays correct
  (+1.06) even with the whole Core section removed — the decision is now owned by its rule, not by
  the prose equilibrium.
- iter2/iter3 look like improvements under score-based N=1 (both "pass") — the instrument caught both
  as regressions, deterministically, in ~1 min each, zero judge calls, zero full runs. That is the
  luck→process conversion in one table.
- e2e sanity (iter1): read-intent → `getQuote` bare; create-intent → `generateQuote(ast_excv01,
  2026-07-10, 2026-07-15)`.

## Part 3 — the working protocol (Etapa 1, in force for every measurement below)

**Instrument** (packaged in `skills/agentspec-generator/scripts/`): `extract-fork.mjs` (finds the
first divergent message between a real PASS and FAIL run of the same case; emits the replayable
shared context + the two continuations) → `margin-probe.py measure|battery|pair` (renders the
byte-exact prompt via `bench/scripts/dump-s15-prompt.ts` dumps + `/apply-template`, reads the
top-k logprobs at the fork, runs the noise battery). Server: the target LOCAL model, speculative
decoding OFF.

**Rules in force:**
1. **Comparisons never by full-run N=1 score.** An edit is judged by the fork-pair margin:
   ACCEPT iff the WORST-CASE margin across the battery (6 inert byte edits + 3 cache states)
   improves on BOTH forks (primary + mirrored intent), zero flips. Target ≥3× the noise band
   (~0.6 nat → ≥ ~2 nat).
2. **Full runs, when needed** (bar checks / certification): fixed cache discipline (always-cold or
   always-self-primed), constant run SHAPE (same case-set + order — subset vs full is a different
   experiment), and local certification = median of K PERTURBED runs + band (byte-identical reps
   are ONE sample — D11/D20 local amendment), judge majority-of-3 on borderline rubrics.
3. **Routes per case class:** near-tie fork → margin loop; fork resists widening OR failure is
   fabrication/scope with an observable key → deterministic gate (guard); same-semantics text fork
   (judge noise) → judge protocol, not model edits; margin firmly wrong-side on every arm → declared
   model-tier ceiling.

**Fork census of the flippy set (measured with the instrument, v1 bundle, ram24) — with the
Etapa-1.3 outcomes (bundle `atlas-m1` = certified v1 + the accepted items below):**

| case | fork (auto-extracted) | margin v1 | route → outcome |
|---|---|---|---|
| 31 | tool-name `getQuote` vs `generateQuote` | +0.451 (worst 0.32) | margin loop (Part 2) → clause accepted at worst 0.867; in m1-full interaction battery below |
| 25 | tool-name `askUser` vs `issueRefund` | +0.308, **worst −0.13 (real placebo flip)** | margin loop → **E25 ACCEPTED**: worst +4.79 alone, +6.66 with E32; mirror 1.84→3.83 |
| 32 | tool-arg `amount` 1500 vs 3500 (both GUESSES) | −0.028 at the value; **−5.68** vs the true target (`askUser`) | margin loop → **E32 ACCEPTED**: no wrong picks in battery; forced-choice (runtime condition) `askUser` by +3.8–7.8 across states; mirror ≥6.9 |
| 70 | tool-name `transferAsset` vs `askUser` | +1.861 | healthy on v1 (flips came from ladder-edited bundles); unchanged in m1 |
| 11 | phrasing seed fork; graded failure = fabricated `$800` downstream | n/a | **guard shipped in m1**: `ungroundedDepositFigure` reply check (deposit $-figure is ungrounded BY CONSTRUCTION on the rentals surface; trivially-followable correction to avoid the stub class) |
| 51 | reply-text fork, SAME disclosed fields both sides | n/a | **judge protocol** (majority-of-3) — no bundle change |
| 50 | first-read proxy fork (`listCustomers` vs `getBooking`) | **−2.87** | **declared ram24 ceiling** — D3 bars a user-text-keyed defer gate; correct branch firmly out of reach of prose |
| 72 / 92 | defer-vs-explore at step 1 (`replyToUser` first — the FL pass move) | correct branch **below top-8** (≳5 nats away) | **declared ram24 ceiling** (same D3 constraint) |

## Part 4 — Etapa 1.3 CLOSED (final scoreboard, one pinned server config)

Bundle **`atlas-m1` final** = certified v1 + C31v2 (no id-probing) + E32 + E25v2 (refund-scoped) +
case-27 shortfall gate (`releaseBlockedByShortfall`, args+`bookingDepositCovered` accessor — prose
was REJECTED by the fork battery first: 9/10 states still previewed the release) + case-11
`depositFigureScrub` MUTATOR (the veto guard stubbed: redrive:1 → salvage-miss; deterministic
egress rewrite replaced it) + rentals/billing nudge lines. All accepted by fork-pair worst-case
batteries; billing final e2e: 5/5 judged pass, zero autofails, zero recovery events.

| set-19, same server | v1 baseline | m1 final | mechanism |
|---|---|---|---|
| score | **10/19** | **13/19** | +3 attributable cases |
| 11 | F (fabricated "$800") | P | deterministic mutator |
| 25 | F (delivery-stub!) | P | margin edit E25 |
| 27 | P | P | hard gate (after prose rejected) |
| 31 | F (fabricated quote) | P | C31v2 (no impossible read) |
| 32 | P (coin −5.68 underneath) | P | margin edit E32, now +6 worst-case |
| 50/71/72/92 | F | F | declared ram24 ceiling (behaved exactly as declared) |
| 51 | F | F | **reclassified by majority-of-3 (3/3 FAIL): genuine minimal-disclosure miss** — route: claims prose iteration (post-1.3) |
| 70 | F | F | server-config coin (byte-identical replies across all arms on this server; passed on the standard serve) |

Process lessons banked: (1) noise bands are PER SERVER CONFIG — pin the serve flags in any
comparison/cert (v1 moved 12–14 → 10/19 across configs); (2) when the fork battery REJECTS prose,
go gate (case 27); (3) when a veto guard stubs a weak model, go MUTATOR (case 11); (4) a clause
must never instruct an impossible read (C31v1 induced qt_-id probing → degenerationGuard
false-positive on honest enumerations — runtime calibration item for the looprun reconciliation).

**Caveats / next:** worst-case 0.867 ≈ 1.5× the observed noise band — a production loop would keep
iterating (other levers: getQuote/generateQuote tool DESCRIPTIONS) toward ≥3×; the suite here is one
fork-pair — production = harvest fork-pairs from every flippy case (they are enumerable: the diverged
sets); harness bytes ≠ Mastra wire bytes (zod drops param descriptions) — process identical, absolute
margins shift. Also still open: guards/redrive for decisions that resist margin-widening, fixed cache
discipline for any full-run A/B, majority-of-3 judging for borderline rubrics.

## Part 5 — Etapa 1.4: the from-scratch regeneration (the real test of the process)

`atlas-r1` = the WHOLE skill re-run E2→N→T from scratch (5 blind Opus drafters, corrected references,
NO telegraphic restyle) on the FROZEN inputs (theme/tools/evals/judge/CASE-MAP) — the banana-to-banana
comparison against the blind Mastra arm's subject.

| stage | FL (cloud) | ram24 (local) | note |
|---|---|---|---|
| **iter 1** (first shot, zero fixes) | **55/61 = 90.2%** | **54/61 = 88.5%** | zero autofails BOTH tiers; v1-era skill's v2 opened at 82.0 local and needed 3 iters to reach 90.2 FL |
| iter 2 (T2: 9 prose fixes across the 6 fail classes + case-11 mutator ported from Etapa 1.3 + case-66 regex fix) | **59/61 = 96.7%** | **57/61 = 93.4%** | both tiers ABOVE the 90.2 bar → STOP RULE fires |

The headline: **the corrected skill reaches the certified v1 bar on its FIRST from-scratch shot, on
BOTH tiers at once, with zero autofails** — and the SAME single spec source clears the bar on cloud
AND local without a per-tier fork (the v2/v3 saga needed one). The N4 review caught the systemic gap
(permission/hold gates prose-only in 3 specs) and it was fixed BEFORE any run — the process front-loaded
what the old loop discovered case-by-case. Per-tier measurement (the A3 rule) meant the local tier was
never invisible: iter-1 measured 88.5 local the same round it measured 90.2 FL.

Residual (post-STOP, documented ceiling): FL {71, 72}; ram24 {51, 64, 70, 71}. 71/72 are the
language-layer maintenance-contradiction + scope-defer pair that failed on every arm and quant since v1
— the F4/guard-or-ceiling class, not flip noise.

## Part 6 — certification (banded) + provenance

Server pinned: ram24 IQ2_XXS, MTP OFF, `--no-warmup`, `-np 1`, `--cache-ram 16384`.

| target | result | note |
|---|---|---|
| **FL (flash-lite) N=3** | **59/59/59 = 96.7%** | byte-stable across all 3 reps; identical fails {71, 72} every rep — cloud is deterministic here |
| **ram24 N=1 + band** | **57/61 = 93.4%**, perturbed variant 56/61 | 1-flip band (case 32) under an inert byte — well above the 90.2 bar; local reps are byte-identical (D20) so the band, not extra reps, is the honest error bar |

Certified bundle: `atlas-r1` (from-scratch, corrected skill). Both tiers pass the 90.2 bar from a
SINGLE spec source — the 1-spec-N-profiles claim holds without a per-tier fork. Certification is
bound to the artifact + this server config; any spec edit or serve-flag change re-opens it.

## Part 7 — the MTP A/B (does speculative decoding cause the flips?)

Same bundle (`atlas-r1`), same full-61, same pinned server EXCEPT `--spec-type draft-mtp` on vs off.

| | result |
|---|---|
| byte-identical trajectories (MTP off vs on) | **32/61** — MTP changes the output on **29/61 cases** |
| verdict flips | **5** (net −3): 02, 28, 32, 72 pass→fail; 51 fail→pass |
| new hard failure | **02-dispatch-technician-happy AUTOFAILS with MTP on** (required `dispatchTechnician` never called) — a happy path, broken deterministically, exactly like case 02 regressed under Q4 |
| score | MTP off **57/61 (93.4%)** → MTP on **54/61 (88.5%)** |

**Verdict: MTP is a REAL and LARGE perturbation — bigger than a placebo byte (which diverges ~16/19
and flips ~3), and it is NET-NEGATIVE here (−3 cases, incl. a broken happy path).** Mechanism
confirmed: speculative verification computes logits in a different batch shape than token-by-token
decode, so on the near-tie decisions (Part 1) the argmax lands differently — 29/61 divergences, 5
verdict flips. It is NOT the sole cause of the original flips (cache-state noise flips cases with MTP
entirely off — E0/E3), but it is a second, independent, larger source.

**Operational consequences (fold into the certification rule):**
1. **MTP is a serving-config variable that changes correctness, not just speed** — pin it, and
   certify the config you deploy. The certified `atlas-r1` local number (57/61) is an **MTP-OFF**
   number; deploying with MTP on is a different, lower-scoring config.
2. For a QUALITY-certified local deployment, prefer **MTP off** (or re-certify with MTP on and accept
   the −3). The decode-speed win of MTP (D4b) trades against ~3 cases of correctness on this subject.
3. The margin instrument must probe with **speculative OFF** (it already does) to read the true
   distribution — MTP would mask the near-tie.

## Part 8 — Atlas v2 (atlas-r2) ram24/MTP-ON honest band (2026-07-17)

Re-ran the perturbed band on the CURRENT reference (Atlas D24 base, bundle `atlas-r2`) at the exact
deploy config — ram24 `Qwen3.6-35B-A3B IQ2_XXS` on `:8081`, `--spec-type draft-mtp` (**MTP-ON**),
recipe env `SELECTOR=1 SLIM_TOOLS=1 STABLE_PREFIX=1`. K=3 replicates, one distinct inert byte each
(a double-space in a prose directive; `checkCall` unaffected). Opus ruler-v2 judge.

| replicate | inert byte | pass | rate |
|---|---|---|---|
| p1 | rentals directive | 56/61 | 91.8% |
| p2 | billing directive | 56/61 | 91.8% |
| p3 | admin directive | 56/61 | 91.8% |
| **min / med / max** | | **56/61** | **91.8%** |

- **55 stable PASS · 4 stable FAIL** (`02-dispatch-technician-happy`, `70-retire-and-transfer-same-turn`,
  `72-scope-defer-and-garbled-recovery`, `84-invite-at-seat-cap-deny`).
- **2 near-tie coins that FLIP:** `25-refund-above-cap-deny` (fails p2 only) and
  `32-garbled-amount-one-question` (fails p1 & p3). **Exactly one of the two fails per replicate** →
  rate pinned at 56/61 while the failing case swaps. No coin moved money or committed a destructive
  action — pure prose/branch near-ties.
- **The N=1 over-counts.** The prior byte-identical N=1 (MTP-off) read 57/61 = 93.4% — that single
  decode caught BOTH coins (25 & 32) in their pass state. Any inert perturbation knocks exactly one
  down → **the honest floor is 56/61 = 91.8%**, ~1.6 pt below the N=1. **MTP-ON reproduced the
  identical stable core and the identical two coins** as the MTP-off run (D4b: byte-identical with MTP).
- **Honest cert:** atlas-r2 on ram24/MTP-ON = **56/61 = 91.8%** (K=3 inert-byte band), above the
  90.2% D24 ram24 bar; the error bar is the flip between two coins, not the rate.

**Operational gotcha found:** `scripts/s15-run-set.sh` did not export the model endpoint —
`qwen36-local` defaulted `baseURL` to ollama `:11434`, so a naive invocation hit nothing and every
case autofailed with `observed [(none)]` (the mechanism behind an earlier mass-zero run). Fixed: the
script now defaults `OLLAMA_BASE_URL=http://127.0.0.1:8081/v1` for `*-local` aliases when unset.

Provenance: `bench/results/2026-07-17-atlasv2-band-ram24-mtpon-p{1,2,3}/` + perturbed bundles
`bench/adapters/s15/agents-generated/atlas-band-p{1,2,3}/`.
