# atlas — stage N (NITPICK) review ledger

5 independent reviewers (N1 magnet, N2 Bucket-A, N3 composition, N4 coverage, N5 lints) + verifier
(Fable, recall-biased). ONE revision round applied; N5 re-run clean after it. The T measured loop is
the backstop for everything below.

## N1 — magnet / S-1 firewall: CLEAN (all 6 files)
Every reply-regex is a CLAIM matcher (agent's own reply vs tool success), never a REQUEST proxy;
checks read only `ctx.args` + `projection()` + the world ledger; theme stateBlock = projection-only;
no intent-scoped tooling. Nothing release-blocking.

## N2 — Bucket-A: 1 CONFIRMED
| finding | verdict | resolution |
|---|---|---|
| at-inventory `requiresBefore(['scheduleMaintenance'])` on completeMaintenance + its standing directive over-apply on SEEDED maintenance windows (default preset seeds ast_gen02 mid-window; the exact trap at-rentals documented and avoided for closeBooking) | **CONFIRMED** (N3-M2 independently found the same) | gate DROPPED; prose reconditioned to the world's real precondition (in-a-maintenance-window, not scheduled-this-conversation); UNCHECKABLE header entry added |

## N3 — composition: 1 CONFIRMED + verified-clean ledger
| finding | verdict | resolution |
|---|---|---|
| M1: at-inventory `assetIdProvenance` custom gate stricter than world+eval (cases 63/68 hand a REAL id in the user turn and require the direct write; world allows it; claims/admin deliberately chose shape-only) | **CONFIRMED** | gate DROPPED (+ dead machinery removed); provenance = conditioned prose + UNCHECKABLE dimension, matching sibling drafters |
| M2: maintenance-order gate on seeded windows | CONFIRMED | merged with N2-1 above |
| Verified CLEAN with world probes: billing maxCalls(1/turn)×confirmFirst×destructiveThrottle probe→confirm across turns; claims releaseHold precondition vs case 45 (openClaimCount=0 on legal-hold-active); rentals reschedule vs case 06 (gate is createBooking-only); admin memberId shape vs listMembers-supplied ids; no askUser terminal traps | — | — |

## N4 — coverage (recall-biased): 3 fixed, 1 tool-gap fixed, 3 refuted, rest logged
| finding | verdict | resolution |
|---|---|---|
| A1 reschedule needs requiresBefore(checkAvailability) | **REFUTED** | would wrongly deny case 06's reschedule turns; the tool self-re-checks and the world enforces DATE_CONFLICT |
| A2 changePlan downgrade-below-usage uncovered anywhere | **CONFIRMED** (as prose) | conditioned behavior line + UNCHECKABLE header on at-admin; gate declined (target-plan caps are world constants, duplicating them in a spec invites drift); eval gap logged in EVALS.md |
| A3 releaseHold requiresBefore(lookupPolicy) | **REFUTED as gate** | case 45 does not require lookupPolicy → sibling denial risk; the rule already lives in behavior prose |
| B1 dispatch-only-active-booking had header but no prose | **CONFIRMED** | conditioned behavior line added to at-rentals |
| B2 scheduleMaintenance-on-OUT-asset uncovered | **CONFIRMED** | conditioned prose + UNCHECKABLE header on at-inventory; eval gap logged |
| B3 releaseDeposit asset-scope-hold half undecidable, undocumented | **CONFIRMED** | UNCHECKABLE header note added to at-billing |
| C1 workspaceFrozen not world-enforced | **REFUTED** | enforced via propagation: workspace-scope holds ⇒ `customerFrozen`/`accountFrozen` (world.ts:157-158, 233) consumed by _createBooking(512)/_checkOutAsset(587)/_issueRefund(889)/_releaseDeposit(842) |
| T1 at-claims cannot verify bk_/ast_ ids (listBrands lesson) | **CONFIRMED** | getBooking + getAsset (shared read-only) added to the at-claims surface (12→14 ≤15) + prose; NO provenance gate (the N3-M1 lesson) |
| T2 billing cannot enumerate bookings | declined | intentional E1 decision 2; billing evals supply ids by construction |
| minors (resolveClaim settlement honesty; per-tool noFabricatedSuccess breadth in rentals; INVALID_ROLE prose) | logged residuals | deliberate/world-enforced; T-loop backstop |

## N5 — mechanical gate
`lint-guards.mjs` ✓ 7 files clean · `lint-spec-quality.mjs` ✓ clean — before AND after the revision
round. `BENCH_EXAMPLE=atlas test:invariants` 202/202 after the round; bundle resolves (at-claims 14
tools; constructor validations pass).
