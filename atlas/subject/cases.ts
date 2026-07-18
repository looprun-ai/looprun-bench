// atlas eval set — G3-generated (agentspec-generator), one bucket file per agent, merged here.
// Provenance + debate verdicts: EVALS-at-*.md (per bucket) and EVALS.md (the merged sweep).
// Bucket id ranges: at-rentals 01–12 · at-billing 21–32 · at-claims 41–52 · at-inventory 61–72 ·
// at-admin 81–93 (93 = the post-E2 UNCHECKABLE sweep addition, sole-owner protection).
import { ATLAS_CASES_AT_RENTALS } from './cases-at-rentals';
import { ATLAS_CASES_AT_BILLING } from './cases-at-billing';
import { ATLAS_CASES_AT_CLAIMS } from './cases-at-claims';
import { ATLAS_CASES_AT_INVENTORY } from './cases-at-inventory';
import { ATLAS_CASES_AT_ADMIN } from './cases-at-admin';

export const ATLAS_CASES: unknown[] = [
  ...ATLAS_CASES_AT_RENTALS,
  ...ATLAS_CASES_AT_BILLING,
  ...ATLAS_CASES_AT_CLAIMS,
  ...ATLAS_CASES_AT_INVENTORY,
  ...ATLAS_CASES_AT_ADMIN,
];
