/**
 * Governed arm — plays each case through the looprun runtime: the bucket's AgentSpec + deterministic
 * guards + the domain theme are active, and `runSpecConversation` drives the model against a fresh
 * per-case world (guard hooks veto disallowed calls, the terminal protocol closes each turn, the
 * honest-abstain exhaustion reply covers a stalled turn).
 *
 *   pnpm run:governed [-- --cases 01,07,62 --agent at-billing --reps 3 --out runs/gov]
 */
import { runSpecConversation } from '@looprun-ai/mastra';
import { runArm } from './run-common.js';
import type { ArmSpec, Driver } from './run-common.js';
import type { Bucket, Subject } from './load.js';
import { loadGovernedBundle } from './load.js';
import { modelConfigFromEnv } from './config.js';
import { makeLanguageModel, modelGenerateParams } from './model.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const arm: ArmSpec = {
  armName: 'governed',
  bucketAgentId: (b: Bucket) => b.governed,
  async prepare(subject: Subject): Promise<Driver> {
    const model = modelConfigFromEnv();
    const { SPECS, THEME } = await loadGovernedBundle();
    const langModel = makeLanguageModel(model);
    const params = modelGenerateParams(model);
    // Mirror the certified lineage: gate the repeated-tool-call stop for local (OpenAI-compatible)
    // models, where a degenerate loop is the common failure; leave it off for the cloud subject.
    const stopOnRepeatedToolCall = model.provider === 'openai-compatible';
    console.log(`[governed] model=${model.id} provider=${model.provider} thinking=${model.thinking} agents=${Object.keys(SPECS).join(', ')}`);

    return async (agentId, caseSpec, world) => {
      const spec = SPECS[agentId];
      if (!spec) throw new Error(`no governed spec "${agentId}" in bundle (have: ${Object.keys(SPECS).join(', ')})`);
      const turns = caseSpec.turns.map((t) => ({ userText: t.userText, attachments: t.attachments }));
      const res: any = await runSpecConversation(spec, turns, {
        model: langModel,
        modelParams: params,
        world,
        toolDefs: subject.toolDefs,
        theme: THEME,
        stopOnRepeatedToolCall,
      });
      return {
        turnRecords: (res.turnRecords ?? []).map((t: any) => ({
          assistantFinalText: t.assistantFinalText ?? '',
          toolCalls: (t.toolCalls ?? []).map((c: any) => ({ name: c.name, args: c.args, tookEffect: c.tookEffect })),
        })),
        errorMsg: res.errorMsg,
      };
    };
  },
};

runArm(arm, process.argv.slice(2)).catch((e) => {
  console.error(e);
  process.exit(1);
});
