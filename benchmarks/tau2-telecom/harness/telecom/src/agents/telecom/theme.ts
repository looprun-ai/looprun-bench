/**
 * src/agents/telecom/theme.ts — the telecom domain THEME (Stage E3): the business-COMMON layer
 * shared by every agent of this domain — voice, core invariants, output-language clause, the
 * account-state render, and the honest-abstain closure. NO per-agent persona (the persona-on-spec
 * law: the role line lives on each spec's `persona` field, never here).
 *
 * Source: `benchmarks/tau2-telecom/reference/main_policy.md` (voice + invariants + suspension/resume rule) and
 * `benchmarks/tau2-telecom/reference/tech_support_manual.md` (technical-support scope). `stateBlock` reads ONLY
 * `world.projection()` (`benchmarks/tau2-telecom/harness/telecom/src/world/world.ts`'s `TelecomProjection`) through
 * defensive helpers — never Date.now/Math.random/I/O — so an unrelated world never throws.
 */
import type { TrunkTheme, AgentWorld } from 'looprun';

// ---- defensive projection helpers (never throw for an unrelated/partial world) ------------------

interface ProjectedCustomer {
  customer_id?: unknown;
}

interface ProjectedLine {
  line_id?: unknown;
  customer_id?: unknown;
  status?: unknown;
  roaming_enabled?: unknown;
  contract_end_date?: unknown;
}

interface ProjectedBill {
  bill_id?: unknown;
  customer_id?: unknown;
  status?: unknown;
}

interface SafeProjection {
  verifiedCustomerIds: string[];
  customers: ProjectedCustomer[];
  lines: ProjectedLine[];
  bills: ProjectedBill[];
}

/** Reads `world.projection()` defensively — an unrelated/partial world yields empty arrays, never a throw. */
function safeProjection(world: AgentWorld): SafeProjection {
  let raw: unknown;
  try {
    raw = typeof world.projection === 'function' ? world.projection() : undefined;
  } catch {
    raw = undefined;
  }
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    verifiedCustomerIds: Array.isArray(p.verifiedCustomerIds) ? (p.verifiedCustomerIds as string[]) : [],
    customers: Array.isArray(p.customers) ? (p.customers as ProjectedCustomer[]) : [],
    lines: Array.isArray(p.lines) ? (p.lines as ProjectedLine[]) : [],
    bills: Array.isArray(p.bills) ? (p.bills as ProjectedBill[]) : [],
  };
}

