# atlas — E1 agent map (human gate #1)

> **Gate status: PRE-APPROVED** by Marcos (2026-07-15 plan approval, overnight autonomous run) —
> review this table in the morning; corrections re-enter as an E1 revision + re-draft of the
> affected specs, not a full re-run.

Decomposition by TOOL-NEED (D3 — never by intent). 54 tools → 5 agents, all ≤15. Destructive
subset (two-step `confirmed`) shown per agent. Prefix: `at-`.

| agent | tools (n) | jobs | destructive |
|---|---|---|---|
| `at-rentals` | checkAvailability, listBookings, getBooking, createBooking, rescheduleBooking, cancelBooking, checkOutAsset, checkInAsset, closeBooking, listTechnicians, getTechnicianSchedule, dispatchTechnician, cancelDispatch (13) | reserve/reschedule/cancel rentals; check-out/check-in; dispatch technicians | cancelBooking, cancelDispatch |
| `at-billing` | generateQuote, getQuote, generateInvoice, listInvoices, getInvoice, getDepositBalance, chargeDeposit, releaseDeposit, payInvoice, issueRefund, voidInvoice (11) | quote pricing; invoices; deposits; payments/refunds | chargeDeposit, releaseDeposit, payInvoice, issueRefund, voidInvoice |
| `at-claims` | listClaims, getClaim, fileClaim, addClaimEvidence, resolveClaim, listHolds, placeHold, releaseHold, listCustomers, getCustomer, createCustomer, lookupPolicy (12) | damage/incident claims; legal & compliance holds; customer records; policy lookup | resolveClaim, releaseHold |
| `at-inventory` | listAssets, getAsset, registerAsset, updateAssetCondition, scheduleMaintenance, completeMaintenance, getMaintenanceLog, retireAsset, transferAsset (9) | asset registry; condition & maintenance; retire/transfer | retireAsset, transferAsset |
| `at-admin` | getWorkspace, getPlanUsage, listMembers, getMember, inviteMember, updateMemberRole, removeMember, changePlan, getAuditLog (9) | workspace/tenant admin; members & roles; plan/quota | removeMember, changePlan |

## E1 decisions (documented for gate review)

1. **Settlement flow split kept** (G1 flagged the one degree of freedom): the flow
   checkIn → releaseDeposit → invoice → pay → close spans `at-rentals`/`at-billing`. Folding the
   3 deposit tools into rentals would hit 16 tools and blur money ownership. Instead: (a) guards
   gate cross-agent via `projection()` reads (`bookingHasOpenClaim` blocks `releaseDeposit`,
   `depositShortfall` informs check-in replies); (b) G3 authors settlement cases per-bucket only
   (the check-in case's correct reply defers deposit release to billing — that IS the
   scope-boundary dimension); (c) no eval case requires cross-bucket writes.
2. **Shared read-only tools NOT duplicated**: cross-agent state rides `projection()` (holds,
   quotas, permissions), not repeated read tools — keeps every bucket lean and the trunk stable.
3. **Naming by job** (`rentals`, `billing`, `claims`, `inventory`, `admin`) — never audience/mood.
4. Terminal tools (`replyToUser`/`askUser`) are runtime-owned — in no agent's `tools`.
5. Case buckets: G3 emits ~12 cases per agent; the case→agent map lands in
   `bench/adapters/s15/agents-generated/atlas/CASE-MAP.tsv` (and the s14 twin).
