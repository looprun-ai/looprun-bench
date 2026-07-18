/**
 * GENERATED domain bundle — atlas: the at-* AgentSpecs (each with its OWN persona — 283b4ed)
 * + the generated ATLAS_THEME (business-common skin — NO persona).
 */
import type { AgentSpec, TrunkTheme } from '@looprun-ai/core';
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
