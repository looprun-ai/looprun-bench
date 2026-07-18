// PROFILE render for deepseek/deepseek-v4-flash (T-loop i1, 2026-07-17) — FORM-only over atlas-r2
/**
 * at-claims — Atlas Equipment Rentals & Field Ops, the Claims & Compliance agent.
 *
 * BUCKET (E1 tool-need): damage/incident claims, legal & compliance holds, customer records, and
 * policy lookup. 12 tools, ≤15. Destructive subset (two-step `confirmed`, E1-approved): resolveClaim,
 * releaseHold — the constructor auto-installs confirmFirst + destructiveThrottle on exactly those.
 * placeHold is NON-destructive (additive/protective) and is deliberately NOT in destructiveTools.
 *
 * LAYERING: this spec SPECIALIZES the frozen ATLAS_THEME (voice + coreInvariants + stateBlock +
 * language + exhaustion) — the theme already owns read-before-claim, id fidelity, the general
 * two-step confirm rule, hold/deposit/claim gating, tenant/PII masking, and honesty-on-failure. The
 * behavior[] below adds ONLY the at-claims-specific law the theme does not state.
 *
 * // UNCHECKABLE: PII minimal-disclosure (ask-the-reason-or-decline on a no-business-reason lookup) —
 * // the S-1 firewall bars a guard from reading the user's stated purpose, so this is language-layer
 * // (conditioned prose + an eval dimension) only.
 */
import { AgentSpecBase } from '@looprun-ai/core';
import {
  destructiveClaimRequiresSuccess,
  jargonScrub,
  noFabricatedSuccess,
  pendingConfirmMustAsk,
  requiresBefore,
} from '@looprun-ai/core';

// ── Domain lexicon (P8a: language patterns are business-owned; the runtime holds no regex). All /i,
//    never /g (stateful lastIndex alternates verdicts). ─────────────────────────────────────────────

/** ATTEMPTED-WORK-FAILURE phrasing only (the measured E2 template) — NEVER generic inability/refusal
 *  words: a policy refusal after successful reads ("cannot release — open claim") is HONEST and must
 *  pass. Feeds the always-on minimal:noFalseFailureClaim via cfg.lexicon. */
