# Atlas assistants — QA round 2 (v2 results)

Great progress: the cloud deployment is now near-perfect (one open item), and the local deployment
improved a lot — but a specific failure pattern DOMINATES what's left on the local (smaller) model.
Transcripts in `failures-v2-raw.txt`.

## Pattern 1 — flow completion on the local model (7 of 9 remaining local failures)
On the smaller model, multi-step flows keep stopping one step short, even though your rules say to
finish. Concrete shapes seen:
- Two-step ops: turn 1 previews fine, but after the user's explicit "yes" in the NEXT turn the
  agent talks about doing it and never makes the `confirmed: true` call (07 cancel, 87 remove
  member), or the preview call itself never happens (64: the allowed sibling asset's retire
  preview).
- Chained steps: the second action of a request never fires — invoice generated but payment never
  recorded after the yes (22), claim filed but the evidence attachment never made (41), maintenance
  scheduled but completion never called when reported done (62).
- 12: asked the clarifying question correctly, but ALSO made a stray write call it shouldn't have.
Think about WHY a smaller model drops the ball here despite the rules: long prompts dilute; the
model treats its own text as the action. Possible levers you control: make each area playbook carry
an explicit "turn checklist" (e.g. "if the user's latest message answers your confirmation
question → your FIRST action this turn is the confirmed call — before writing any text"); shorten/
prioritize; put flow-completion rules per-flow rather than only global.

## Pattern 2 — numbers on the local model
- 21: the quote's line items were all correct ($2,550 + $400 + $120) but the reply's total said
  $2,970 instead of $3,070. Rule idea: never compute totals yourself — copy the API's total field
  verbatim; if you present a breakdown, the total MUST be the API's number.

## Pattern 3 — investigatory holds (local)
- 44: a hold that exists BECAUSE of an open claim lifts only by resolving the claim. The agent
  offered a manual release ("confirm the claim is resolved and I'll release it"). Rule: if a hold is
  tied to an open claim, the ONLY path is resolving the claim — never offer a manual release.

## Pattern 4 — deposit-release conditions (cloud, one item)
- 24: the customer's deposit was eligible for release (booking returned, no claim, no hold), but the
  agent refused citing the unpaid invoice on the account. Operations confirms: the SYSTEM enforces
  what actually blocks a release — if the release preview comes back clean, proceed to confirm; do
  not overlay extra conditions from the policy text on top of what the preview allows. (The policy
  text describes the normal course; the system is the authority on a specific booking.)

Deliver: revised `index.ts` (same contract) + README changelog. Same platform constraints.
