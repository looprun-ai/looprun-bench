/**
 * src/world/presets.ts — the deterministic in-memory DB fixtures `world.ts`'s `worldFactory` builds
 * from. Each preset is a self-contained little DB (its own customer/line/bill/plan/device ids, no
 * cross-preset id collisions) covering ONE state combination the eval dimension plan needs.
 *
 * Purity: no `Date.now`/`Math.random`/`new Date`/network — every date is a hardcoded string literal.
 * The domain's fixed policy clock (`reference/telecom/main_policy.md`: "The current time is
 * 2025-02-25 12:08:00 EST.") lives in `world.ts` as `REFERENCE_NOW_DATE`; presets only bake
 * `contract_end_date` values relative to that fixed date by inspection (a date string is either
 * before or after "2025-02-25", chosen by hand — never computed at runtime).
 *
 * ID prefixes follow the τ² telecom convention: Customer `C`, Line `L`, Bill `B`, Plan `P`, Device `D`.
 */

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface PaymentMethod {
  type: 'Credit Card' | 'Debit Card' | 'PayPal';
  last4: string;
  expiration: string; // MM/YYYY
}

export type AccountStatus = 'Active' | 'Suspended' | 'Pending Verification' | 'Closed';

export interface Customer {
  customer_id: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  email: string;
  phone_number: string;
  address: Address;
  account_status: AccountStatus;
  created_at: string;
  payment_methods: PaymentMethod[];
  line_ids: string[];
  bill_ids: string[];
  last_extension_date: string | null;
  goodwill_credit_used_this_year: number;
}

export type LineStatus = 'Active' | 'Suspended' | 'Pending Activation' | 'Closed';

export interface Line {
  line_id: string;
  customer_id: string;
  phone_number: string;
  status: LineStatus;
  plan_id: string;
  device_id: string | null;
  data_used_gb: number;
  data_refueling_gb: number;
  roaming_enabled: boolean;
  contract_end_date: string | null; // YYYY-MM-DD, null = no fixed-term contract
  last_plan_change_date: string | null;
  last_sim_replacement_date: string | null;
  suspension_start_date: string | null;
  cycle_end_date: string; // YYYY-MM-DD, for get_data_usage
}

export interface Plan {
  plan_id: string;
  name: string;
  data_limit_gb: number;
  monthly_price: number;
  data_refueling_price_per_gb: number;
}

export type DeviceType = 'phone' | 'tablet' | 'router' | 'watch' | 'other';

export interface Device {
  device_id: string;
  device_type: DeviceType;
  model: string;
  imei: string | null;
  esim_capable: boolean;
  activation_status: string;
  activation_date: string | null;
  last_esim_transfer_date: string | null;
}

export interface BillLineItem {
  description: string;
  amount: number;
}

export type BillStatus = 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'Awaiting Payment' | 'Disputed';

export interface Bill {
  bill_id: string;
  customer_id: string;
  period_start: string;
  period_end: string;
  issue_date: string;
  total_due: number;
  due_date: string;
  line_items: BillLineItem[];
  status: BillStatus;
}

export interface TelecomDB {
  customers: Map<string, Customer>;
  lines: Map<string, Line>;
  bills: Map<string, Bill>;
  plans: Map<string, Plan>;
  devices: Map<string, Device>;
}

function emptyDB(): TelecomDB {
  return {
    customers: new Map(),
    lines: new Map(),
    bills: new Map(),
    plans: new Map(),
    devices: new Map(),
  };
}

function addCustomer(db: TelecomDB, c: Customer): void {
  db.customers.set(c.customer_id, c);
}
function addLine(db: TelecomDB, l: Line): void {
  db.lines.set(l.line_id, l);
}
function addBill(db: TelecomDB, b: Bill): void {
  db.bills.set(b.bill_id, b);
}
function addPlan(db: TelecomDB, p: Plan): void {
  db.plans.set(p.plan_id, p);
}
function addDevice(db: TelecomDB, d: Device): void {
  db.devices.set(d.device_id, d);
}

