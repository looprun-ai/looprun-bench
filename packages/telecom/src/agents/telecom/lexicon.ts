/**
 * src/agents/telecom/lexicon.ts — the business-owned, language-specific regexes for the
 * `telecom-support` agent (P8a domain-neutrality law: `@looprun-ai/core` carries NO linguistic
 * pattern of its own; every wording-keyed reply guard takes its regex as a REQUIRED injected
 * param). Derived from `reference/telecom/main_policy.md`'s action vocabulary — suspend/resume a
 * line, pay/send a payment request for a bill, refuel data, enable/disable roaming — never from a
 * gold spec.
 *
 * All patterns are case-insensitive only (`i`) — NO `/g`/`/y` flags (a closure-held `lastIndex`
 * would alternate verdicts across calls; the stateful-regex lint bans them).
 */

/** A false "I couldn't/failed to <telecom action>" claim — matches an inability phrase followed
 *  (within a short span) by one of this domain's action verbs. Wired via
 *  `cfg.lexicon.falseFailureClaimRe` so `AgentSpecBase` auto-installs `noFalseFailureClaim`. */
export const FALSE_FAILURE_CLAIM_RE =
  /(cannot|can'?t|could ?not|couldn'?t|unable to|failed to|failed)[^.!?\n]{0,40}(suspend|resume|pay|payment|refuel|roaming|enable|disable|send)/i;

/** A reply that ASKS for confirmation or seeks a go-ahead — either a literal `?` or confirm
 *  language. Wired via `cfg.lexicon.confirmAskRe` and as `destructiveClaimRequiresSuccess`'s
 *  `askRe` (exempts confirm-probe replies from a false "already happened" claim). */
export const CONFIRM_ASK_RE = /\?|\b(confirm|are you sure|do you want|shall i|proceed|go ahead|how much)\b/i;

/** A reply that OFFERS or CONDITIONS a future action rather than declaring it done — used as
 *  `destructiveClaimRequiresSuccess`'s `offerRe` so an offer sentence never masks a genuine
 *  declarative claim elsewhere in the reply. */
export const OFFER_OR_CONDITIONAL_RE =
  /\b(if you(?:'d| would)? (?:want|like)|would you like me to|i can|shall i|let me know)\b/i;

/** A reply DECLARING a state-changing telecom action already happened — the claim regex for
 *  `destructiveClaimRequiresSuccess` on the six write tools (suspend/resume/payment
 *  request/refuel/roaming). */
export const DESTRUCTIVE_CLAIM_RE =
  /\b(suspended|resumed|reactivated|payment (?:sent|requested)|refueled|roaming (?:enabled|disabled)|paid)\b/i;

/** Honest failure/negation phrasing to EXEMPT from the destructive-claim gate — a truthful "I
 *  could not…", "is not overdue", "contract ended", or "still suspended" report must pass. */
export const EXEMPT_RE =
  /\b(cannot|can'?t|could ?not|couldn'?t|unable|is not overdue|contract (?:has )?ended|still suspended)\b/i;
