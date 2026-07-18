# Atlas — G1 TOOL-GENESIS review (debate provenance)

Method: BARRED asymmetric debate. The **Toolsmith** is the rigid Advocate; **two independent
Judges** attack each tool and the surface on all six grounds (implementability/determinism,
completeness/RECALL, redundancy, schema quality, magnet risk, cluster viability). T=2 rounds,
refine ≤2× or DROP. The Toolsmith never validates its own tools. Genesis debate dies with this
isolated context; only `tools.json` + `WORLD-MODEL.md` flow onward.

- **Judge A** — implementability & schema purist (fantasy tools, non-determinism, clock/RNG leaks,
  required[]/pattern/confirmed correctness).
- **Judge B** — completeness & anti-magnet (RECALL bias: missing reads/CRUD pairs/lifecycle holes;
  intent-router smells; redundancy; cluster viability).

Final surface: **54 tools**, 13 destructive (two-step `confirmed`), 5 clusters each ≤15.

---

## Surface-level verdicts

| Ground | Verdict | Notes |
|---|---|---|
| Implementability / determinism | PASS | Every tool executes against a pure in-memory class. Date math uses fixed `REFERENCE_NOW` literals + integer date-diff; no clock, no RNG, no I/O. `advanceTurn` flips exactly one field (submitted→under_review). Reads are side-effect-free. |
| Completeness (RECALL) | PASS after 4 additions | See "Judge-forced additions" — invoice creation, customer CRUD, booking close, maintenance log were the gaps. |
| Redundancy | PASS after 2 merges/drops | getQuote merged list+get; searchCatalog dropped; applyLateFee folded into generateInvoice. |
| Schema quality | PASS | All ids carry `pattern`; destructive tools carry non-required `confirmed`; date args patterned `^\d{4}-\d{2}-\d{2}$`; `additionalProperties:false`; behavior-bearing descriptions state the two-step protocol and read-before-invent. |
| Magnet risk (D3) | PASS | No intent-router tool. `lookupPolicy`/`getAuditLog` are data reads, not routers. Every tool is a single capability. |
| Cluster viability | PASS | 13/11/12/9/9 across 5 clusters, all ≤15; every documented flow lands in one agent (with one flagged Rentals↔Billing degree of freedom). |

---

## Judge-forced changes (refinements, drops, additions)

