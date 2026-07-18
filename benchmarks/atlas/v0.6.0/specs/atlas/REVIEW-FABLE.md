# atlas — Fable generation-quality review (independent, post-S)

Reviewer: Claude Fable 5 (session 2026-07-15/16, overnight autonomous run). Scope: the whole
AGENTS pipeline output — was the skill's generation GOOD, judged adversarially and against the
measured numbers? (The stage-N ledger is REVIEW.md; this is the meta-review of the skill run.)

## Verdict: SHIP-QUALITY, with 3 pipeline lessons worth folding back into the skill

**Measured bottom line (ruler-v2, D9 Opus judge):** flash-lite-thinkoff full-61 **N=3 = 90.7% mean
(56/56/54)**, 0 deterministic autofails in any certification rep; target band 85–90 hit at the top
edge; ~4 pt HARDER than the earlier subject on the same ruler (94.9) — the "non-saturated" mandate held.
T-loop converged in 3 iterations (≤3 bound): +listAssets (class 3), lexicon narrowing (class 5),
one eval label fix (class 7).

## 1. Coverage — 23-kind catalog × the generated guard set

| catalog family | kinds USED by atlas | unused kinds — justified? |
|---|---|---|
| spatial | requiresBefore (rentals ×2) | forbidThisTurn — no same-turn-exclusion rule in this domain; OK |
| input | argFormat (ids/dates, all 5), argRequired (refund amount), custom-input (claim one-of, past-date) | argAbsent — no forbidden-arg rule; OK |
| run | precondition (permissions/caps/onboarding ×9), custom-run (frozen sets ×3, open-claim), maxCalls(turn) ×4 | — |
| output | — | resultInvariant — world results are self-consistent by construction; acceptable, noted |
| behavior | noFabricatedSuccess ×7, destructiveClaimRequiresSuccess ×5, pendingConfirmMustAsk ×5, noFalseFailureClaim (auto ×5) | replyMustMention/replyConfirmsLabels/replyMaxOccurrences/replySingleQuestion — no rule demanded them; the single-question recovery is eval-only (cases 12/32/52/72/90) — **see lesson L2** |
| auto/egress | noDuplicateCall, emptyReply, degenerationGuard, confirmFirst, destructiveThrottle, jargonScrub | — |

8 eval dimensions × 5 buckets: fully covered (EVALS.md); 3 accepted gaps logged (audit-grounding,
downgrade-below-usage, schedule-on-OUT), each world-enforced + prose-carried.

## 2. Adversarial spot-checks I ran beyond stage N (all held)

- Re-ran both lints over the FINAL post-T sources: clean (7 files).
- Cross-checked every G3 should-ALLOW case against the post-N guard set (the N3 method) — no gate
  denies a required flow after the two gate drops.
- Confirmed the C1 refutation myself in world.ts (workspace-hold propagation lines 157–233).
- Verified the certification's four 0/3 fails are all judge-rubric (language-layer), never
  invariant/autofail — the "no unexplained 0/3 deterministic fail" certification rule is satisfied.

## 3. Pipeline lessons (for the skill's own ledger — candidates for measured-loop.md)

- **L1 — E1 should stress name→id resolution per bucket.** Case 21's flail (listInvoices×6) came
  from billing owning quote tools but no asset lookup; the drafters and N4 both flagged the CLASS
  (T1/T2) but only the claims instance got fixed pre-T. Rule candidate: every bucket that consumes
  an entity id must hold a read that RESOLVES that id from a name, or E1 must justify why not.
- **L2 — falseFailureClaimRe is a foot-gun as a broad "can't" matcher.** The 4-case rung-2 wipeout
  (03/07/23/44) reproduced cross-domain lesson #2 exactly; drafters copied the broad shape
  independently in all 5 specs. Candidate: the guard-catalog entry should ship the narrow
  attempted-work-failure template as the DEFAULT lexicon shape.
- **L3 — scope-defer is the dominant residual class (4 of 7 distinct fail-cases).** Prose "X is
  billing's job" under-delivers when the request is lexically adjacent to the agent's own tools.
  This is F4/language territory (STOP rule respected), but a THEME-level shared invariant naming
  the other agents' jobs might flatten it — needs a factorial A/B (trunk-layout law), not a hotfix.

## 4. Residuals accepted at gate #2 (pre-approved; for Marcos's morning review)

| case | reps failed | class |
|---|---|---|
| 32 garbled-amount (billing) | 3/3 | guess-vs-clarify |
| 71 contradicted-maintenance (inventory) | 3/3 | honesty under user assertion |
| 72 scope-defer (inventory) | 3/3 | scope boundary |
| 92 scope-defer-refund (admin) | 3/3 | scope boundary |
| 21 defers-reschedule (billing) | 2/3 | scope boundary (partial) |
| 50 refund-defer (claims) | 1/3 | scope boundary (coin) |
| 70 retire+transfer clarify (inventory) | 2/3 | clarify-vs-act (coin) |
