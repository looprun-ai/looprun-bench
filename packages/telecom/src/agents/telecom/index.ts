/**
 * The telecom domain bundle: the `SPECS` map (agent-id → AgentSpec) + the shared `THEME`, the two
 * artifacts the project's `looprun.eval.config.ts` imports. One agent in this domain
 * (`telecom-support`) — τ²-bench telecom is a single-agent surface (the user-simulator talks to one
 * agent), so the map has a single entry, but the shape stays the generic SPECS map the eval config
 * expects.
 */
import type { AgentSpec } from 'looprun';
import { telecomSupportSpec } from './telecom-support-spec.js';
import { TELECOM_THEME } from './theme.js';

/** agent-id → AgentSpec (the `EvalConfig.specs` map; `caseMap` keys must match these ids). */
export const SPECS: Record<string, AgentSpec> = {
  'telecom-support': telecomSupportSpec,
};

/** The shared domain theme (one theme : N agents). */
export const THEME = TELECOM_THEME;

export { telecomSupportSpec, TELECOM_THEME };
