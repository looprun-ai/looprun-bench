// PROFILE render for xiaomi/mimo-v2.5-pro (T-loop i1, 2026-07-17) — FORM-only over atlas-r2; anti-loop + follow-through renders
/**
 * GENERATED domain bundle — atlas-r1: the Etapa-1.4 FROM-SCRATCH regeneration (2026-07-16/17).
 * Drafted by 5 blind E2 drafters from the CORRECTED skill references (post flip-root-cause:
 * iron-rules-without-verbosity, lifecycle laws, state-wins, name→id, falseFailureClaimRe template,
 * prompt budget by dedup, NO telegraphic restyle) — no prior atlas spec was read.
 * FROZEN inputs (banana-to-banana law): theme.ts (byte-identical to certified v1), tools.json,
 * WORLD-MODEL.md, the 61 v1-generated evals, judge prompt, CASE-MAP.
 * Measured under the per-target protocol: docs/analysis/flip-root-cause-2026-07-16.md Parts 3–4.
 */
import type { AgentSpec, TrunkTheme } from '@neurono-bench/agentspec-runtime';
import atRentals from './at-rentals-spec';
import atBilling from './at-billing-spec';
import atClaims from './at-claims-spec';
import atInventory from './at-inventory-spec';
import atAdmin from './at-admin-spec';
import { ATLAS_THEME } from './theme';

export const SPECS: Record<string, AgentSpec> = {
  'at-rentals': atRentals,
  'at-billing': atBilling,
  'at-claims': atClaims,
  'at-inventory': atInventory,
  'at-admin': atAdmin,
};

export const THEME: TrunkTheme = ATLAS_THEME;