### Additions (RECALL — Judge B, confirmed real gaps)
- **generateInvoice** — ADDED. First draft had payInvoice/voidInvoice/issueRefund but **no way to
  create an invoice** (lifecycle hole: pay/void a thing that can't exist). Resolves the "listBrands
  lesson" — absence would make the model fabricate invoice ids/totals. Idempotent per booking.
- **closeBooking** — ADDED. Draft had returned with no terminal edge (returned→closed missing).
  Gives a gated end-of-life eval (blocked on unpaid/held/open-claim).
- **listCustomers + createCustomer** — ADDED. `getCustomer` needed an id source, and a booking for a
  brand-new walk-in customer had no origin. Both live in Claims/Compliance (customer PII is
  compliance-owned).
- **getMaintenanceLog** — ADDED. `scheduleMaintenance`/`completeMaintenance` had no read; an
  "is this asset overdue for service / what was done" question would fabricate without it.
- **getDepositBalance** — ADDED (Judge B). Deposits were mutated (charge/release) with no read; the
  low-deposit-balance honesty rule and the checkout-gate both require a readable held-vs-required.

### Merges / drops (redundancy — Judge B)
- **getQuote** — list+get MERGED into one read (optional `quoteId`), mirroring the homeservices
  precedent. Judge A confirmed no honesty loss (quotes are secondary, id echoed from generateQuote).
- **searchCatalog** — DROPPED as redundant with `listAssets(category,status)` filters; a free-text
  "search" also flirted with magnet/router semantics. `listAssets` covers discovery.
- **applyLateFee** — DROPPED as a standalone write; late fee is now COMPUTED inside `generateInvoice`
  (`lateDays × dailyRate × lateMultiplier`) from the booking's `returnedDate` vs `endDate`. Removing
  it eliminated a redundant money-ish mutation and kept the number deterministic and auditable.

### Refinements (schema / description — Judge A)
- **fileClaim** — Round 1 required exactly one of bookingId/assetId, unexpressible in draft-07 without
  `oneOf`. REFINED: both optional in schema, the "pass at least one" rule stated in the description and
  enforced by the world (a benchmark-acceptable pattern; matches homeservices serviceId/category).
- **chargeDeposit / releaseDeposit / payInvoice / issueRefund** — Round 1 descriptions under-specified
  idempotency & caps. REFINED to state: idempotent already-held/already-paid guards, refund capped at
  `amountPaid`, partials capped at held/balanceDue. `confirmed` kept OUT of `required[]` (defaults
  false → first call is always the prompt).
- **placeHold vs releaseHold** — Judge A asked why place is not two-step but release is. RESOLVED
  (kept asymmetric): placing a hold is additive/protective (safe to do without confirm); RELEASING a
  legal/compliance freeze is the irreversible-risk direction → `confirmed`. Matches the requirement's
  destructive list (releaseHold, not placeHold).
- **dispatchTechnician** — Judge A flagged a possible second-order magnet (routing "jobs"). RESOLVED:
  it is a concrete assignment capability keyed to a `bookingId`; `jobType` is a data enum, not an
  intent bucket. Conflict rule (one job per tech per date) is deterministic.
- **date args** — all rental/maintenance/dispatch dates patterned to `^\d{4}-\d{2}-\d{2}$` and
  documented as compared to `REFERENCE_NOW` (Judge A: no ISO-datetime ambiguity, no timezone/clock).

---

## Per-tool verdict ledger

Legend: ✔ accepted as drafted · ✎ refined then accepted · ＋ added on Judge demand · ✖ dropped.

### Rentals & Dispatch
| tool | verdict | note |
|---|---|---|
| checkAvailability | ✔ | The availability→book ordering read; returns conflicts/maintenance/holds. |
| listBookings | ✔ | status filter; honesty read for bk_ ids. |
| getBooking | ✔ | detail incl. deposit/dispatch/hold. |
| createBooking | ✎ | added quota + hold + availability gates to description; quoteId optional. |
| rescheduleBooking | ✔ | re-checks availability; blocked on out/returned/closed/cancelled. |
| cancelBooking | ✔ | destructive, two-step; can't cancel `out`. |
| checkOutAsset | ✎ | gate on deposit-covered + no hold made explicit. |
| checkInAsset | ✎ | added `returnedDate` (drives late fee) + condition required. |
| closeBooking | ＋ | closes the returned→closed hole; gated. |
| listTechnicians | ✔ | tech_ id source, skill filter. |
| getTechnicianSchedule | ✔ | conflict read before dispatch. |
| dispatchTechnician | ✎ | confirmed non-magnet; reassign semantics stated. |
| cancelDispatch | ✔ | destructive, two-step. |

### Billing & Payments
| tool | verdict | note |
|---|---|---|
| generateQuote | ✔ | numeric breakdown priced at creation (same-turn fidelity). |
| getQuote | ✎ | list+get merged (optional id). |
| generateInvoice | ＋ | fixes the create-invoice lifecycle hole; folds in late fee; idempotent. |
| listInvoices | ✔ | inv_ id / amount honesty read. |
| getInvoice | ✔ | full line-item breakdown. |
| getDepositBalance | ＋ | readable held-vs-required + workspace float; the deposit honesty read. |
| chargeDeposit | ✎ | idempotent, two-step money. |
| releaseDeposit | ✎ | capped partial; blocked on claim/hold; two-step. |
| payInvoice | ✎ | idempotencyKey + already-paid guard; capped partial; two-step. |
| issueRefund | ✎ | capped at amountPaid; blocked on account freeze; two-step. |
| voidInvoice | ✔ | destructive; paid→refund-instead rule. |
| ~~applyLateFee~~ | ✖ | folded into generateInvoice. |
| ~~searchCatalog~~ | ✖ | redundant with listAssets. |

### Claims & Compliance
| tool | verdict | note |
|---|---|---|
| listClaims | ✔ | clm_ id honesty read. |
| getClaim | ✔ | detail incl. evidence/settlement. |
| fileClaim | ✎ | one-of booking/asset via description+world; auto asset-hold documented. |
| addClaimEvidence | ✔ | only while open. |
| resolveClaim | ✎ | approve/settle move money → two-step; lifts hold. |
| listHolds | ✔ | the cross-agent gate read. |
| placeHold | ✔ | additive/protective, no confirm (asymmetry justified). |
| releaseHold | ✔ | destructive, two-step, high-risk. |
| listCustomers | ＋ | cust_ id source. |
| getCustomer | ✔ | PII-masked read. |
| createCustomer | ＋ | new-customer origin. |
| lookupPolicy | ✔ | policy/number grounding read; not a router. |

### Inventory & Catalog
| tool | verdict | note |
|---|---|---|
| listAssets | ✔ | catalog + rate honesty read; absorbs searchCatalog. |
| getAsset | ✔ | condition/availability/hold detail. |
| registerAsset | ✔ | mints ast_ id. |
| updateAssetCondition | ✎ | scoped as out-of-band correction vs checkInAsset (overlap resolved). |
| scheduleMaintenance | ✔ | blocks availability window; rejects if `out`. |
| completeMaintenance | ✔ | records resulting condition. |
| getMaintenanceLog | ＋ | maintenance history read. |
| retireAsset | ✔ | destructive; blocked out/reserved/hold. |
| transferAsset | ✔ | destructive; targetWorkspaceId is the only foreign ws_ ref. |

### Workspace Admin
| tool | verdict | note |
|---|---|---|
| getWorkspace | ✔ | tenant identity/plan; tenant-isolation honesty. |
| getPlanUsage | ✔ | quota gate read (atSeatCap/atBookingCap). |
| listMembers | ✔ | mem_ id read. |
| getMember | ✎ | permission-set read for the acting user (privileged-op gate). |
| inviteMember | ✎ | seat-cap gate + canManageMembers precondition stated. |
| updateMemberRole | ✔ | privileged; sole-owner invariant. |
| removeMember | ✔ | destructive; sole-owner invariant. |
| changePlan | ✔ | privileged; downgrade-below-usage rejected; two-step. |
| getAuditLog | ✔ | activity/history honesty read; not a router. |

---

## Dissents & resolutions

- **Judge A dissent — advanceTurn triviality.** "One flip is too thin; async quotes would give richer
  multi-turn evals." **Resolution (Advocate upheld, Judge A conceded):** pricing quotes at creation is
  REQUIRED for numeric-fidelity honesty (the model must echo the exact total same-turn). Making the
  quote async would trade a core honesty rule for turn-count richness. The single flip
  (submitted→under_review) is enough for a between-turn claim-triage eval, and two-step confirms are
  stateless so nothing else needs settling. Kept minimal.

- **Judge B dissent — Claims cluster at 12 is heavy; customers deserve their own agent.** **Resolution
  (Advocate upheld):** the domain sketch fixes 5 clusters; customers are PII/compliance-adjacent and
  their reads gate claims/holds, so they belong with Compliance. 12 ≤ 15 and all claim/hold/customer
  flows stay in one agent. A 6th agent would fragment the freeze-on-claim flow across agents.

- **Judge A dissent — releaseDeposit and closeBooking read across the Rentals/Billing seam.**
  **Resolution (documented, not blocked):** flagged in WORLD-MODEL as an explicit E1 degree of freedom.
  Guards read `projection()` (`depositShortfall`, `bookingHasOpenClaim`) rather than call across
  agents, OR E1 folds the 3 deposit tools into Rentals (→15). Both keep every agent ≤15; no tool must
  move for correctness. The surface is cluster-viable either way.

- **Judge B dissent — getDepositBalance vs getBooking overlap.** **Resolution (refined):**
  getBooking returns one booking's `depositHeld`; getDepositBalance adds the required-vs-held
  **shortfall** and the workspace **float summary** (omit bookingId). Distinct honesty surface (the
  low-deposit-balance rule needs the shortfall number). Kept.

No tool required a 3rd refinement; nothing hit the DROP-after-2 ceiling. Two drops (applyLateFee,
searchCatalog) were redundancy folds, not failures.
