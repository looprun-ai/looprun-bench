/**
 * src/world/world.ts — the deterministic in-memory `TelecomWorld` the eval runner drives every turn:
 * constructed from a named preset (`presets.ts`), it dispatches all 13 agent tools (`tools.ts`)
 * against an in-memory DB and exposes the 6 domain accessors the guards read.
 *
 * ACCESSOR CONTRACT — must match `packages/shim/src/world-adapter.ts` exactly (same names, same
 * signatures), since guards read identical keys off both the shim's REPLAY world (built from a real
 * transcript) and this LIVE eval world (built from a preset): `isVerifiedCustomer`, `billStatus`,
 * `lineStatus`, `lineContractEndedInPast`, `lineRoamingEnabled`, `customerHasUnpaidOverdueBills`.
 *
 * Ground-truth vs. replay: the shim's accessors only know what a real transcript happened to expose
 * (a REPLAY of observed tool results — partial knowledge, `null` = "not seen yet"). This world is the
 * live backend itself, so `billStatus`/`lineStatus`/`lineContractEndedInPast`/`lineRoamingEnabled`/
 * `customerHasUnpaidOverdueBills` read the DB directly (ground truth, available the instant the
 * record exists) — `null` here means "no such record", not "not looked up yet". `isVerifiedCustomer`
 * is the one exception: identity verification is inherently about what the AGENT has established via
 * a lookup call, so it stays keyed off an explicit verified-set populated only by
 * `get_customer_by_phone` / `get_customer_by_id` / `get_customer_by_name` — exactly like the shim.
 *
 * Purity: no `Date.now`/`Math.random`/`new Date`/network. `REFERENCE_NOW_DATE` is the domain's own
 * FIXED policy clock (`benchmarks/tau2-telecom/reference/main_policy.md`: "The current time is 2025-02-25 12:08:00
 * EST."), a hardcoded module constant — not a live clock read — exactly the shim's
 * `DEFAULT_REFERENCE_NOW` (`packages/shim/src/world-adapter.ts`), just narrowed to the date part
 * since `contract_end_date` is date-only.
 */
import type { AgentWorld, ToolDef } from 'looprun';
import { TOOL_DEFS } from './tools.js';
import { buildPreset, type Bill, type Customer, type Device, type Line, type Plan, type TelecomDB } from './presets.js';

export { TOOL_DEFS };
export type { TelecomDB, Customer, Line, Bill, Plan, Device } from './presets.js';

/** The domain's fixed policy clock — "The current time is 2025-02-25 12:08:00 EST." — narrowed to
 *  its date part since every date this world compares against (`contract_end_date`) is date-only. */
export const REFERENCE_NOW_DATE = '2025-02-25';

/** A read-only, guard/theme-facing snapshot of world state. Plain data only — no Maps, no methods. */
export interface TelecomProjection {
  verifiedCustomerIds: string[];
  customers: Customer[];
  lines: Line[];
  bills: Bill[];
}

/** The world contract the shim's transcript-adapter satisfies too (same accessor names/signatures);
 *  this is the SOURCE OF TRUTH for `@looprun-bench/telecom`'s `TelecomWorld` type. */
export interface TelecomWorld extends AgentWorld {
  isVerifiedCustomer(customerId: string): boolean;
  billStatus(billId: string): string | null;
  lineStatus(lineId: string): string | null;
  lineContractEndedInPast(lineId: string): boolean | null;
  lineRoamingEnabled(lineId: string): boolean | null;
  /** null = no bills seen/unknown; true = has >=1 Overdue bill; false = has bills, none overdue. */
  customerHasUnpaidOverdueBills(customerId: string): boolean | null;
  /** null = no bills seen for that customer; true = has >=1 bill with status 'Awaiting Payment';
   *  false = has bills, none awaiting payment. Backs the "only ONE bill in AWAITING PAYMENT status
   *  at a time" rule (benchmarks/tau2-telecom/reference/main_policy.md:116) so a guard can gate a second
   *  send_payment_request while one is already outstanding. */
  customerHasBillAwaitingPayment(customerId: string): boolean | null;
  /** OPTIONAL on the shared contract: the eval world (worldFactory → TelecomWorldImpl) always provides
   *  it and the theme's stateBlock reads it; the shim's lightweight REPLAY world omits it (theme's
   *  `safeProjection` degrades to the "nothing loaded" render). The benchmark stage should add a
   *  projection() to the shim adapter so the governed arm renders account state there too. */
  projection?(): TelecomProjection;
  [k: string]: any;
}

