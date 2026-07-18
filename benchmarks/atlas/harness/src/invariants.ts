/**
 * Deterministic tool-call invariants — the store-agnostic gate evaluated against the OBSERVED
 * (executed) calls, so a run that "passed by reply" while skipping a required tool (or using a
 * forbidden one that took effect) auto-fails before the LLM judge ever sees it.
 *
 * `requiredToolCalls`: every asserted (name + anyArgs subset) must appear among the observed calls.
 * `forbiddenToolCalls`: an asserted call that actually TOOK EFFECT is a failure (a blocked/probe
 * call that never mutated state does not count).
 */
import type { CaseSpec, ObservedCall, ToolCallAssertion } from './types.js';

/** name matches AND every key/value in `anyArgs` is present in the observed args (subset match). */
function toolCallMatches(obs: ObservedCall, req: ToolCallAssertion): boolean {
  if (obs.name !== req.name) return false;
  if (!req.anyArgs) return true;
  for (const [k, expected] of Object.entries(req.anyArgs)) {
    if (obs.args[k] !== expected) return false;
  }
  return true;
}

/** Human-readable invariant failure strings for one case (empty when the case passes the gate). */
export function toolCallFailures(caseSpec: CaseSpec, observed: ObservedCall[]): string[] {
  const inv = caseSpec.expectations?.invariants ?? {};
  const out: string[] = [];
  for (const req of inv.requiredToolCalls ?? []) {
    if (!observed.some((o) => toolCallMatches(o, req))) {
      out.push(
        `requiredToolCall ${req.name}(${JSON.stringify(req.anyArgs ?? {})}) missing — ` +
          `observed [${observed.map((o) => o.name).join(', ') || '(none)'}]`,
      );
    }
  }
  for (const forb of inv.forbiddenToolCalls ?? []) {
    if (observed.some((o) => toolCallMatches(o, forb) && o.tookEffect)) {
      out.push(`forbiddenToolCall ${forb.name}(${JSON.stringify(forb.anyArgs ?? {})}) took effect`);
    }
  }
  return out;
}
