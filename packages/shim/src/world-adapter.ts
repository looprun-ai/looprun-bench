/**
 * src/shim/world-adapter.ts — the τ²-bench replay shim `governed/src/world/telecom-world.ts` asked
 * for: builds a `TelecomWorld` by REPLAYING the transcript's real tool results (never a live backend).
 *
 * Real telecom result shapes (discovered from tau2-bench/src/tau2/domains/telecom/{data_model,tools}.py
 * and confirmed against a live transcript at
 * tau2-bench/data/simulations/raw_smoke_4b/results.json):
 *   - get_customer_by_phone / get_customer_by_id → a Customer object `{customer_id, full_name,
 *     date_of_birth, email, phone_number, address, account_status, payment_methods, line_ids,
 *     bill_ids, created_at, last_extension_date, goodwill_credit_used_this_year}`.
 *   - get_customer_by_name → a LIST of Customer objects (possibly empty; never an error).
 *   - get_details_by_id → ONE of Line | Device | Bill | Plan | Customer, discriminated by the id
 *     prefix server-side (L/D/B/C/P) — client-side we discriminate by shape: `line_id`+`status` ⇒
 *     Line; `bill_id`+`status` ⇒ Bill; `customer_id`+`full_name` ⇒ Customer (Device/Plan carry
 *     nothing our accessors need, so they're not modeled here).
 *   - suspend_line / resume_line → `{message: string, line: Line}` — the POST-mutation Line.
 *   - get_bills_for_customer → a LIST of Bill objects `{bill_id, customer_id, period_start,
 *     period_end, issue_date, total_due, due_date, line_items, status}`.
 *   - send_payment_request → a bare success STRING (no structured body) — the tool's own docstring
 *     documents its postcondition ("Sets bill status to AWAITING_PAYMENT"), so a successful call is
 *     used to INFER the new bill status from the call's own args (customer_id, bill_id), not from a
 *     result body that doesn't carry it.
 *   - get_data_usage → `{line_id, data_used_gb, data_limit_gb, data_refueling_gb, cycle_end_date}` —
 *     NOTE: no `status`/`roaming_enabled` field. `telecom-world.ts`'s own doc comments say lineStatus/
 *     lineRoamingEnabled are "last observed via get_details_by_id / get_data_usage" — that second half
 *     does not hold against the real tool (checked directly in tools.py); harmless (an accessor that
 *     stays unpopulated from this tool is just one more source that never fires, never a false deny).
 *   - enable_roaming / disable_roaming → a bare success/no-op STRING (no structured Line body) — same
 *     postcondition-inference approach as send_payment_request: a successful call's OWN args
 *     (line_id) plus the tool name tell us the line's new roaming state deterministically (both
 *     "Roaming enabled successfully" and "Roaming was already enabled" mean the postcondition is
 *     `roaming_enabled: true`), with no need to parse the message text itself.
 *   - refuel_data / transfer_to_human_agents → results with nothing our 6 accessors read.
 *
 * lineContractEndedInPast: computed ONCE per Line record at replay time (never inside a guard — the
 * purity law) against a reference "now" parsed from tau2's own system message ("The current time is
 * 2025-02-25 12:08:00 EST.", telecom/tools.py's fixed policy clock) — falling back to that exact
 * string if the regex doesn't match (defensive; keeps parity with theme.ts's own hardcoded fallback).
 */
import type { TelecomWorld } from '@looprun-bench/telecom';
import type { ToolRecord } from './transcript.js';

const DEFAULT_REFERENCE_NOW = '2025-02-25T12:08:00-05:00'; // EST — matches theme.ts's stateBlock fallback.

/** Parse "The current time is YYYY-MM-DD HH:MM:SS EST." out of tau2's system message; falls back to
 *  the fixed policy clock the telecom domain ships with when the text isn't found (never throws). */
