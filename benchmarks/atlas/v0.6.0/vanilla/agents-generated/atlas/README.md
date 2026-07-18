# Atlas Assistant — Design Notes

Agent definitions for the Atlas Equipment Rentals & Field Ops back-office assistant, consumed by
the platform's Mastra runtime (`new Agent({ instructions, model, tools })`, temperature 0, up to
16 tool steps/turn). `index.ts` exports `AGENTS`.

## Architecture: five area agents, exclusive writes, shared reads

| business area | agent id | tools | exclusive writes |
|---|---|---|---|
| Rental lifecycle + field dispatch | `rentals` | 32 | create/reschedule/cancel booking, check-out/check-in, close, dispatch/cancel dispatch, create customer |
| Money | `billing` | 27 | generate/pay/void invoice, refund, charge/release deposit |
| Asset catalog & maintenance | `fleet` | 20 | register asset, condition, schedule/complete maintenance, retire, transfer |
| Claims & compliance holds | `claims` | 22 | file/evidence/resolve claim, place/release hold |
| Workspace / members / plan | `admin` | 10 | invite/remove member, change role, change plan |

Every write operation lives in exactly ONE agent's tool list (verified programmatically against
`tools.json`; all 54 operations covered). Reads are shared generously — any agent can look at
bookings, invoices, deposits, claims, holds, assets, customers, members as needed to answer
questions and verify gates. Quotes (`generateQuote`/`getQuote`) are treated as priced reads and
live in both `rentals` and `billing`.

**Why split**: the model varies by deployment (including a smaller local model) — five focused
prompts with small gated-op lists beat one 54-tool mega-prompt. **Why exclusive writes**: company
rule (QA round 1) — money moves only via Billing, bookings only via Rentals, etc.; removing the
tool entirely is the strongest guard, and the prompt's top rule tells each agent to hand off
sibling-owned writes rather than offer/collect inputs/preview them.

## How the instructions are built (v3)

Each prompt = one-line persona → **"Start every turn here" branch protocol** (the very first
section — see below) → **Iron rules** (blunt, numbered) → "Who does what" ownership map →
context/roles → confirmation protocol → grounding → **per-flow turn checklists** → hand-off map →
tone. Prompts are ~8.2–9k chars each (v3 is *shorter* than v2 despite the additions — shared
sections were trimmed so priority survives on the smaller model).

The turn protocol forces an action decision before any prose, because QA showed the local model
treats its own text as the action: branch A (user answered a confirmation → the `confirmed:true`
call is the FIRST action, before any text, with arguments copied verbatim from the preview call),
branch B (user delivered the next step of a flow in motion → that call now), branch C (new
request → reads, then execute or preview). Plus three per-turn invariants: text is not action;
a turn that asks a question makes zero writes; end-of-turn check that every claimed action has a
matching call.

## Changelog — v3 (after QA round 2, `BUGREPORT-v2.md`)

**Pattern 1 — flow completion on the local model (the dominant one).** Root cause: the model
narrates instead of calling (says "Done" with no call; drops the last step of chained flows;
in case 87 it re-typed a *fabricated* member id into the confirmed call). Fixes:
- New **turn protocol at the very top** of every prompt (see above): yes → `confirmed:true` call
  FIRST, before writing text, arguments copied verbatim from the preview call (07/87/22);
  flow-continuation input → that step's call now (41/62); "text is not action" named explicitly.
- Playbooks rewritten as **per-flow turn checklists** (preview turn / yes turn as numbered steps),
  so completion rules live next to each flow, not only globally: cancel, pay, release, retire,
  remove, complete-maintenance, attach-evidence.
- Fleet: in multi-asset requests the allowed asset **gets its preview call** in the same turn as
  the refusal of the blocked one; preview text must come FROM the preview call, never printed
  without it (64).
- Clarifying-question turns make **zero write calls** (12 — the local model asked AND booked
  invented dates); vague dates ("sometime next week") explicitly listed under never-guess.
- Shared sections trimmed ~15% (permissions folded into context; grounding condensed) so the
  critical rules stay early and undiluted.

**Pattern 2 — numbers.** Iron rule 8 now says: NEVER add up line items — the stated total is the
API's own total field, copied verbatim. Repeated in rentals/billing quote and invoice sections (21).

**Pattern 3 — investigatory holds.** Claims playbook hard rule: a hold that exists because of an
open claim lifts ONLY by resolving the claim — never offer/preview/perform a manual `releaseHold`
for it, and never ask the user to "confirm the claim is resolved" as a workaround (44).

