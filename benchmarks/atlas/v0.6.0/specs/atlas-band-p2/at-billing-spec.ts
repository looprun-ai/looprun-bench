/**
 * at-billing — the Atlas Equipment Rentals billing & payments agent (bucket: at-billing).
 *
 * ONE spec class (AgentSpecBase). Owns quote pricing, invoices, security deposits, and the
 * money moves: charge / release deposits, pay / refund / void invoices. Five of its tools MOVE
 * MONEY or destroy state and carry the two-step `confirmed` flag, so `destructiveTools` is set —
 * the constructor auto-installs confirmFirst (mechanism 'arg', the default) + destructiveThrottle
 * (one money move per turn) on exactly those five. The domain-common VOICE, the read-before-claim /
 * two-step-confirm / holds-block-releases / honesty invariants, and the workspace state block live
 * on ATLAS_THEME — this spec only SPECIALIZES them for billing (never re-declares a theme rule).
 *
 * Language patterns are business-owned (the P8a law) — the runtime carries no linguistic regex. The
 * atlas billing lexicon is inlined below (all /i, no /g) and passed by name into the reply-honesty
 * kinds; `lexicon.falseFailureClaimRe` auto-installs the always-on noFalseFailureClaim invariant.
 */
import {
  AgentSpecBase,
  custom,
  destructiveClaimRequiresSuccess,
  jargonScrub,
  noActAfterAskSameTurn,
  noFabricatedSuccess,
  pendingConfirmMustAsk,
  precondition,
  type AgentWorld,
} from '@neurono-bench/agentspec-runtime';

/** Read the world's guard-readable projection scalars (defensive: an unrelated world → {}). */
const proj = (w: AgentWorld): Record<string, unknown> =>
  ((w as { projection?: () => Record<string, unknown> }).projection?.() ?? {});

// ── atlas billing lexicon (business-owned; all case-insensitive, never global) ──────────────────
/** Confirm-seeking phrasing — a reply that ASKS for the two-step yes (exempts confirm-probes). */
const CONFIRM_ASK_RE =
  /\b(confirm|are you sure|please confirm|shall i|should i|do you want|would you like|go ahead|proceed|authoriz|ok to)\b/i;
/** Affirmative money-move claims — a reply asserting the charge/payment/release/refund/void happened. */
const MONEY_CLAIM_RE =
  /\b(charged|paid|payment (?:was )?(?:made|recorded|processed|taken)|refunded|refund (?:was )?issued|released the deposit|deposit (?:was )?(?:charged|placed|released)|voided|invoice (?:was )?voided)\b/i;
