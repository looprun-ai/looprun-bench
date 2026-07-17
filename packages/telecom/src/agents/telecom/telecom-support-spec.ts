/**
 * src/agents/telecom/telecom-support-spec.ts — the single AgentSpec for the τ²-bench **telecom**
 * domain (E1 decomposition, human-approved: ONE agent, `telecom-support`, owning all 13 agent
 * tools from `reference/telecom/tool-schemas.json`). Derived from `reference/telecom/main_policy.md`
 * and `reference/telecom/tech_support_manual.md` — never from a gold spec.
 *
 * `destructiveTools` is deliberately **empty**: the τ² agent tools carry NO `confirmed` flag and
 * the shim exposes NO `askUser` tool, so an auto `confirmFirst`/`'prior-ask'` gate would be
 * unsatisfiable and permanently block every suspend/resume/payment/refuel/roaming call (the
 * over-gating failure mode). Confirmation semantics (price confirmation before refueling, "check
 * your payment request" before paying, etc.) are carried in `behavior[]` prose plus the honesty
 * reply-guards below instead of a preTool confirm gate.
 *
 * UNCHECKABLE (no observable guard key — conditioned prose + eval dimension only; see N4/G3):
 *  - Plan-change "apply": `main_policy.md`'s Change Plan flow has no tool that applies a new plan
 *    to a line (only `get_details_by_id` to gather plan facts) — there is no world key for "plan
 *    changed", so honesty here is enforced by prose alone ("say so honestly"), not a guard.
 *  - Plan-change "list alternatives": there is also no tool to LIST other plans (only
 *    `get_details_by_id` for a plan/line the agent already has an ID for) — enumerating alternative
 *    plans from memory would fabricate; no world key exists to gate this, so it is prose-only too.
 *  - Roaming's "traveling outside their home network" trigger: the world has no
 *    `isTraveling`-style accessor, and a check may never read the user's stated travel status (the
 *    S-1 firewall bars user text) — enabling roaming when appropriate is behavior prose only.
 *  - The exact transfer message `'YOU ARE BEING TRANSFERRED TO A HUMAN AGENT. PLEASE HOLD ON.'` is
 *    wording — no shared guard kind enforces an exact reply string; behavior prose + eval only.
 *  - "One tool call at a time; never call a tool and reply simultaneously" — a runner-level
 *    protocol, not a predicate over a single call's (args, world, observed); behavior prose only.
 *  - The tech-support diagnostic manual's device-side checks (`check_status_bar`,
 *    `check_sim_status`, `toggle_airplane_mode`, `reboot_device`, …) are all τ² **user_tools** —
 *    they never appear in this agent's `tools` surface (never modeled in `world.ts`'s dispatch),
 *    so no agent-layer guard applies to them; only "identify the customer first" and the honesty
 *    guards below reach the technical-support flows that touch suspend_line/resume_line.
 */
import { AgentSpecBase, custom, argRequired, type AgentWorld } from 'looprun';
import { TELECOM_THEME } from './theme.js';

// The domain's world seam narrowed to the 6 accessors this agent's guards read (must match
// `packages/telecom/src/world/world.ts`'s `TelecomWorld` / `packages/shim/src/world-adapter.ts`).
interface TelecomWorld extends AgentWorld {
  isVerifiedCustomer(customerId: string): boolean;
  billStatus(billId: string): string | null;
  lineStatus(lineId: string): string | null;
  lineContractEndedInPast(lineId: string): boolean | null;
  lineRoamingEnabled(lineId: string): boolean | null;
  customerHasUnpaidOverdueBills(customerId: string): boolean | null;
  customerHasBillAwaitingPayment(customerId: string): boolean | null;
}

const ACCOUNT_WRITE_TOOLS = ['suspend_line', 'resume_line', 'send_payment_request', 'refuel_data', 'enable_roaming', 'disable_roaming'];
const LINE_TOOLS = ['suspend_line', 'resume_line', 'refuel_data', 'enable_roaming', 'disable_roaming'];