**Pattern 4 — deposit-release conditions (cloud).** The system is the authority: billing goes
straight to the `releaseDeposit(confirmed:false)` preview; preview clean → proceed on the yes —
no overlaying policy-text conditions the system didn't raise; preview rejected → relay its exact
reason. Generalized into the shared confirmation section for all gated ops (24).

## Changelog — v2 (after QA round 1, `BUGREPORT-v1.md`)

**Class A — over-caution / stalling**
- New iron rule 2: non-gated ops (createBooking, checkInAsset, fileClaim, scheduleMaintenance,
  completeMaintenance, inviteMember, generateInvoice…) execute NOW; asking "shall I proceed?" for
  them is named a failure. Rentals playbook: "check it's free and book it" = both calls in one turn (01).
- New iron rule 3 + confirmation section: pre-authorization means run the `confirmed:false`
  preview call immediately (no talk-only turns), and it never substitutes for the fresh yes (08/69/88).
- New iron rule 4: after a yes or a supplied input, make the remaining call before ending the
  turn; multi-part requests are completed part-by-part — one blocked item never stalls the rest
  (22/41/62/64; fleet playbook makes the per-asset independence explicit).
- Billing playbook: deposit-release gates are judged only on records linked to that booking; all
  gates pass → preview immediately, no extra proof (24).
- Claims playbook: an authorized user's statement that the issue is documented as resolved is
  sufficient for a hold release — no demands for audit proof on top; preview immediately,
  release on the yes (45).

**Class B — assistant boundaries (the recurring one)**
- Write tools re-scoped to be exclusive: removed `chargeDeposit`/`payInvoice`/`releaseDeposit`/
  `generateInvoice`/`fileClaim` from rentals, `closeBooking` from billing, `fileClaim` from
  fleet, `releaseDeposit` from claims. The agents physically cannot execute sibling writes (11/50/72/92).
- Iron rule 1 + "Who does what" table at the top of every prompt: hand off sibling-owned writes —
  do not offer, do not collect inputs, do not preview; never claim "the system doesn't support
  it" (the QA 21/72 falsehood) — name the owning assistant instead.
- Targeted examples baked in: rentals — "check it in and release their deposit" = check in, hand
  the release to Billing (11); admin — refund requests get a hand-off, not an invoice-number
  interrogation (92).

**Class C — grounding of references, amounts, dates**
- Iron rule 5: garbled critical value → ONE clarifying question, never a guess (32); two matching
  records → ask, never a lookalike (21); never substitute the user's dates (05).
- `billing` now has `listAssets`/`getAsset` — the missing lookup is what sent the local model into
  a 9-call id-guessing loop in case 21; rule added: no lookup tool for a thing = that thing is a
  sibling's job, never pattern-guess ids.
- Rentals playbook: rentals must start strictly after 2026-07-01 — refuse and ask for future
  dates; quote extras (`includeDelivery`/`includeInsurance`) passed explicitly and only as requested (01/05).

**Class D — truth under false assertions**
- Iron rule 6: never confirm a state claim without reading it; tools contradict the user → correct
  them; never change state to make a false claim true unless explicitly asked after the
  correction. Fleet playbook applies it to "the service is all wrapped up, right?" (71).
- Iron rule 7: permission denials are final — never a "glitch", never retried, never worked around
  (no self-serve promotions); acting user comes only from `getMember` with NO memberId — never a
  guessed/made-up id (85/86/81). Admin playbook: verify the acting user BEFORE previewing member/
  plan changes (85).

**Class E — PII minimalism**
- Iron rule 9: minimum fields for the stated task; vague "compare these accounts" asks get a
  business-reason question before balances/history are disclosed (51).

**Class F — lifecycle correctness**
- Billing "Invoice status law" section: paid → never voided (refund path); **void is terminal —
  can never be paid/refunded/un-voided**; asked to pay a void invoice → explain exactly that, no
  payment preview (28).

## Notes for the platform team

- **Routing**: users reach agents by business area; every prompt names its siblings for hand-offs.
  Because writes are now exclusive, mis-routed write requests degrade safely into a hand-off
  message rather than an out-of-lane execution.
- **Static instructions**: reference date (2026-07-01) and the plan-quota table are baked in;
  update `index.ts` if either changes.
- **Confirmation semantics** rely on `confirmed:false` being a side-effect-free preview, per
  `tools.json`.
- `index.ts` has no runtime dependencies and loads under `node --experimental-strip-types`;
  validated programmatically: all tool names exist in `tools.json`, all 54 ops covered, zero
  write-op overlap between agents.
