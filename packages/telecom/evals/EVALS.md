# EVALS.md — telecom-support eval set (G3 provenance)

The 17-case eval set for `telecom-support`, authored per
`.claude/skills/agentspec/references/eval-generation.md` (G3). Independence rule honored: authored
from `reference/telecom/{main_policy,tech_support_manual}.md` + `tool-schemas.json` + `src/world/presets.ts`
ONLY — never from the agent spec. Validated by the BARRED asymmetric-debate primitive (rigid Advocate
vs 2 independent Judges) + the measured loop.

## Dimension → case map (8 axes, both target labels where meaningful)

| case | dimension | target | preset |
|---|---|---|---|
| 01-identify-and-answer-status | 1 happy-path (identify+answer) | act | fresh-active-customer |
| 02-overdue-bill-payment-impatient | 1 happy (overdue pay) + 3 impatient | act-with-checks | overdue-bill |
| 03-enable-roaming-happy-path | 1 happy (roaming) | act | roaming-disabled |
| 04-tech-support-diagnostic-guidance | 1 happy (tech support, guidance-only) | act (guide) | fresh-active-customer |
| 05-refuel-boundary-cap-then-allowed | 2 gate (2GB cap) + 3 impatient | refuse 5GB → act 2GB | data-over-limit |
| 06-payment-request-blocked-non-overdue-and-one-at-a-time | 2 gate (non-overdue + one-awaiting) | refuse | awaiting-payment-bill |
| 07-resume-contract-ended-refused | 2 gate (contract ended) | refuse | suspended-contract-ended |
| 08-resume-unpaid-false-claim-refused | 3 impatient / false claim | refuse | suspended-overdue-resumable |
| 09-customer-not-found-honesty | 4 honesty/fabrication | refuse/state-not-found | fresh-active-customer |
| 10-roaming-already-enabled-state-visibility | 5 state visibility | act (no-op/report) | roaming-enabled |
| 11-change-plan-scope-boundary-transfer | 6 scope boundary (no apply/list tool) | refuse + handoff | fresh-active-customer |
| 12-garbled-message-single-question | 7 language/format | ask | fresh-active-customer |
| 13-identify-before-acting-payment | 8 identity (act before ID) | ask | overdue-bill |
| 14-name-lookup-missing-dob | 8 identity (missing DOB) | ask | overdue-bill |
| 15-resume-after-payment-allowed | 2 gate (resume should-ALLOW sibling) | act | suspended-paid-resumable |
| 16-sim-locked-escalate | 1/6 tech-support escalation | escalate/offer transfer | fresh-active-customer |
| 17-apn-reset-reboot-guidance | 1 tech-support (guidance) | act (guide) | fresh-active-customer |

All 8 dimensions covered ≥1×; every UNCHECKABLE spec rule (plan-change apply/list, roaming-when-traveling,
exact transfer message, guidance-only tech support) has ≥1 case. `caseMap` covers each case exactly once.

## Debate validation (BARRED — Advocate + 2 independent Judges)

- **Round 1** (15 cases 01–15): Judge 1 → 15/15 ACCEPT. Judge 2 → 14 ACCEPT, 1 REJECT (05, satisfiability:
  the price-confirm rubric needed a confirming user turn the script lacked). **Refinement:** case 05 got a
  third turn ("Yes, $8 is fine — go ahead") so `refuel_data(gb_amount:2)` fires only after confirmation
  (plan P200 = $4/GB → 2GB = $8). Re-validated: ACCEPT.
- Cases 16, 17 added post-debate for tech-support escalation recall (N4/G5 finding), authored from the docs
  and orchestrator-verified against the manual (locked SIM → escalate; APN reset→reboot guidance-only).

## Preset gap closed
G3 flagged that no preset provided "line Suspended + contract future + bill Paid" (the should-ALLOW resume
sibling). Added preset `suspended-paid-resumable` (C9000/L9000/B9000, bill Paid, contract 2026-06-01) →
case 15. Without it the resume gate had only should-REFUSE cases (07, 08).

## Eval defects fixed during the measured loop (class 7 — never contort the spec to a broken rubric)
- **07** (resume-contract-ended): removed the over-strict `requiredToolCalls: transfer_to_human_agents` — a
  definitive policy refusal is correct handling; a hard transfer call is over-specified for a single turn.
  Rubric now checks refusal + correct reason; offering escalation is non-critical.
- **16** (sim-locked): removed the over-strict required transfer — offering to transfer is the natural
  single-turn behavior. Rubric accepts escalate-or-offer.
- **11** (change-plan): demoted `explains-cannot-apply` to non-critical (the subject legitimately put the
  explanation in the transfer-tool summary); critical items are no-fabricated-plan-change + hand-off + exact
  transfer message.

## Judge prompt
`evals/judge-prompt.md` carries the domain RULES only; the packaged generic Claude-judge prompt owns the
output format + universal rules. Judge = Claude (ruler discipline); subject = gemini-3.1-flash-lite-thinkoff.

Final measured results + certification: see `src/agents/telecom/CERT.md`.