class ToolError extends Error {}

function cloneAddress(a: Customer['address']): Customer['address'] {
  return { ...a };
}

function cloneCustomer(c: Customer): Customer {
  return {
    ...c,
    address: cloneAddress(c.address),
    payment_methods: c.payment_methods.map((pm) => ({ ...pm })),
    line_ids: [...c.line_ids],
    bill_ids: [...c.bill_ids],
  };
}

function cloneLine(l: Line): Line {
  return { ...l };
}

function cloneBill(b: Bill): Bill {
  return { ...b, line_items: b.line_items.map((li) => ({ ...li })) };
}

function clonePlan(p: Plan): Plan {
  return { ...p };
}

function cloneDevice(d: Device): Device {
  return { ...d };
}

/** Deterministic in-memory τ²-telecom world. Constructed fresh per `(preset, seed)` — `seed` is
 *  accepted for interface parity with `worldFactory`'s signature but unused: this domain has no
 *  randomness to seed (every preset is a fixed fixture, per the purity law). */
export class TelecomWorldImpl implements TelecomWorld {
  private readonly db: TelecomDB;
  private readonly verifiedCustomers: Set<string> = new Set();
  private turn = 0;

  toolCalls: AgentWorld['toolCalls'] = [];
  sseActions: unknown[] = [];

  constructor(preset: string, _seed: number) {
    this.db = buildPreset(preset);
  }

  // ---- AgentWorld base -----------------------------------------------------------------------

  exec(name: string, args: Record<string, unknown>): unknown {
    const result = this.dispatch(name, args);
    this.toolCalls.push({ name, args, result, tookEffect: true });
    return result;
  }

  advanceTurn(): void {
    // No user-gated two-turn action exists in this domain (every tool completes within its own
    // turn), so there is nothing to auto-finish. Kept as a benign turn counter for parity with
    // domains that DO need advanceTurn to flip state.
    this.turn += 1;
  }

  ingestAttachment(_url: string): string {
    // This domain has no attachment-consuming tools; kept as a no-op stub for AgentWorld parity.
    return '';
  }

  // ---- the 6 accessors (must match packages/shim/src/world-adapter.ts) ----------------------

  isVerifiedCustomer(customerId: string): boolean {
    return this.verifiedCustomers.has(customerId);
  }

  billStatus(billId: string): string | null {
    return this.db.bills.get(billId)?.status ?? null;
  }

  lineStatus(lineId: string): string | null {
    return this.db.lines.get(lineId)?.status ?? null;
  }

  lineContractEndedInPast(lineId: string): boolean | null {
    const line = this.db.lines.get(lineId);
    if (!line) return null;
    if (!line.contract_end_date) return false;
    return line.contract_end_date < REFERENCE_NOW_DATE;
  }

  lineRoamingEnabled(lineId: string): boolean | null {
    const line = this.db.lines.get(lineId);
    return line ? line.roaming_enabled : null;
  }

  customerHasUnpaidOverdueBills(customerId: string): boolean | null {
    let seenAny = false;
    for (const bill of this.db.bills.values()) {
      if (bill.customer_id !== customerId) continue;
      seenAny = true;
      if (bill.status === 'Overdue') return true;
    }
    return seenAny ? false : null;
  }

  customerHasBillAwaitingPayment(customerId: string): boolean | null {
    let seenAny = false;
    for (const bill of this.db.bills.values()) {
      if (bill.customer_id !== customerId) continue;
      seenAny = true;
      if (bill.status === 'Awaiting Payment') return true;
    }
    return seenAny ? false : null;
  }

  // ---- projection -----------------------------------------------------------------------------

  projection(): TelecomProjection {
    return {
      verifiedCustomerIds: [...this.verifiedCustomers],
      customers: [...this.db.customers.values()].map(cloneCustomer),
      lines: [...this.db.lines.values()].map(cloneLine),
      bills: [...this.db.bills.values()].map(cloneBill),
    };
  }

  // ---- tool dispatch --------------------------------------------------------------------------

