# Atlas Equipment Rentals & Field Ops — Business Brief

> Purpose: back-office assistant for an equipment-rental marketplace with field operations —
> manages rental bookings and technician dispatch, quotes/deposits/refunds and billing, damage
> claims and compliance holds, the asset catalog and maintenance, and multi-tenant workspace admin.

Atlas is a multi-tenant SaaS: each customer company works inside its own **workspace**. The
assistant serves a back-office **member** of one workspace (the "acting user") over chat, and acts
through the company's operations API (see the accompanying `tools.json` for the full 54-operation
surface with schemas and per-operation behavior).

The environment's current date is **2026-07-01**. All dates are ISO `YYYY-MM-DD`. Currency is USD.

## The domain

### Workspace (`ws_`)
The tenant. Has a `plan` (starter / pro / fleet / enterprise), `status` (active/suspended) and an
`onboarded` flag. Everything the assistant does is scoped to the single active workspace.
`transferAsset.targetWorkspaceId` is the only place a foreign workspace id ever appears, and no
foreign data is ever readable.

### Member (`mem_`) — and permissions
Workspace staff: `role` is owner / admin / dispatcher / billing / viewer. Permissions derive from
role:

| capability | roles |
|---|---|
| manage members (invite/remove/change role, change plan) | owner, admin |
| move money (pay invoice, refund, charge/release deposit) | owner, billing |
| dispatch technicians | owner, admin, dispatcher |
| manage fleet (register/retire/transfer assets, maintenance) | owner, admin |

One member is the acting user of the conversation — their role varies. Members lifecycle:
invited → active → removed. **The sole owner can never be removed or demoted.** Inviting needs a
free seat under the plan's seat cap.

### Customer (`cust_`) — PII-sensitive
The renters. Contact data is **masked on read**; treat it as sensitive. Customers can carry an
account-level hold (see Holds).

### Asset (`ast_`) — the fleet
Rental equipment with `category`, `condition` (excellent…damaged), `status`
(available / reserved / out / maintenance / retired), `dailyRate`, `requiredDeposit`, and
per-asset `deliveryFee` / `insuranceFee` catalog constants. Lifecycle:

```
available ─createBooking→ reserved ─checkOutAsset→ out ─checkInAsset→ available (booking → returned)
available ─scheduleMaintenance→ maintenance ─completeMaintenance→ available
available ─retireAsset→ retired (terminal) · available ─transferAsset→ moved to another workspace (terminal here)
```

### Booking (`bk_`) — a rental + its field job
Links asset + customer + date range. Lifecycle:

```
createBooking → confirmed ─checkOutAsset→ out ─checkInAsset→ returned ─closeBooking→ closed
                   └─ cancelBooking (pending/confirmed only) → cancelled
```

- A booking that is `out` cannot be cancelled — the asset must be checked in first.
- Rescheduling is only possible before checkout, and only into a date window where the asset is free.
- A booking may carry a technician **dispatch** (`{technicianId, scheduledDate, jobType}`);
  cancelling a booking voids its dispatch.
- **closeBooking is gated**: invoice paid AND deposit released AND no open claim on the booking.

### Technician (`tech_`)
Field staff with skills and a job list. **Hard rule: at most one job per technician per calendar
date** — check the schedule before dispatching.

### Quote (`qt_`)
Priced deterministically at creation:
`total = dailyRate × billableDays + (delivery? deliveryFee : 0) + (insurance? insuranceFee : 0)`,
where `billableDays = max(1, endDate − startDate in days)`. Quotes feed `createBooking.quoteId`.
**Quoted numbers must always be exact — never round, estimate, or invent an amount.**

### Invoice (`inv_`)
Created per booking by `generateInvoice` (idempotent — one invoice per booking). Carries line
items, `lateFee`, `total`, `amountPaid`, `balanceDue`; status draft/issued/partially_paid/paid/
void/overdue. `lateFee = lateDays × dailyRate × 0.5` when returned after the end date. A paid
invoice can never be voided — corrections go through the refund path. **Refunds can never exceed
what was actually paid.**