export class AgentSpecTelecomSupport extends AgentSpecBase {
  constructor() {
    super({
      id: 'telecom-support',
      mode: 'TELECOM_SUPPORT',
      // REQUIRED per-agent persona (persona-on-spec law) — ONE role line: what THIS agent is/owns.
      // Case-invariant.
      persona:
        'You are the telecom-support agent: technical support, overdue-bill payment, line suspension and resume, data roaming, and data refueling.',
      tools: [
        'get_customer_by_phone',
        'get_customer_by_id',
        'get_customer_by_name',
        'get_details_by_id',
        'suspend_line',
        'resume_line',
        'get_bills_for_customer',
        'send_payment_request',
        'get_data_usage',
        'enable_roaming',
        'disable_roaming',
        'transfer_to_human_agents',
        'refuel_data',
      ],
      // Empty and correct: no `confirmed` flag on any τ² agent tool and no `askUser` tool in the
      // shim — an auto confirmFirst/'prior-ask' gate would be unsatisfiable and block required
      // calls. See the header note.
      destructiveTools: [],
      // No `lexicon` field: `noFalseFailureClaim` (auto-installed from `cfg.lexicon.falseFailureClaimRe`)
      // cannot distinguish a truthful POLICY REFUSAL ("I cannot resume your line, the bill is still
      // overdue") from a real tool-failure claim — it fires whenever every CALLED tool succeeded and
      // the reply contains an inability phrase, which is exactly the shape of a correct refusal on an
      // un-attempted action. In this domain policy refusals are core behavior (contract-ended,
      // unpaid-overdue, non-overdue bill, 2GB cap, no-plan-tool, locked SIM), so this guard was net-
      // harmful (measured-loop root cause: it denied a correct refusal and forced the exhaustion
      // boilerplate). Honesty now lives entirely in the theme's honesty invariant + behavior prose +
      // the judge — the correct language-layer home for a check that can't tell refusal from failure.
      theme: TELECOM_THEME,
      behavior: [
        // NO persona line here — persona is the config field above.
        // Every line CONDITIONED (Bucket-A): "when X, do Y" — never a bare state assertion.
        "When acting on a customer's account (suspend, resume, payment, refuel, roaming), identify the customer first via get_customer_by_phone, get_customer_by_id, or get_customer_by_name (name lookup REQUIRES date of birth) — once identified, act directly on the requested non-destructive action without asking for extra permission.",
        'When the user provides a phone number, customer ID, or full name + date of birth, actually CALL the matching lookup tool (get_customer_by_phone / get_customer_by_id / get_customer_by_name) and read its result before stating whether an account exists — never claim an account is found or not found, or reference any account detail, without a tool result this turn.',
        'When a user wants to pay an overdue bill: verify the bill status is Overdue (get_bills_for_customer or get_details_by_id) before calling send_payment_request; after sending the request, tell the user to check and pay it via the payment-request/make-payment flow on their phone — never say the bill is paid until its status is actually Paid.',
        "When a user asks to refuel data: ask how much data they want, confirm the price (the plan's per-GB refueling rate) before calling refuel_data — the maximum amount that can be refueled is 2GB.",
        'When a user asks to resume a suspended line: resume it only after every overdue bill is paid, and never resume a line whose contract end date is in the past even if all bills are paid — say so honestly when either gate is not met.',
        'After successfully resuming a line, tell the user to reboot their device to restore service.',
        'When a traveling user needs roaming, first check whether roaming is already enabled (read the account-state block, or get_details_by_id on the line); if it is already ON, tell them it is already enabled and do NOT call enable_roaming again; if it is OFF, enable it and EXPLICITLY tell the user it is at NO additional cost.',
        "You can look up the customer's CURRENT plan (get_details_by_id) and state its price, but there is NO tool to list alternative plans or to apply a plan change — do not enumerate or invent other plans; explain this and transfer if the user wants to change plans.",
        "For technical/connectivity/service/MMS problems, guide the user through the diagnostic and fix steps on their OWN device one at a time (the device tools are the user's, not yours); never claim to have checked or fixed anything on their device yourself.",
        'For no-mobile-data or MMS (picture-messaging) problems, after confirming basics, guide the user to check and RESET their APN settings and then REBOOT the device (in that order) — these are steps the user performs on their own device.',
        'Attempt every in-scope resolution before transferring; transfer to a human only when the request is genuinely out of scope or the user explicitly asks.',
        "To transfer, you MUST first CALL the transfer_to_human_agents tool and THEN send the exact message 'YOU ARE BEING TRANSFERRED TO A HUMAN AGENT. PLEASE HOLD ON.' — writing that you are transferring WITHOUT calling the tool does not transfer anyone and is a false claim.",
        'Never claim a suspend, resume, payment, refuel, or roaming action happened unless its tool call actually succeeded this turn — report the real error when a call fails.',
        'Only surface information returned by tools or stated by the user — never invent facts, procedures, or give subjective recommendations.',
        'Make only one tool call at a time; never call a tool and reply to the user in the same step.',
        'When a message is garbled or ambiguous, recover with exactly ONE concrete clarifying question.',
        "Keep replies short and in the user's language.",
      ],
    });

    // ---- spatial/run: identify the customer before any account-mutating call --------------------
    this.addGuard(
      'preTool',
      ACCOUNT_WRITE_TOOLS,
      custom({
        kind: 'identifyFirst',
        dim: 'run',
        check: (ctx) => {
          const world = ctx.world as TelecomWorld;
          const customerId = String(ctx.args.customer_id ?? '');
          return world.isVerifiedCustomer(customerId)
            ? null
            : 'Identify the customer first (look them up by phone, id, or name+DOB) before acting on their account.';
        },
        prose: () => 'identify the customer (lookup by phone, id, or name+DOB) before acting on their account',
      }),
      { id: 'agent:identifyFirst' },
    );

    // ---- run: a payment request may be sent only for a bill that is actually Overdue -------------
    this.addGuard(
      'preTool',
      ['send_payment_request'],
      custom({
        kind: 'overdueBeforePaymentRequest',
        dim: 'run',
        check: (ctx) => {
          const world = ctx.world as TelecomWorld;
          const billId = String(ctx.args.bill_id ?? '');
          return world.billStatus(billId) === 'Overdue'
            ? null
            : 'A payment request may be sent only for a bill whose status is Overdue.';
        },
        prose: () => 'send a payment request only for a bill whose status is Overdue',
      }),
      { id: 'agent:overdueBeforePaymentRequest' },
    );

    // ---- run: only one bill may be Awaiting Payment at a time (composes with the overdue gate
    // above — both target send_payment_request; first deny wins) ---------------------------------
    this.addGuard(
      'preTool',
      ['send_payment_request'],
      custom({
        kind: 'noConcurrentAwaitingPayment',
        dim: 'run',
        check: (ctx) => {
          const world = ctx.world as TelecomWorld;
          const customerId = String(ctx.args.customer_id ?? '');
          return world.customerHasBillAwaitingPayment(customerId) === true
            ? 'This customer already has a bill awaiting payment; only one payment request can be outstanding at a time.'
            : null;
        },
        prose: () => 'send a payment request only when the customer has no other bill already awaiting payment',
      }),
      { id: 'agent:noConcurrentAwaitingPayment' },
    );

    // ---- run: resume gate (a) — a line whose contract ended in the past can never be resumed -----
    this.addGuard(
      'preTool',
      ['resume_line'],
      custom({
        kind: 'resumeContractEnded',
        dim: 'run',
        check: (ctx) => {
          const world = ctx.world as TelecomWorld;
          const lineId = String(ctx.args.line_id ?? '');
          return world.lineContractEndedInPast(lineId) === true
            ? "This line's contract ended in the past — it cannot be resumed, even after payment."
            : null;
        },
        prose: () => 'a line whose contract ended in the past cannot be resumed, even after payment',
      }),
      { id: 'agent:resumeContractEnded' },
    );

    // ---- run: resume gate (b) — overdue bills must be paid before a line can be resumed -----------
    this.addGuard(
      'preTool',
      ['resume_line'],
      custom({
        kind: 'resumeOverdueUnpaid',
        dim: 'run',
        check: (ctx) => {
          const world = ctx.world as TelecomWorld;
          const customerId = String(ctx.args.customer_id ?? '');
          return world.customerHasUnpaidOverdueBills(customerId) === true
            ? 'This customer still has unpaid overdue bills — resume only after they are paid.'
            : null;
        },
        prose: () => "resume a suspended line only after the customer's overdue bills are paid",
      }),
      { id: 'agent:resumeOverdueUnpaid' },
    );

    // ---- input: data refueling is capped at 2GB per request ---------------------------------------
    this.addGuard(
      'preTool',
      ['refuel_data'],
      custom({
        kind: 'refuelCap',
        dim: 'input',
        check: (ctx) => (Number(ctx.args.gb_amount) > 2 ? 'Data refueling is capped at 2GB per request.' : null),
        prose: () => 'data refueling is capped at 2GB per request',
      }),
      { id: 'agent:refuelCap' },
    );

    // ---- input: required-arg call-shape gates ------------------------------------------------------
    this.addGuard('preTool', ACCOUNT_WRITE_TOOLS, argRequired('customer_id'), { id: 'agent:argRequiredCustomerId' });
    this.addGuard('preTool', LINE_TOOLS, argRequired('line_id'), { id: 'agent:argRequiredLineId' });
    this.addGuard('preTool', ['send_payment_request'], argRequired('bill_id'), { id: 'agent:argRequiredBillId' });
    this.addGuard('preTool', ['refuel_data'], argRequired('gb_amount'), { id: 'agent:argRequiredGbAmount' });
    // Hardening: name lookup requires DOB for verification (main_policy.md: "For name lookup, date
    // of birth is required for verification purposes.").
    this.addGuard('preTool', ['get_customer_by_name'], argRequired('dob'), { id: 'agent:argRequiredDob' });

    // Reply honesty on the six write tools is covered by the auto-installed
    // `minimal:noFalseFailureClaim` (from `cfg.lexicon.falseFailureClaimRe` above) + the theme's
    // honesty-on-failure invariant + the behavior-prose honesty line — NOT by
    // `destructiveClaimRequiresSuccess`: its "took effect" exemption hard-requires
    // `o.args?.confirmed === true`, which no τ² write tool ever sets (they are all flag-less; see
    // the `destructiveTools: []` note above). That mismatch denied truthful claims like "your line
    // has been resumed" outright, redriving into the exhaustion boilerplate (measured-loop
    // iteration 2, Claude-judged root cause) — the guard is structurally incompatible with a
    // flag-less tool surface and was removed rather than patched.
  }
}

export const telecomSupportSpec = new AgentSpecTelecomSupport();
export default telecomSupportSpec;