function str(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Like `str`, but returns null (never a fallback string) when the id is missing/malformed — the
 *  caller uses this to skip rendering a record with no usable id, instead of printing "unknown". */
function idOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function yn(value: unknown, whenTrue: string, whenFalse: string): string {
  return value === true ? whenTrue : whenFalse;
}

// ---- 0. voice — the domain-COMMON opening paragraph (byte-identical across every agent) ---------

const voice =
  'You are a factual telecom customer-support assistant. You help customers with technical ' +
  'support for their phone service, overdue-bill payment, line suspension and resumption, data ' +
  'roaming, data refueling, and plan information. You act ONLY through the tools provided to you — ' +
  'you never perform an action or state a fact you did not obtain that way. You give no subjective ' +
  'recommendations, opinions, or outside knowledge; you work strictly from tool results and what ' +
  'the customer tells you. You deny requests that fall outside policy, and you confirm outcomes ' +
  'plainly, stating only what a tool actually reported.';

// ---- 1. coreInvariants — the always-render "NEVER violate" rules --------------------------------

const coreInvariants: string[] = [
  'Read before you claim: NEVER invent a customer, line, bill, plan, or device fact — id, name, status, price, date, or usage figure. Those come ONLY from the tools. If you did not read it from a tool, you do not know it.',
  'Reference entities by their real ids as returned by the tools (customer C…, line L…, bill B…, plan P…, device D…). Never invent or guess one.',
  'You are a support agent bound by policy, not an advisor: surface only information from the tools or the user, with no subjective recommendations or outside knowledge; deny out-of-policy requests; transfer to a human agent only when the request is out of scope or the customer explicitly asks.',
  'A suspended line may be resumed only after all of the customer’s overdue bills are paid; a line whose contract end date is in the past may never be resumed, even once every bill is paid.',
  'Make only one tool call at a time, and never send a tool call and a reply to the customer in the same message.',
  'Never claim a state-changing action (suspend, resume, payment request, payment, data refuel, roaming toggle) happened unless the tool call returned success this turn; report real tool failures honestly.',
];

// ---- 2. languageClause — the final "## Output language (ABSOLUTE)" clause -----------------------

const languageClause =
  '## Output language (ABSOLUTE)\n' +
  'Prompts are typically English; regardless of the incoming language, detect it and reply ' +
  "ENTIRELY in the customer's own language. When the language cannot be determined, reply in " +
  "English (this business's default locale) — never mix languages within a single reply.";

// ---- 3. stateBlock — the volatile account-state render (user-message tail, body lines only) -----

function stateBlock(world: AgentWorld): string {
  const projection = safeProjection(world);
  const verified = new Set(projection.verifiedCustomerIds.filter((id): id is string => typeof id === 'string'));

  if (projection.customers.length === 0) {
    return 'No customer loaded yet — identify the customer first.';
  }

  // State-visibility must never leak an UNVERIFIED customer's id/lines/bills (fabrication-by-readback
  // risk: a model could act on a DB row the user never identified). Only VERIFIED customers render.
  const verifiedCustomers = projection.customers.filter((customer) => {
    const customerId = idOrNull(customer.customer_id);
    return customerId !== null && verified.has(customerId);
  });

  if (verifiedCustomers.length === 0) {
    return (
      'No customer identified yet — if the user has already given a phone number, customer ID, or ' +
      'full name + date of birth, CALL the matching lookup tool now (get_customer_by_phone / ' +
      'get_customer_by_id / get_customer_by_name) and read its result before answering; only if ' +
      'they have given no identifier should you ask for one. Never state whether an account exists ' +
      'without a tool result.'
    );
  }

  const lines: string[] = [];

  for (const customer of verifiedCustomers) {
    const customerId = idOrNull(customer.customer_id);
    if (!customerId) continue;
    lines.push(`Customer ${customerId}: identity verified.`);

    for (const line of projection.lines) {
      if (line.customer_id !== customer.customer_id) continue;
      const lineId = idOrNull(line.line_id);
      if (!lineId) continue;
      const status = str(line.status);
      const roaming = yn(line.roaming_enabled, 'roaming ON', 'roaming OFF');
      const contractEndDate = typeof line.contract_end_date === 'string' ? line.contract_end_date : null;
      const contractNote = contractEndDate ? `, contract end date ${contractEndDate}` : '';
      lines.push(`  Line ${lineId}: status ${status}, ${roaming}${contractNote}.`);
    }

    for (const bill of projection.bills) {
      if (bill.customer_id !== customer.customer_id) continue;
      const billId = idOrNull(bill.bill_id);
      if (!billId) continue;
      lines.push(`  Bill ${billId}: status ${str(bill.status)}.`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'No customer loaded yet — identify the customer first.';
}

// ---- 4. exhaustionReply — deterministic honest-abstain closure (verified observations only) -----

function exhaustionReply(_world: AgentWorld, okTools: string[], produced: string[], _violations: string[]): string {
  const succeeded = (Array.isArray(okTools) ? okTools : []).filter((t) => typeof t === 'string' && t.length > 0);
  const minted = (Array.isArray(produced) ? produced : []).filter((p) => typeof p === 'string' && p.length > 0);

  if (succeeded.length === 0) {
    return 'I was not able to complete this request with the available tools this turn. No action was taken — please try again or share more detail.';
  }

  const mintedNote = minted.length > 0 ? ` (${minted.join(', ')})` : '';
  return (
    `I completed the following steps this turn: ${succeeded.join(', ')}${mintedNote}. ` +
    'I could not finish the rest of your request within policy — please clarify or provide more detail so I can continue.'
  );
}

// ---- assembled theme ------------------------------------------------------------------------------

export const TELECOM_THEME: TrunkTheme = { voice, stateBlock, coreInvariants, languageClause, exhaustionReply };
