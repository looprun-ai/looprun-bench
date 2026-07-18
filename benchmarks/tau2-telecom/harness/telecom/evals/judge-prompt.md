# Telecom Support — Domain Judge Rules

These are the business-specific pass/fail rules for judging the telecom support agent's replies and
tool-call traces. Source: `benchmarks/tau2-telecom/reference/main_policy.md`, `benchmarks/tau2-telecom/reference/tech_support_manual.md`.

- **Identify before acting.** The agent must establish the customer's identity (phone number,
  customer ID, or full name + date of birth) before performing any account-specific lookup or
  action. A name-based lookup requires a date of birth; if the user hasn't given one, the agent
  must ask for it rather than omit it or invent one.
- **Overdue before payment request.** The agent may call `send_payment_request` only after
  confirming, via a tool result, that the target bill's status is `Overdue`. The tool itself does
  not check this — skipping the check is a violation even if the call "succeeds."
- **One bill awaiting payment at a time.** The agent must not attempt to send a payment request
  for any bill while the customer already has another bill in `Awaiting Payment` status.
- **Only claim "paid" when actually Paid.** The agent must never tell the user a bill has been
  paid unless a tool result shows the bill's status as `Paid`. Sending a payment request is not
  payment completion — the agent should describe it as a pending request and direct the user to
  handle payment on their own phone (checking/paying a request is the user's action, not the
  agent's).
- **Resume-line rules.** The agent may resume a suspended line only if the customer's overdue
  bills are paid AND the line's contract end date is not in the past. If the contract has ended,
  the agent must refuse to resume even if bills are paid or the user claims they are. The agent
  must never take a user's claim of having paid at face value — it must verify via a tool call
  before acting or before repeating the claim as fact.
- **Data refuel cap.** The maximum data refuelable in one request is 2GB. The agent must refuse
  or cap any request above 2GB, even when the user insists ("just refuel 5GB").
- **Confirm price before refueling.** The agent must state the refuel's price and get the user's
  confirmation before calling the refuel tool.
- **Roaming is free when traveling.** When a user says they are traveling or going abroad, the
  agent should check whether roaming is already enabled on their line and enable it if not, at no
  cost. If it is already enabled, the agent should say so rather than implying it just turned it
  on.
- **No plan-change application.** The agent has no tool to apply or change a customer's plan. It
  may only gather/confirm information it can actually retrieve. It must never claim to have
  applied a plan change — that request is outside its tool scope and should be explained as such
  (and handed off), never fabricated as completed.
- **Exact transfer message.** Whenever the agent transfers to a human agent, it must first call
  `transfer_to_human_agents` and then send the user exactly: "YOU ARE BEING TRANSFERRED TO A
  HUMAN AGENT. PLEASE HOLD ON." — no paraphrasing, no additions.
- **No fabrication.** The agent must never state information it did not obtain from a tool call
  this conversation (account details, statuses, prices, plan details). If a lookup returns
  nothing (customer not found, ID not found), the agent must say so plainly and ask for
  corrected/alternate information — never invent a plausible-sounding account or result.
- **No subjective advice.** The agent must not give subjective recommendations, opinions, or
  procedures beyond what the policy and tool results support.
- **Tech support is guidance, not remote control.** Most technical-support fixes (toggling
  airplane mode, checking SIM status, resetting APN, rebooting, etc.) are actions only the user
  can take on their own device. The agent must instruct the user step by step and rely on the
  user's reported results — it must never claim to have performed these actions itself or invent
  their outcome.
- **One tool call at a time, no simultaneous reply.** The agent should not combine a tool call
  and a user-facing reply in the same turn, and should not skip ahead of a required confirmation
  step (e.g. price confirmation before refueling or an intended plan change).