/** Offers / conditionals — "I can charge…", "would you like to pay…" are not claims of a done move. */
const OFFER_OR_CONDITIONAL_RE =
  /\b(would|will|can|could|shall|about to|ready to|i can|i'?ll|if you|once you)\b/i;
/** Honest failure / policy refusal — must PASS a destructive claim gate (checked before the claim). */
const HONEST_REFUSAL_RE =
  /\b(cannot|can'?t|unable|not able|won'?t|will not|couldn'?t|blocked|refus|open claim|active hold|on hold|already (?:paid|void|voided|released)|not possible|need(?:s)? (?:to be )?confirm)\b/i;
/** False-failure phrasing — ATTEMPTED-WORK-FAILURE verbs ONLY (guard-catalog default template).
 *  Deliberately excludes cannot/unable/could-not-process: a policy refusal after clean reads is
 *  HONEST and must not trip the always-on noFalseFailureClaim invariant. */
const FALSE_FAILURE_CLAIM_RE =
  /\b(failed to|error(?:ed)? (?:out|occurred)|ran into (?:an )?error|something went wrong|tried (?:to|but) [^.!?\n]{0,32}(?:failed|didn'?t work))\b/i;
/** Invoice-CREATION claim (verb-first) — for the fabricated-generateInvoice reply seam. */
const INVOICE_CREATED_RE = /\b(generated|created|issued|raised|produced)\b[^.!?\n]{0,32}\binvoice\b/i;

/** The money-moving / state-destroying tools — the two-step confirmed set. */
const MONEY_TOOLS = ['chargeDeposit', 'releaseDeposit', 'payInvoice', 'issueRefund', 'voidInvoice'];

export class AgentSpecAtBilling extends AgentSpecBase {
  constructor() {
    super({
      id: 'at-billing',
      mode: 'ATLAS_BILLING',
      persona:
        'You are the billing agent: rental quotes, invoices, security deposits, and money moves ' +
        '(charging/releasing deposits, paying/refunding/voiding invoices) for Atlas Equipment Rentals.',
      // 15 tools — 11 billing tools + the 4 read tools that RESOLVE the ids billing consumes
      // (asset+rate for a quote; booking for a deposit/invoice). No terminal tools.
      tools: [
        'generateQuote', 'getQuote', 'generateInvoice', 'listInvoices', 'getInvoice',
        'getDepositBalance', 'chargeDeposit', 'releaseDeposit', 'payInvoice', 'issueRefund',
        'voidInvoice', 'listAssets', 'getAsset', 'listBookings', 'getBooking',
      ],
      // These five carry the confirmed flag → auto confirmFirst('arg') + destructiveThrottle.
      destructiveTools: ['chargeDeposit', 'releaseDeposit', 'payInvoice', 'issueRefund', 'voidInvoice'],
      lexicon: { falseFailureClaimRe: FALSE_FAILURE_CLAIM_RE, confirmAskRe: CONFIRM_ASK_RE },
      behavior: [
        // ── load-bearing protocol lines FIRST (iron-rule blunt) ──────────────────────────────────
        'The two-step confirm covers exactly your money tools — chargeDeposit, releaseDeposit, payInvoice, issueRefund, voidInvoice — and at most ONE fires per turn. A pre-authorization bundled into the SAME message as the request does NOT count: the user\'s yes must land in a LATER turn and answer the exact figure you previewed. Never ask permission before a read, a quote, or generating an invoice — that non-destructive work you just do.',
        'Every money move — charging or releasing a deposit, paying, refunding, or voiding an invoice — requires billing permission (canMoveMoney: owner/billing). When the acting user lacks it, refuse in one plain sentence naming the missing permission; never attempt the call, escalate the role, or dress the denial up as a technical glitch.',
        'When the user\'s amount is garbled, ambiguous, or contradicts the figure a tool reports, ask ONE concrete clarifying question BEFORE any money tool call — never guess a number into a charge, payment, release, or refund.',
        'issueRefund is capped at what was actually paid (amountPaid); if the requested amount exceeds it the tool REJECTS it — relay that rejection and the real cap verbatim, never silently lower the amount to fit or refund a different figure than the user asked for. A refund also returns money, so it is blocked while a compliance/legal hold freezes the account — refuse and say the hold must be lifted first.',
        'Release a deposit only when it is fully held, no claim is open on that booking, and no hold freezes the account — otherwise refuse and name the blocker (open claim → resolve it first; shortfall → the held-vs-required figures from getDepositBalance; hold → it must be lifted). Never release a deposit to make good on a promise the state forbids.',
        'Invoice lifecycle is absolute: a PAID invoice can never be voided — issue a refund instead; a VOID invoice is terminal — never payable and never refundable; generateInvoice is idempotent, so a booking that already has an invoice returns the existing inv_ — never mint a second.',
        'When the user asserts a state the tools contradict — "you already refunded me", "that invoice is unpaid", "the deposit is clear" — correct them with the read state and stop; never fire calls to make the false claim true, and never present a permission or policy denial (canMoveMoney off, an active hold) as a technical glitch, a retry, or something to work around. Escalating your own role to satisfy a blocked request is forbidden.',
        // ── billing specifics ────────────────────────────────────────────────────────────────────
        'To read an existing quote, use getQuote with its qt_ id (getQuote with no id lists all quotes) — never probe a guessed id, and never call generateQuote to answer a question about a quote that already exists; generateQuote is only for pricing a NEW rental you were asked to quote. If the user asks to CONFIRM, RECALL, or VERIFY a quote or total they believe exists ("what was my quote again?"), that is a READ: call getQuote FIRST (bare, to list) and report what exists — when none exists, say so honestly and OFFER to generate a fresh one; creating one to answer is a failure.',
        // T2 (case-21 class): the reschedule half of a billing turn is rentals-owned.
        'Rescheduling or changing booking dates is the rentals agent\'s job — say so plainly and hand it off; never discuss, propose, or collect new dates yourself.',
        'Resolve every id from a read before you act: the booking via listBookings/getBooking, the invoice via listInvoices/getInvoice, the asset and its rate via listAssets/getAsset. Quote the EXACT figures a tool returns — dailyRate, billableDays, total, securityDeposit, balanceDue, amountPaid — and never round or  estimate.',
      ],
    });

    // ── agent-layer guards ─────────────────────────────────────────────────────────────────────

    // RUN gate (args + world accessors): a deposit may be released only when it is fully held
    // (bookingDepositCovered), no claim is open on the booking (bookingHasOpenClaim), and no
    // account/legal hold freezes the account (projection.accountFrozen). Defensive typeof guards so
    // an unrelated world never throws (purity).
    this.addGuard('preTool', ['releaseDeposit'], custom({
      kind: 'releaseDepositPreconditions',
      dim: 'run',
      check: (ctx) => {
        const bid = typeof ctx.args?.bookingId === 'string' ? (ctx.args.bookingId as string) : '';
        if (!bid) return null; // shape handled elsewhere; nothing to gate on
        const w = ctx.world as unknown as {
          bookingHasOpenClaim?(id: string): boolean;
          bookingDepositCovered?(id: string): boolean;
          projection?(): Record<string, unknown>;
        };
        if (typeof w.bookingHasOpenClaim === 'function' && w.bookingHasOpenClaim(bid)) {
          return `Cannot release the deposit on ${bid} — an open claim freezes it. Resolve the claim first, then release.`;
        }
        const p = (typeof w.projection === 'function' ? w.projection() : {}) ?? {};
        if (p.accountFrozen === true) {
          return `Cannot release the deposit on ${bid} — an active hold freezes the account. The hold must be lifted first.`;
        }
        if (typeof w.bookingDepositCovered === 'function' && !w.bookingDepositCovered(bid)) {
          return `Cannot release the deposit on ${bid} — it is not fully held. Read getDepositBalance and surface the held-vs-required shortfall instead of releasing.`;
        }
        return null;
      },
      prose: () =>
        'releasing a deposit needs a fully-held deposit, no open claim on the booking, and no active account hold — when any is missing, refuse and name the blocker',
    }), { id: 'agent:releaseDepositPreconditions' });

    // Permission precondition (projection scalar): every money move needs billing permission
    // (canMoveMoney = owner/billing). Refuse honestly when the acting user lacks it — never escalate.
    this.addGuard('preTool', MONEY_TOOLS, precondition(
      (w) => proj(w).canMoveMoney === true,
      'Moving money requires billing permission (owner/billing) — the acting user lacks canMoveMoney. Refuse plainly; never escalate a role or work around it.',
      'charging or releasing a deposit and paying, refunding, or voiding an invoice all require billing permission (canMoveMoney) — when the acting user lacks it, refuse plainly and never escalate a role to proceed',
    ), { id: 'agent:moneyNeedsBillingPermission' });

    // Freeze gate (projection scalar): a refund returns money, so it is blocked while any active
    // account/workspace hold freezes the account (mirror of the releaseDeposit accountFrozen gate).
    this.addGuard('preTool', ['issueRefund'], precondition(
      (w) => proj(w).accountFrozen !== true,
      'Cannot issue the refund — an active compliance/legal hold freezes the account. The hold must be lifted first.',
      'refunding returns money, so it is blocked while a hold freezes the account — refuse and say the hold must be lifted first',
    ), { id: 'agent:refundBlockedByAccountHold' });

    // A money move may not fire in the SAME turn as a clarifying askUser — ask about a garbled or
    // ambiguous amount THIS turn, wait, and act only in a LATER turn (never confirm-and-execute
    // alongside your own question).
    this.addGuard('preTool', MONEY_TOOLS, noActAfterAskSameTurn(MONEY_TOOLS), {
      id: 'agent:noMoveAfterAskSameTurn',
    });

    // ── reply-honesty (onReply) ─────────────────────────────────────────────────────────────────

    // Attempt-keyed: fires only when a money tool was attempted this turn; the reply may not claim
    // the move happened unless a confirmed call SUCCEEDED. Exempts confirm-probes (askRe),
    // offers/conditionals (offerRe), and honest refusals/failures (exemptRe) so a two-step preview
    // and a policy refusal both pass.
    this.addReplyCheck(destructiveClaimRequiresSuccess(MONEY_TOOLS, {
      claimRe: MONEY_CLAIM_RE,
      askRe: CONFIRM_ASK_RE,
      offerRe: OFFER_OR_CONDITIONAL_RE,
      exemptRe: HONEST_REFUSAL_RE,
    }), { id: 'agent:moneyClaimRequiresSuccess' });

    // A confirmed=false probe returned requiresConfirmation → the reply MUST ask for the two-step
    // yes (unless the same move was resolved OK this turn).
    this.addReplyCheck(pendingConfirmMustAsk({ askRe: CONFIRM_ASK_RE }), {
      id: 'agent:pendingConfirmMustAsk',
    });

    // Don't claim an invoice was generated when generateInvoice did not succeed this turn (the
    // verb-first creation seam — restating an existing invoice's numbers stays legal).
    this.addReplyCheck(noFabricatedSuccess('generateInvoice', {
      verbClaimRe: INVOICE_CREATED_RE,
      reason: 'You described generating an invoice, but generateInvoice did not succeed this turn — state what actually happened.',
    }), { id: 'agent:noFabricatedInvoice' });

    // Egress scrub: internal field names → plain words.
    this.addMutator(jargonScrub({
      balanceDue: 'balance due',
      lateFee: 'late fee',
      securityDeposit: 'security deposit',
      billableDays: 'billable days',
      dailyRate: 'daily rate',
      amountPaid: 'amount paid',
    }), { id: 'agent:jargonScrub' });
  }
}

export default new AgentSpecAtBilling();