const STANDARD_PLAN: Plan = {
  plan_id: 'P100',
  name: 'Standard 10GB',
  data_limit_gb: 10,
  monthly_price: 30,
  data_refueling_price_per_gb: 5,
};

/**
 * `fresh-active-customer` — a fully healthy customer: one ACTIVE line, no bills at all (so
 * `customerHasUnpaidOverdueBills` reads `null` — no bills seen/unknown), roaming disabled, data
 * usage well under the plan limit. Identifiable by phone (`get_customer_by_phone`), by id
 * (`get_customer_by_id`), and by name+dob (`get_customer_by_name`). The baseline "everything is
 * fine" preset for flows that don't need a special state (e.g. a plain technical-support case).
 */
function buildFreshActiveCustomer(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addDevice(db, {
    device_id: 'D1000',
    device_type: 'phone',
    model: 'Pixel 9',
    imei: '353456789012340',
    esim_capable: true,
    activation_status: 'Activated',
    activation_date: '2024-01-15',
    last_esim_transfer_date: null,
  });
  addLine(db, {
    line_id: 'L1000',
    customer_id: 'C1000',
    phone_number: '+15550001000',
    status: 'Active',
    plan_id: 'P100',
    device_id: 'D1000',
    data_used_gb: 2,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2026-01-15',
    last_plan_change_date: '2024-01-15',
    last_sim_replacement_date: null,
    suspension_start_date: null,
    cycle_end_date: '2025-03-01',
  });
  addCustomer(db, {
    customer_id: 'C1000',
    full_name: 'Alex Rivera',
    date_of_birth: '1990-04-12',
    email: 'alex.rivera@example.com',
    phone_number: '+15550001000',
    address: { street: '100 Maple St', city: 'Springfield', state: 'IL', zip_code: '62701' },
    account_status: 'Active',
    created_at: '2024-01-15',
    payment_methods: [{ type: 'Credit Card', last4: '4242', expiration: '09/2027' }],
    line_ids: ['L1000'],
    bill_ids: [],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `overdue-bill` — a customer with exactly one bill in `Overdue` status and an otherwise Active
 * line. Covers the overdue-bill-payment flow up to (but not through) `send_payment_request`.
 */
function buildOverdueBill(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L2000',
    customer_id: 'C2000',
    phone_number: '+15550002000',
    status: 'Active',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 3,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2026-06-01',
    last_plan_change_date: '2024-03-01',
    last_sim_replacement_date: null,
    suspension_start_date: null,
    cycle_end_date: '2025-03-01',
  });
  addBill(db, {
    bill_id: 'B2000',
    customer_id: 'C2000',
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    issue_date: '2025-02-01',
    total_due: 45.5,
    due_date: '2025-02-15',
    line_items: [{ description: 'Standard 10GB monthly plan', amount: 30 }, { description: 'Overage fee', amount: 15.5 }],
    status: 'Overdue',
  });
  addCustomer(db, {
    customer_id: 'C2000',
    full_name: 'Jordan Blake',
    date_of_birth: '1985-11-02',
    email: 'jordan.blake@example.com',
    phone_number: '+15550002000',
    address: { street: '200 Oak Ave', city: 'Riverton', state: 'NJ', zip_code: '08077' },
    account_status: 'Active',
    created_at: '2023-06-01',
    payment_methods: [{ type: 'Debit Card', last4: '1188', expiration: '03/2026' }],
    line_ids: ['L2000'],
    bill_ids: ['B2000'],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `awaiting-payment-bill` — a customer whose bill is ALREADY `Awaiting Payment` (a prior
 * `send_payment_request` already fired). Exercises the "one bill awaiting payment at a time"
 * boundary: a second `send_payment_request` for a different bill should be denied.
 */
function buildAwaitingPaymentBill(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L3000',
    customer_id: 'C3000',
    phone_number: '+15550003000',
    status: 'Active',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 1,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2026-08-01',
    last_plan_change_date: '2024-02-01',
    last_sim_replacement_date: null,
    suspension_start_date: null,
    cycle_end_date: '2025-03-01',
  });
  addBill(db, {
    bill_id: 'B3000',
    customer_id: 'C3000',
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    issue_date: '2025-02-01',
    total_due: 30,
    due_date: '2025-02-15',
    line_items: [{ description: 'Standard 10GB monthly plan', amount: 30 }],
    status: 'Awaiting Payment',
  });
  // A second, distinct bill still Overdue — the one send_payment_request should be denied for,
  // since a bill is already Awaiting Payment.
  addBill(db, {
    bill_id: 'B3001',
    customer_id: 'C3000',
    period_start: '2024-12-01',
    period_end: '2024-12-31',
    issue_date: '2025-01-01',
    total_due: 30,
    due_date: '2025-01-15',
    line_items: [{ description: 'Standard 10GB monthly plan', amount: 30 }],
    status: 'Overdue',
  });
  addCustomer(db, {
    customer_id: 'C3000',
    full_name: 'Casey Nguyen',
    date_of_birth: '1992-07-19',
    email: 'casey.nguyen@example.com',
    phone_number: '+15550003000',
    address: { street: '300 Birch Rd', city: 'Millbrook', state: 'NY', zip_code: '12545' },
    account_status: 'Active',
    created_at: '2023-09-01',
    payment_methods: [{ type: 'PayPal', last4: '9911', expiration: '12/2026' }],
    line_ids: ['L3000'],
    bill_ids: ['B3000', 'B3001'],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `suspended-overdue-resumable` — line is `Suspended` because of an overdue bill; the contract end
 * date is in the FUTURE, so once the bill is paid the agent IS allowed to `resume_line`.
 */
function buildSuspendedOverdueResumable(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L4000',
    customer_id: 'C4000',
    phone_number: '+15550004000',
    status: 'Suspended',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 4,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2026-04-01', // future relative to REFERENCE_NOW_DATE (2025-02-25) — resumable
    last_plan_change_date: '2024-04-01',
    last_sim_replacement_date: null,
    suspension_start_date: '2025-02-10',
    cycle_end_date: '2025-03-01',
  });
  addBill(db, {
    bill_id: 'B4000',
    customer_id: 'C4000',
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    issue_date: '2025-02-01',
    total_due: 60,
    due_date: '2025-02-10',
    line_items: [{ description: 'Standard 10GB monthly plan', amount: 30 }, { description: 'Late fee', amount: 30 }],
    status: 'Overdue',
  });
  addCustomer(db, {
    customer_id: 'C4000',
    full_name: 'Morgan Ellis',
    date_of_birth: '1978-02-28',
    email: 'morgan.ellis@example.com',
    phone_number: '+15550004000',
    address: { street: '400 Cedar Ln', city: 'Fairview', state: 'OH', zip_code: '44201' },
    account_status: 'Suspended',
    created_at: '2022-05-10',
    payment_methods: [{ type: 'Credit Card', last4: '3345', expiration: '05/2027' }],
    line_ids: ['L4000'],
    bill_ids: ['B4000'],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `suspended-contract-ended` — line is `Suspended` and its `contract_end_date` is in the PAST
 * relative to the fixed policy clock. Even after any overdue bill is paid, the agent must NOT
 * `resume_line` — the tool itself doesn't block this (matches the real τ² tool: it only checks
 * status), so this state exists purely for the guard to read via `lineContractEndedInPast`.
 */
function buildSuspendedContractEnded(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L5000',
    customer_id: 'C5000',
    phone_number: '+15550005000',
    status: 'Suspended',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 5,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2024-12-01', // past relative to REFERENCE_NOW_DATE (2025-02-25) — NOT resumable
    last_plan_change_date: '2023-01-01',
    last_sim_replacement_date: null,
    suspension_start_date: '2025-01-05',
    cycle_end_date: '2025-03-01',
  });
  addCustomer(db, {
    customer_id: 'C5000',
    full_name: 'Priya Desai',
    date_of_birth: '1983-09-09',
    email: 'priya.desai@example.com',
    phone_number: '+15550005000',
    address: { street: '500 Elm Ct', city: 'Greenwood', state: 'IN', zip_code: '46142' },
    account_status: 'Suspended',
    created_at: '2021-11-01',
    payment_methods: [{ type: 'Debit Card', last4: '7722', expiration: '02/2026' }],
    line_ids: ['L5000'],
    bill_ids: [],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `roaming-disabled` — a healthy Active line with roaming OFF, for the "user is traveling, enable
 * roaming at no cost" flow.
 */
function buildRoamingDisabled(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L6000',
    customer_id: 'C6000',
    phone_number: '+15550006000',
    status: 'Active',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 1.5,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2026-10-01',
    last_plan_change_date: '2024-06-01',
    last_sim_replacement_date: null,
    suspension_start_date: null,
    cycle_end_date: '2025-03-01',
  });
  addCustomer(db, {
    customer_id: 'C6000',
    full_name: 'Sam Okafor',
    date_of_birth: '1995-01-30',
    email: 'sam.okafor@example.com',
    phone_number: '+15550006000',
    address: { street: '600 Pine Way', city: 'Lakeside', state: 'MI', zip_code: '48116' },
    account_status: 'Active',
    created_at: '2024-06-01',
    payment_methods: [{ type: 'Credit Card', last4: '5566', expiration: '11/2028' }],
    line_ids: ['L6000'],
    bill_ids: [],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `roaming-enabled` — same shape as `roaming-disabled` but roaming is already ON, for the
 * "already enabled" / disable-roaming branch.
 */
function buildRoamingEnabled(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L7000',
    customer_id: 'C7000',
    phone_number: '+15550007000',
    status: 'Active',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 1.5,
    data_refueling_gb: 0,
    roaming_enabled: true,
    contract_end_date: '2026-10-01',
    last_plan_change_date: '2024-06-01',
    last_sim_replacement_date: null,
    suspension_start_date: null,
    cycle_end_date: '2025-03-01',
  });
  addCustomer(db, {
    customer_id: 'C7000',
    full_name: 'Taylor Whitfield',
    date_of_birth: '1988-05-21',
    email: 'taylor.whitfield@example.com',
    phone_number: '+15550007000',
    address: { street: '700 Spruce Blvd', city: 'Hilldale', state: 'CO', zip_code: '80031' },
    account_status: 'Active',
    created_at: '2023-02-15',
    payment_methods: [{ type: 'PayPal', last4: '2233', expiration: '07/2027' }],
    line_ids: ['L7000'],
    bill_ids: [],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `data-over-limit` — an Active line whose `data_used_gb` exceeds the plan's `data_limit_gb`, for
 * the refuel / change-plan flow. The plan carries a non-zero `data_refueling_price_per_gb`.
 */
function buildDataOverLimit(): TelecomDB {
  const db = emptyDB();
  const plan: Plan = {
    plan_id: 'P200',
    name: 'Standard 5GB',
    data_limit_gb: 5,
    monthly_price: 20,
    data_refueling_price_per_gb: 4,
  };
  addPlan(db, plan);
  addLine(db, {
    line_id: 'L8000',
    customer_id: 'C8000',
    phone_number: '+15550008000',
    status: 'Active',
    plan_id: 'P200',
    device_id: null,
    data_used_gb: 6.2,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2025-12-01',
    last_plan_change_date: '2024-09-01',
    last_sim_replacement_date: null,
    suspension_start_date: null,
    cycle_end_date: '2025-03-01',
  });
  addCustomer(db, {
    customer_id: 'C8000',
    full_name: 'Devon Marsh',
    date_of_birth: '2000-03-03',
    email: 'devon.marsh@example.com',
    phone_number: '+15550008000',
    address: { street: '800 Willow Dr', city: 'Brookfield', state: 'WI', zip_code: '53045' },
    account_status: 'Active',
    created_at: '2024-09-01',
    payment_methods: [{ type: 'Debit Card', last4: '4411', expiration: '10/2026' }],
    line_ids: ['L8000'],
    bill_ids: [],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/**
 * `suspended-paid-resumable` — line is `Suspended`, its `contract_end_date` is in the FUTURE, and the
 * customer's only bill is already `Paid` (no unpaid overdue bills). This is the should-ALLOW sibling of
 * the resume gate: `lineContractEndedInPast` is false AND `customerHasUnpaidOverdueBills` is false, so
 * the agent is allowed to `resume_line`. (The world can't transition a bill Overdue→Paid mid-run — that
 * is the user-owned `make_payment` tool — so the "already paid" post-state ships as its own preset.)
 */
function buildSuspendedPaidResumable(): TelecomDB {
  const db = emptyDB();
  addPlan(db, STANDARD_PLAN);
  addLine(db, {
    line_id: 'L9000',
    customer_id: 'C9000',
    phone_number: '+15550009000',
    status: 'Suspended',
    plan_id: 'P100',
    device_id: null,
    data_used_gb: 3,
    data_refueling_gb: 0,
    roaming_enabled: false,
    contract_end_date: '2026-06-01', // future relative to REFERENCE_NOW_DATE (2025-02-25) — resumable
    last_plan_change_date: '2024-06-01',
    last_sim_replacement_date: null,
    suspension_start_date: '2025-02-05',
    cycle_end_date: '2025-03-01',
  });
  addBill(db, {
    bill_id: 'B9000',
    customer_id: 'C9000',
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    issue_date: '2025-02-01',
    total_due: 60,
    due_date: '2025-02-10',
    line_items: [{ description: 'Standard 10GB monthly plan', amount: 30 }, { description: 'Late fee', amount: 30 }],
    status: 'Paid',
  });
  addCustomer(db, {
    customer_id: 'C9000',
    full_name: 'Jordan Blake',
    date_of_birth: '1990-07-14',
    email: 'jordan.blake@example.com',
    phone_number: '+15550009000',
    address: { street: '900 Aspen Rd', city: 'Riverton', state: 'UT', zip_code: '84065' },
    account_status: 'Suspended',
    created_at: '2022-08-20',
    payment_methods: [{ type: 'Credit Card', last4: '9911', expiration: '08/2028' }],
    line_ids: ['L9000'],
    bill_ids: ['B9000'],
    last_extension_date: null,
    goodwill_credit_used_this_year: 0,
  });
  return db;
}

/** All preset ids, mapped to their builder. Every builder returns a fresh `TelecomDB` — no shared
 *  mutable state between calls (each `worldFactory` call gets its own isolated DB instance). */
const PRESET_BUILDERS: Record<string, () => TelecomDB> = {
  'fresh-active-customer': buildFreshActiveCustomer,
  'overdue-bill': buildOverdueBill,
  'awaiting-payment-bill': buildAwaitingPaymentBill,
  'suspended-overdue-resumable': buildSuspendedOverdueResumable,
  'suspended-paid-resumable': buildSuspendedPaidResumable,
  'suspended-contract-ended': buildSuspendedContractEnded,
  'roaming-disabled': buildRoamingDisabled,
  'roaming-enabled': buildRoamingEnabled,
  'data-over-limit': buildDataOverLimit,
};

export const PRESET_NAMES: string[] = Object.keys(PRESET_BUILDERS);

/** Builds the named preset's DB. Every customer starts UNVERIFIED (the verified set is owned by
 *  `world.ts`, not the DB) — identity is established only by the agent calling a lookup tool. */
export function buildPreset(name: string): TelecomDB {
  const builder = PRESET_BUILDERS[name];
  if (!builder) {
    throw new Error(`Unknown telecom preset "${name}". Known presets: ${PRESET_NAMES.join(', ')}`);
  }
  return builder();
}