export function extractReferenceNow(systemContent: string): Date {
  const m = systemContent.match(/current time is (\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*EST/i);
  if (!m) return new Date(DEFAULT_REFERENCE_NOW);
  const d = new Date(`${m[1]}T${m[2]}-05:00`);
  return Number.isNaN(d.getTime()) ? new Date(DEFAULT_REFERENCE_NOW) : d;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function isCustomer(v: unknown): v is Record<string, unknown> {
  return isRecord(v) && typeof v.customer_id === 'string' && typeof v.full_name === 'string';
}
function isLine(v: unknown): v is Record<string, unknown> {
  return isRecord(v) && typeof v.line_id === 'string' && typeof v.status === 'string';
}
function isBill(v: unknown): v is Record<string, unknown> {
  return isRecord(v) && typeof v.bill_id === 'string' && typeof v.status === 'string';
}

interface State {
  verifiedCustomers: Set<string>;
  lineStatus: Map<string, string>;
  roaming: Map<string, boolean>;
  contractEndedInPast: Map<string, boolean>;
  bills: Map<string, { status: string; customerId?: string }>;
}

function recordLine(state: State, referenceNow: Date, line: Record<string, unknown>): void {
  const lineId = line.line_id as string;
  state.lineStatus.set(lineId, String(line.status));
  if (typeof line.roaming_enabled === 'boolean') state.roaming.set(lineId, line.roaming_enabled);
  const ced = line.contract_end_date;
  if (typeof ced === 'string' && ced) {
    const d = new Date(`${ced}T00:00:00-05:00`);
    if (!Number.isNaN(d.getTime())) state.contractEndedInPast.set(lineId, d.getTime() < referenceNow.getTime());
  } else if (ced === null) {
    state.contractEndedInPast.set(lineId, false);
  }
}

function recordBill(state: State, bill: Record<string, unknown>): void {
  const billId = bill.bill_id as string;
  state.bills.set(billId, {
    status: String(bill.status),
    customerId: typeof bill.customer_id === 'string' ? bill.customer_id : state.bills.get(billId)?.customerId,
  });
}

/** Replays every REAL tool record (in order) into a fresh `State`, then wraps it as a `TelecomWorld`.
 *  Failed calls (`ok:false`) never update state — a raised exception never mutated the real DB either,
 *  so replaying it here would fabricate state the live tool never produced. */
export function buildWorldAdapter(referenceNow: Date, toolRecords: ToolRecord[]): TelecomWorld {
  const state: State = {
    verifiedCustomers: new Set(),
    lineStatus: new Map(),
    roaming: new Map(),
    contractEndedInPast: new Map(),
    bills: new Map(),
  };

  for (const rec of toolRecords) {
    if (!rec.ok) continue;
    const { name, args, parsed } = rec;
    switch (name) {
      case 'get_customer_by_phone':
      case 'get_customer_by_id':
        if (isCustomer(parsed)) state.verifiedCustomers.add(parsed.customer_id as string);
        break;
      case 'get_customer_by_name':
        if (Array.isArray(parsed)) {
          for (const c of parsed) if (isCustomer(c)) state.verifiedCustomers.add(c.customer_id as string);
        }
        break;
      case 'get_details_by_id':
        if (isLine(parsed)) recordLine(state, referenceNow, parsed);
        else if (isBill(parsed)) recordBill(state, parsed);
        // Customer/Device/Plan via get_details_by_id: intentionally NOT fed into verifiedCustomers —
        // isVerifiedCustomer's documented contract (telecom-world.ts) names only the 3 lookup tools.
        break;
      case 'get_bills_for_customer':
        if (Array.isArray(parsed)) for (const b of parsed) if (isBill(b)) recordBill(state, b);
        break;
      case 'suspend_line':
      case 'resume_line': {
        const line = isRecord(parsed) ? parsed.line : undefined;
        if (isLine(line)) {
          recordLine(state, referenceNow, line);
        } else if (typeof args.line_id === 'string') {
          // Fallback postcondition inference if the result ever lacks the nested `line` (defensive).
          state.lineStatus.set(args.line_id, name === 'suspend_line' ? 'Suspended' : 'Active');
        }
        break;
      }
      case 'enable_roaming':
        if (typeof args.line_id === 'string') state.roaming.set(args.line_id, true);
        break;
      case 'disable_roaming':
        if (typeof args.line_id === 'string') state.roaming.set(args.line_id, false);
        break;
      case 'send_payment_request':
        if (typeof args.bill_id === 'string') {
          state.bills.set(args.bill_id, {
            status: 'Awaiting Payment',
            customerId: typeof args.customer_id === 'string' ? args.customer_id : state.bills.get(args.bill_id)?.customerId,
          });
        }
        break;
      default:
        break; // get_data_usage / refuel_data / transfer_to_human_agents: nothing our accessors read.
    }
  }

  const world: TelecomWorld = {
    // AgentWorld base — never invoked by this shim (tau2 owns tool execution; no flowChains/uploads
    // in this spec, so exec/advanceTurn/ingestAttachment are unreachable stubs, not dead-code risk).
    exec(): never {
      throw new Error('world.exec is not callable in the tau2 shim — tau2 owns tool execution.');
    },
    advanceTurn(): void {},
    ingestAttachment(): string {
      return '';
    },
    toolCalls: [],
    sseActions: [],

    isVerifiedCustomer: (customerId: string) => state.verifiedCustomers.has(customerId),
    billStatus: (billId: string) => state.bills.get(billId)?.status ?? null,
    lineStatus: (lineId: string) => state.lineStatus.get(lineId) ?? null,
    lineContractEndedInPast: (lineId: string) => (state.contractEndedInPast.has(lineId) ? (state.contractEndedInPast.get(lineId) as boolean) : null),
    lineRoamingEnabled: (lineId: string) => (state.roaming.has(lineId) ? (state.roaming.get(lineId) as boolean) : null),
    customerHasUnpaidOverdueBills: (customerId: string) => {
      let seenAny = false;
      for (const bill of state.bills.values()) {
        if (bill.customerId !== customerId) continue;
        seenAny = true;
        if (bill.status === 'Overdue') return true;
      }
      return seenAny ? false : null;
    },
  };

  return world;
}