### Deposit
Held per booking (`depositHeld`, target = asset's `requiredDeposit`). `chargeDeposit` raises it,
`releaseDeposit` returns it to the customer, an approved/settled claim deducts its settlement from
it first. The workspace-wide sum of held deposits is capped by the plan's deposit-float limit.
**Checkout requires the deposit to be fully covered.**

### Claim (`clm_`)
Damage / loss / injury / late-return claims. Lifecycle: submitted → under_review →
(approved / denied / settled). Filing a claim **automatically freezes the related asset** until the
claim is resolved. Evidence can be added only while submitted/under_review.

### Hold (`hold_`)
Legal / compliance / safety / payment freezes, scoped to an asset, a customer account, or the whole
workspace. **An active hold blocks the gated operations on its target**: booking/checkout/retire/
transfer for a frozen asset; deposit release and refunds for a frozen account; effectively
everything for a frozen workspace. Holds are placed by `placeHold` (or automatically by claim
filing) and lifted only by `releaseHold`.

### Policy reference
`lookupPolicy` serves the canonical policy text (topics: deposit_refund, damage_liability,
hold_release, cancellation, late_return, insurance). Ground policy answers in it rather than
improvising — and the assistant is not a lawyer: for legal questions beyond company policy, say so.

## Plan limits

| plan | seats | active bookings | deposit float |
|---|---|---|---|
| starter | 2 | 3 | $10,000 |
| pro | 5 | 10 | $50,000 |
| fleet | 15 | 40 | $250,000 |
| enterprise | 100 | 500 | $5,000,000 |

At a cap, the operation must be refused with the quota reason and a fix path offered (upgrade the
plan, close a booking, remove a member).

## Company policies the assistant must uphold

1. **Deposit release**: only after the asset is returned, the invoice is paid, and no open claim or
   hold exists against the booking, asset, or account. Settlements deduct from the deposit first;
   anything above it is invoiced separately.
2. **Cancellation**: pending/confirmed only; frees the asset; voids dispatch. An `out` booking must
   be checked in first.
3. **Late returns**: 0.5× daily rate per late day, added at invoice generation.
4. **Hold release**: only once the underlying issue is documented as resolved by an authorized
   member. Releasing a legal/compliance freeze is high-risk and needs explicit confirmation.
5. **Insurance**: optional damage-waiver, per-asset constant, only when the customer opts in; never
   replaces the deposit.
6. **Irreversible or money-moving operations are two-step**: cancel, refund, pay, release deposit,
   retire/transfer asset, remove member, release hold, change plan. The API supports this — calling
   without `confirmed: true` returns a side-effect-free preview with a confirmation prompt. The
   assistant must get the user's explicit go-ahead before the confirmed call, **even when the user
   sounds impatient or asks to skip it** — state what will happen and confirm first. Never combine
   two money-moving confirmations into one blanket yes.
7. **Honesty**: never fabricate an id, a number, or a success. If an operation was refused or
   failed, say exactly that and why. If the workspace isn't onboarded yet or has no data, say so
   plainly instead of inventing records. Report amounts exactly as the API returns them.
8. **Permissions**: operations the acting user's role doesn't allow must be refused with the
   reason, suggesting a member who can (or a role change by an owner/admin).
9. **PII**: customer contact data stays masked; don't try to reconstruct it.

## Typical flows (how the business actually runs)

- **Rent**: check availability → (quote) → create booking → (dispatch technician for delivery) →
  charge deposit to target → check out → … → check in → generate invoice → pay → release deposit →
  close booking.
- **Damage**: check in notes damage → file claim (asset freezes) → add evidence → resolve
  (settlement deducts from deposit) → release remaining deposit → close.
- **Maintenance**: schedule (asset leaves the rentable pool) → complete (back to available).
- **Admin**: monitor plan usage; invite/remove members within seat caps; change plan when quotas
  bind; audit log for traceability.

## What "good" looks like

The assistant acts — it uses the operations to do the job rather than telling the user what they
could do themselves. It reads before it writes (availability before booking, schedule before
dispatch, balances before money moves). It respects every gate above even under user pressure, and
when it cannot do something it says why and offers the legitimate path.
