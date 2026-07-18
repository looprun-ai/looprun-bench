# REVIEW.md — telecom-support (agentspec pipeline, Stage N provenance)

Adversarial review of the generated `telecom-support` spec + `TELECOM_THEME`, per
`.claude/skills/agentspec/references/adversarial-review.md`. 5 independent reviewers (fresh contexts)
+ orchestrator-as-verifier (recall-biased). Round 1; no round 2 needed (all CONFIRMED findings fixed,
residuals logged). Mechanical gate (`looprun-eval lint --spec-laws`) clean before and after.

## Reviewers & findings

### N1 — MAGNET RED-TEAM (S-1 firewall / magnet law) — **CLEAN**
No check, scope decision, or directive reads user intent/text. All 8 guard `check()`s read only
`ctx.args` / `ctx.world` (the accessors) / `ctx.observed`. Lexicon reply-regexes match the agent's OWN
claim (honesty), never the user's request. `stateBlock` reads projection only. Tool-scoping is
tool-need/state, not intent. No finding.

### N2 — BUCKET-A AUDITOR — 1 CONFIRMED (fixed)
- **N2-1** `theme.ts` `languageClause` asserted the absolute "Every prompt you receive is in English"
  — a fixed-state assertion (false for a non-English turn). **Verdict:** CONFIRMED (cheap, correct).
  **Fix:** rewritten as a conditioned rule ("regardless of the incoming language, detect it and reply
  entirely in the customer's language; default English when undetermined"). E3 re-lint + typecheck green.

### N3 — COMPOSITION ADVERSARY — 2 PLAUSIBLE (logged residuals; not release-blocking)
- **N3-1** the two `resume_line` gates are keyed on the tool, not on `lineStatus === 'Suspended'`, so
  they could wrongly deny resuming a `Pending Activation` line whose owner has an unpaid overdue bill.
  **Verdict:** PLAUSIBLE. **Resolution:** LOGGED RESIDUAL — unreachable in the eval set (no preset or
  τ² telecom task carries `Pending Activation`; this agent has no line-provisioning flow). The measured
  loop is the backstop; revisit only if a task exercises it (then gate on `lineStatus === 'Suspended'`).
- **N3-2** in the benchmark SHIM's REPLAY world, a `null` accessor (state not yet observed) makes the
  resume/payment gates fail OPEN (permissive), the opposite of a wrongful deny. **Verdict:** PLAUSIBLE.
  **Resolution:** LOGGED RESIDUAL for the benchmark stage — a policy-compliant transcript populates the
  accessor before acting; in the LIVE eval world `null` means "no such record" and the world rejects
  independently, so certification is unaffected.

### N4 — COVERAGE CRITIC (recall) — 4 CONFIRMED + 1 PLAUSIBLE (all fixed) + 1 hardening
- **G1** "only ONE bill in AWAITING PAYMENT at a time" (main_policy.md:116) had no gate/prose (tool +
  eval 06 only). CONFIRMED → **fixed**: new world accessor `customerHasBillAwaitingPayment` (eval world
  + shim adapter), new preTool gate `agent:noConcurrentAwaitingPayment` on `send_payment_request` +
  conditioned prose.
- **G2** technical support is GUIDANCE-ONLY (agent guides device-side steps, never claims to act on the
  device) lived only in the code header. CONFIRMED → **fixed**: added a conditioned `behavior[]` line.
- **G3** "try to resolve before transferring" (main_policy.md:15) had no prose. CONFIRMED → **fixed**:
  added a conditioned `behavior[]` line before the exact-transfer-message line.
- **G4** no tool LISTS plans (only `get_details_by_id` for a known id) — enumerating alternatives would
  fabricate. CONFIRMED → **fixed**: plan-change behavior line strengthened ("do not enumerate/invent
  other plans") + a new `// UNCHECKABLE` header entry.
- **G5** tech-support escalation paths thin in the eval set. PLAUSIBLE → **fixed**: added cases
  `16-sim-locked-escalate` (locked SIM → escalate/transfer) and `17-apn-reset-reboot-guidance`
  (guidance-only APN reset → reboot).
- **Hardening** name lookup requires DOB (main_policy.md) → added `argRequired('dob')` on
  `get_customer_by_name` (`agent:argRequiredDob`).

### N5 — PURITY / FIREWALL LINT (mechanical) — **CLEAN**
`looprun-eval lint --spec-laws` clean (purity, stateful-regex, S-1 firewall, theme-persona, + config
spec laws: persona present, ≤15 tools, no own systemPrompt, caseMap sane). No finding.

## Post-fix gate
All three packages typecheck green; `looprun-eval check` green; `looprun-eval lint --spec-laws` clean;
17 cases, `caseMap` covers each exactly once.

## Stage T (measured loop) — see CERT.md
The measured loop (`looprun-eval run` → Claude judge → classify → fix → `certify` N=3) results and any
further fixes are recorded in `CERT.md` (the ship bundle).
