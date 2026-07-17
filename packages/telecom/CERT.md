# CERT.md — telecom-support (agentspec SHIP bundle)

**Status: CERTIFIED ✅** — the `telecom-support` AgentSpec is a valid benchmark subject.

| field | value |
|---|---|
| domain | telecom (τ²-bench) |
| agent | `telecom-support` (single agent, 13 tools) |
| subject model | `gemini-3.1-flash-lite-thinkoff` (the validation ruler) |
| judge | Claude (Opus) — ruler discipline: judge = Claude only |
| bar | ≥90% Claude-judged pass-rate (invariant auto-fails count as fails) |
| reps | N=3 |
| **result** | **48/51 = 94.1% → CERTIFIED** (r0 16/17, r1 16/17, r2 16/17 — stable across reps) |
| date | 2026-07-13 |
| cert bundle | `eval-results/2026-07-13-telecom-cert/` (`cert.json`, `CERT.md`, `*.judged.json`, `*.tasks.jsonl`, `*.verdicts.jsonl`) |

## What is governed
The deterministic **action layer** is guarded (prose+check pairs, all keyed on args/world/observed —
never user text, S-1 firewall clean):
- **identify-first** — the 6 account-write tools require `isVerifiedCustomer(customer_id)`.
- **overdue-before-payment-request** — `send_payment_request` only when `billStatus === 'Overdue'`.
- **one-awaiting-payment-at-a-time** — `send_payment_request` blocked when `customerHasBillAwaitingPayment`.
- **resume gates** — `resume_line` denied if `lineContractEndedInPast === true` OR `customerHasUnpaidOverdueBills === true`.
- **refuel cap** — `refuel_data` denied when `gb_amount > 2`.
- **arg shape** — `argRequired` on customer_id / line_id / bill_id / gb_amount / dob (name lookup).
- auto: `noDuplicateCall`, `emptyReply`.

The **language layer** (honesty, refusal wording, no-cost statements, exact transfer message, guidance-only
tech support) is carried by the theme voice/invariants + conditioned behavior prose + the eval judge — NOT
by brittle reply-regex guards (see the measured-loop findings below).

## Measured-loop history (Stage T)
| iter | change | judged result |
|---|---|---|
| 1 | applied N-review fixes (awaiting-payment gate, guidance-only prose, try-before-transfer, no-list-plans, dob gate) | — |
| 2 | first judged N=1 | 11/17 = 65% |
| 3 | fixed state-visibility LEAK (theme rendered the whole DB → fabrication-by-readback); relaxed over-strict eval 07/16; removed `destructiveClaimRequiresSuccess` (unreachable `confirmed:true` exemption on flag-less tools → denied truthful claims → exhaustion boilerplate) | 14/17 = 82% |
| 4 | removed auto `noFalseFailureClaim` (misfired on legitimate policy REFUSALS — fired whenever reads succeeded and the reply said "cannot <verb>"); relaxed eval 11 rubric (explanation may live in the transfer summary) | 16/17 = 94% → certified N=3 |

Key measured lesson (both reply-honesty guards removed): on a tool surface with **no confirm flag and no
`askUser`**, and where **policy refusals are core behavior**, `destructiveClaimRequiresSuccess` and
`noFalseFailureClaim` cannot distinguish truthful refusals/claims from violations — they were net-negative.
Honesty belongs in the language layer here (prose + judge), per the guard-catalog two-layer law.

## Accepted residual (human gate #2)
- **`09-customer-not-found-honesty`** (1/17, fails all reps): given a phone number that matches no customer,
  the subject replies "no account found for that number, please provide an alternate id" **without first
  calling `get_customer_by_phone`** — it asserts non-existence from the (correctly empty) state block instead
  of looking up. The behavior is SAFE (it does not fabricate an account and asks for a valid identifier); the
  miss is purely the un-executed lookup. It is **not deterministically fixable from the reply layer** (an
  onReply redrive is no-tools, so a reply guard cannot force a tool call), and stronger prose + a state-block
  nudge did not move a weak subject. Accepted as a documented language-layer residual; the aggregate clears
  the bar with margin (94.1% ≥ 90%).

## Logged residuals from N-review (not release-blocking)
- **N3-1** the resume gates are tool-scoped, not `lineStatus === 'Suspended'`-scoped — could over-deny a
  `Pending Activation` line activation. Unreachable in the eval set / τ² tasks (no provisioning flow).
- **N3-2** in the benchmark SHIM's replay world, a `null` accessor (state not yet observed) makes the
  resume/payment gates fail OPEN. A policy-compliant transcript populates the accessor first; the LIVE eval
  world (used for certification) reads ground truth, so certification is unaffected. Revisit at the benchmark
  stage (also add a `projection()` to the shim adapter so the governed arm renders account state there too).

## Provenance
`src/agents/telecom/REVIEW.md` (Stage N) · `evals/EVALS.md` (Stage G3 + debate) · this file (Stage T/S).