  private dispatch(name: string, args: Record<string, unknown>): unknown {
    switch (name) {
      case 'get_customer_by_phone':
        return this.getCustomerByPhone(String(args.phone_number ?? ''));
      case 'get_customer_by_id':
        return this.getCustomerById(String(args.customer_id ?? ''));
      case 'get_customer_by_name':
        return this.getCustomerByName(String(args.full_name ?? ''), String(args.dob ?? ''));
      case 'get_details_by_id':
        return this.getDetailsById(String(args.id ?? ''));
      case 'suspend_line':
        return this.suspendLine(String(args.customer_id ?? ''), String(args.line_id ?? ''), String(args.reason ?? ''));
      case 'resume_line':
        return this.resumeLine(String(args.customer_id ?? ''), String(args.line_id ?? ''));
      case 'get_bills_for_customer':
        return this.getBillsForCustomer(String(args.customer_id ?? ''), typeof args.limit === 'number' ? args.limit : 12);
      case 'send_payment_request':
        return this.sendPaymentRequest(String(args.customer_id ?? ''), String(args.bill_id ?? ''));
      case 'get_data_usage':
        return this.getDataUsage(String(args.customer_id ?? ''), String(args.line_id ?? ''));
      case 'enable_roaming':
        return this.setRoaming(String(args.customer_id ?? ''), String(args.line_id ?? ''), true);
      case 'disable_roaming':
        return this.setRoaming(String(args.customer_id ?? ''), String(args.line_id ?? ''), false);
      case 'transfer_to_human_agents':
        return this.transferToHumanAgents(String(args.summary ?? ''));
      case 'refuel_data':
        return this.refuelData(String(args.customer_id ?? ''), String(args.line_id ?? ''), Number(args.gb_amount ?? 0));
      default:
        throw new ToolError(`Unknown tool "${name}".`);
    }
  }

  private findLineOwnedBy(customerId: string, lineId: string): Line {
    const line = this.db.lines.get(lineId);
    if (!line) throw new ToolError(`No line found for id ${lineId}.`);
    if (line.customer_id !== customerId) throw new ToolError(`Line ${lineId} does not belong to customer ${customerId}.`);
    return line;
  }

  // -- customer lookups (mark verified) --

  private getCustomerByPhone(phoneNumber: string): Customer {
    for (const customer of this.db.customers.values()) {
      if (customer.phone_number === phoneNumber) {
        this.verifiedCustomers.add(customer.customer_id);
        return cloneCustomer(customer);
      }
      for (const lineId of customer.line_ids) {
        const line = this.db.lines.get(lineId);
        if (line && line.phone_number === phoneNumber) {
          this.verifiedCustomers.add(customer.customer_id);
          return cloneCustomer(customer);
        }
      }
    }
    throw new ToolError(`No customer found for phone number ${phoneNumber}.`);
  }

  private getCustomerById(customerId: string): Customer {
    const customer = this.db.customers.get(customerId);
    if (!customer) throw new ToolError(`No customer found for id ${customerId}.`);
    this.verifiedCustomers.add(customer.customer_id);
    return cloneCustomer(customer);
  }

  private getCustomerByName(fullName: string, dob: string): Customer[] {
    const matches: Customer[] = [];
    const needle = fullName.trim().toLowerCase();
    for (const customer of this.db.customers.values()) {
      if (customer.full_name.trim().toLowerCase() === needle && customer.date_of_birth === dob) {
        this.verifiedCustomers.add(customer.customer_id);
        matches.push(cloneCustomer(customer));
      }
    }
    return matches; // possibly empty — never throws, matching the real tool's documented behavior.
  }

  // -- generic id lookup (never verifies) --

  private getDetailsById(id: string): Customer | Line | Bill | Plan | Device {
    const prefix = id.charAt(0).toUpperCase();
    if (prefix === 'C') {
      const customer = this.db.customers.get(id);
      if (customer) return cloneCustomer(customer);
    } else if (prefix === 'L') {
      const line = this.db.lines.get(id);
      if (line) return cloneLine(line);
    } else if (prefix === 'B') {
      const bill = this.db.bills.get(id);
      if (bill) return cloneBill(bill);
    } else if (prefix === 'P') {
      const plan = this.db.plans.get(id);
      if (plan) return clonePlan(plan);
    } else if (prefix === 'D') {
      const device = this.db.devices.get(id);
      if (device) return cloneDevice(device);
    }
    throw new ToolError(`No object found for id ${id}.`);
  }