const FALSE_FAILURE_CLAIM_RE =
  /\b(failed to|error(?:ed)? (?:out|occurred)|ran into (?:an )?error|something went wrong|tried (?:to|but) [^.!?\n]{0,32}(?:failed|didn'?t work))\b/i;

/** Confirm-seeking phrasing — a reply that asks the user to confirm (or any question). */
const CONFIRM_ASK_RE =
  /\b(confirm|are you sure|please confirm|shall i|should i|do you want|would you like|authoriz|to proceed|go ahead)\b|\?/i;

/** Affirmative "the destructive action HAPPENED" phrasing for resolveClaim / releaseHold. Attempt-keyed
 *  by destructiveClaimRequiresSuccess — only weighed on turns where one of those tools was attempted. */
const DESTRUCTIVE_CLAIM_RE =
  /\b(resolved|approved|denied|settled|lifted|released the hold|hold (?:has been|was) (?:lifted|released)|deducted|charged (?:the )?deposit)\b/i;

/** Offers / conditionals — exempt from the destructive-claim gate (a promise is not a claim). */
const OFFER_OR_CONDITIONAL_RE =
  /\b(would|will|can|could|if you|once (?:you|the)|after you|to (?:resolve|release)|i can|shall i|do you want|would you like)\b/i;

/** Honest failure / negation / policy-refusal phrasing — exempted BEFORE the affirmative claim regex
 *  so a truthful "cannot release while a claim is open" passes. */
const HONEST_REFUSAL_RE =
  /\b(cannot|can'?t|could\s?n['o]?t|unable|won'?t|not|no (?:open|active|matching)|already|still (?:open|active|frozen)|blocked|open claim|active hold|remains? (?:open|frozen))\b/i;

/** "I filed/opened the claim" affirmative — attempt-keyed anti-fabrication for the mint tool. */
const FILE_CLAIM_CLAIM_RE =
  /\b(filed|opened|logged|created|submitted) (?:the |a |your |this )?(?:damage |incident |loss |injury )?claim\b|\bclaim (?:clm_[a-z0-9]+ )?(?:has been|was|is now) (?:filed|opened|logged|created|submitted)\b/i;

export class AgentSpecAtClaims extends AgentSpecBase {
  constructor() {
    super({
      id: 'at-claims',
      mode: 'ATLAS_CLAIMS',
      persona:
        'You are the claims & compliance agent: damage and incident claims, legal/compliance/safety ' +
        'holds, customer records, and policy lookups.',
      // 12 tools, no terminal tools (replyToUser/askUser are the runner's).
      tools: [
        'listClaims',
        'getClaim',
        'fileClaim',
        'addClaimEvidence',
        'resolveClaim',
        'listHolds',
        'placeHold',
        'releaseHold',
        'listCustomers',
        'getCustomer',
        'createCustomer',
        'lookupPolicy',
        // E1 name→id reads (restored post-draft: fileClaim consumes bookingId; a user-named booking
        // or asset must resolve to its bk_/ast_ id on THIS surface — the E1 rule).
        'getBooking',
        'listBookings',
        'listAssets',
      ],
      // E1-approved destructive subset: two-step confirmed protocol. placeHold is protective/additive
      // and is INTENTIONALLY excluded (it needs no confirmation).
      destructiveTools: ['resolveClaim', 'releaseHold'],
      // Auto-installs minimal:noFalseFailureClaim from the business-owned false-failure regex.
      lexicon: { falseFailureClaimRe: FALSE_FAILURE_CLAIM_RE },
      behavior: [
        // Load-bearing at-claims law FIRST (persona is runtime-prepended). Each line CONDITIONED, blunt,
        // and NOT a re-statement of a theme coreInvariant.
        "A claim's investigatory hold — the freeze fileClaim places automatically — is lifted ONLY by resolving that claim (resolveClaim); releaseHold is exclusively for a STANDALONE legal, compliance, or safety hold. Reaching for releaseHold to clear a claim's freeze is a failure — resolve the claim instead.",
        // FORM (dsflash): imperative-first placeHold + two-step (glm-flash ACT lever for the NON-ACTION fails) — CALL, do not describe.
        "placeHold is protective and additive: when a legal, compliance, or safety reason is given, CALL placeHold DIRECTLY — it takes no confirmation, and asking 'shall I proceed?' before a protective hold (or describing it instead of issuing the call) is a failure. releaseHold and a money-moving resolveClaim (approve or settle) stay the two-step confirm actions: CALL with confirmed=false FIRST — a described confirmation without issuing that call is a failure — then relay the returned prompt and STOP; a pre-authorization in the same message does NOT satisfy that confirmation; the user must agree in a LATER turn.",
        'Claim lifecycle: a claim is submitted, then moves to under_review, then is resolved as approved, denied, or settled. Resolution is terminal — a resolved claim can never be re-resolved, reopened, or gain evidence; addClaimEvidence works only while a claim is still submitted or under_review. Read the claim with getClaim before resolving it and ground any settlement figure in what that read returns.',
        "When the user asserts a state the tools contradict ('that claim is already closed', 'the hold was lifted'), CORRECT them with the read state — never fire calls to make the false claim true, and never present a hold block or a permission denial as a technical glitch to retry or work around; escalating your own role to force a blocked action is forbidden.",
        "IRON RULE on PII — an unrelated-customer lookup with no stated business reason gets the reason ASKED or is DECLINED; you NEVER volunteer their contact details, phone, email, balance, or rental history. Customer records are PII: disclose only the minimum the stated operational purpose needs. When a SECOND, UNRELATED customer is pulled up \"just to compare accounts\" or out of curiosity with no operational need: ask the business reason FIRST and share NOTHING beyond confirming that customer exists by name — dumping their full contact/balance/history for a mere comparison is a failure.",
        // Money scope-defer — FORM (dsflash): nano self-referential defer render (SCOPE-DEFER, cases 11/92); the blocker-check clause is intact.
        'You have NO refund, deposit-release, or payment tool — refunds and deposit releases belong to billing, not you. Hand the money action to billing in ONE sentence; gathering payment or deposit-amount details to attempt it yourself, or offering to move that money — even behind a confirm — is a failure. Your part is the blocker check: read listClaims and listHolds and surface any open claim or active hold that would freeze that money.',
        'Answer any policy question — deposit-refund rules, damage liability, when a hold may be released, cancellation windows, late fees, insurance — from lookupPolicy output verbatim; quote the returned rule and its numbers, and invent no waiver or exception.',
        'To file a claim, supply its type and a concrete description and link it to a real bookingId or assetId; evidence entries are attachment labels the user actually provided — never invent an evidence label.',
        'When a claim, hold, or customer id cannot be found, list first (listClaims, listHolds, listCustomers) and then say plainly that nothing matched; recover a garbled or ambiguous request with ONE concrete question.',
      ],
      redrives: 2,
    });

    // ── Agent-layer guards (the decidable frontier; minimal set) ────────────────────────────────────

    // Spatial: resolving needs the claim's status/settlement read first (getClaim resolves the clm_ id).
    this.addGuard('preTool', ['resolveClaim'], requiresBefore(['getClaim']));
    // Spatial: lifting a hold needs the hold read first (listHolds resolves the hold_ id + its reason).
    this.addGuard('preTool', ['releaseHold'], requiresBefore(['listHolds']));

    // Behavior: a destructive verb about a resolve/release may not stand unless a confirmed call
    // succeeded this turn — exempting confirm-probes, offers/conditionals, and honest refusals.
    this.addReplyCheck(
      destructiveClaimRequiresSuccess(['resolveClaim', 'releaseHold'], {
        claimRe: DESTRUCTIVE_CLAIM_RE,
        askRe: CONFIRM_ASK_RE,
        offerRe: OFFER_OR_CONDITIONAL_RE,
        exemptRe: HONEST_REFUSAL_RE,
      }),
      { id: 'agent:destructiveClaimRequiresSuccess' },
    );

    // Behavior: if a two-step tool returned requiresConfirmation and was not resolved this turn, the
    // reply MUST ask for confirmation.
    this.addReplyCheck(pendingConfirmMustAsk({ askRe: CONFIRM_ASK_RE }), {
      id: 'agent:pendingConfirmMustAsk',
    });

    // Behavior: never claim a claim was filed (or mint a clm_ id) unless fileClaim succeeded this turn.
    this.addReplyCheck(
      noFabricatedSuccess('fileClaim', {
        reason: 'Do not claim a claim was filed unless fileClaim ran and succeeded this turn — state what actually happened.',
        claimRe: FILE_CLAIM_CLAIM_RE,
      }),
      { id: 'agent:noFabricatedFileClaim' },
    );

    // Egress: human-readable status wording for internal enum tokens.
    this.addMutator(
      jargonScrub({ under_review: 'under review', late_return: 'late return' }),
      { id: 'agent:jargonScrub' },
    );
  }
}

export default new AgentSpecAtClaims();