  // -- line suspension --

  private suspendLine(customerId: string, lineId: string, _reason: string): { message: string; line: Line } {
    const line = this.findLineOwnedBy(customerId, lineId);
    if (line.status !== 'Active') throw new ToolError(`Line ${lineId} status must be Active to suspend (is ${line.status}).`);
    line.status = 'Suspended';
    line.suspension_start_date = REFERENCE_NOW_DATE;
    return { message: `Line ${lineId} suspended.`, line: cloneLine(line) };
  }

  private resumeLine(customerId: string, lineId: string): { message: string; line: Line } {
    const line = this.findLineOwnedBy(customerId, lineId);
    if (line.status !== 'Suspended' && line.status !== 'Pending Activation') {
      throw new ToolError(`Line ${lineId} status must be Suspended or Pending Activation to resume (is ${line.status}).`);
    }
    line.status = 'Active';
    line.suspension_start_date = null;
    return { message: `Line ${lineId} resumed.`, line: cloneLine(line) };
  }

  // -- bills / payment --

  private getBillsForCustomer(customerId: string, limit: number): Bill[] {
    if (!this.db.customers.has(customerId)) throw new ToolError(`No customer found for id ${customerId}.`);
    return [...this.db.bills.values()]
      .filter((b) => b.customer_id === customerId)
      .sort((a, b) => (a.issue_date < b.issue_date ? 1 : a.issue_date > b.issue_date ? -1 : 0))
      .slice(0, limit)
      .map(cloneBill);
  }

  private sendPaymentRequest(customerId: string, billId: string): string {
    if (!this.db.customers.has(customerId)) throw new ToolError(`No customer found for id ${customerId}.`);
    const bill = this.db.bills.get(billId);
    if (!bill || bill.customer_id !== customerId) throw new ToolError(`No bill found for id ${billId} for customer ${customerId}.`);
    for (const other of this.db.bills.values()) {
      if (other.customer_id === customerId && other.status === 'Awaiting Payment') {
        throw new ToolError(`Customer ${customerId} already has a bill awaiting payment.`);
      }
    }
    bill.status = 'Awaiting Payment';
    return `Payment request sent for bill ${billId}.`;
  }

  // -- data usage / refueling --

  private getDataUsage(
    customerId: string,
    lineId: string,
  ): { line_id: string; data_used_gb: number; data_limit_gb: number; data_refueling_gb: number; cycle_end_date: string } {
    const line = this.findLineOwnedBy(customerId, lineId);
    const plan = this.db.plans.get(line.plan_id);
    if (!plan) throw new ToolError(`No plan found for id ${line.plan_id}.`);
    return {
      line_id: line.line_id,
      data_used_gb: line.data_used_gb,
      data_limit_gb: plan.data_limit_gb,
      data_refueling_gb: line.data_refueling_gb,
      cycle_end_date: line.cycle_end_date,
    };
  }

  private refuelData(customerId: string, lineId: string, gbAmount: number): { message: string; line: Line; charge: number } {
    const line = this.findLineOwnedBy(customerId, lineId);
    if (line.status !== 'Active') throw new ToolError(`Line ${lineId} status must be Active to refuel data (is ${line.status}).`);
    const plan = this.db.plans.get(line.plan_id);
    if (!plan) throw new ToolError(`No plan found for id ${line.plan_id}.`);
    const charge = gbAmount * plan.data_refueling_price_per_gb;
    line.data_refueling_gb += gbAmount;
    return { message: `Refueled ${gbAmount}GB on line ${lineId} for $${charge}.`, line: cloneLine(line), charge };
  }

  // -- roaming --

  private setRoaming(customerId: string, lineId: string, enabled: boolean): string {
    const line = this.findLineOwnedBy(customerId, lineId);
    line.roaming_enabled = enabled;
    return enabled ? `Roaming enabled successfully for line ${lineId}.` : `Roaming disabled successfully for line ${lineId}.`;
  }

  // -- transfer --

  private transferToHumanAgents(summary: string): string {
    return `Transferred to a human agent. Summary: ${summary}`;
  }
}

/** The `EvalConfig.worldFactory` entry point: `(preset, seed) => AgentWorld`. */
export function worldFactory(preset: string, seed: number): TelecomWorld {
  return new TelecomWorldImpl(preset, seed);
}

export type { ToolDef };
