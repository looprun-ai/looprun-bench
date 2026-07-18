/**
 * Ungoverned (control) arm — the same subject + model + cases, driven by a PLAIN Mastra agent with
 * NO governance: the bundle's static instructions, the subject's tools wired straight to the world,
 * and a bare `agent.generate(messages, { maxSteps, ...params })` loop with `toolChoice` left at its
 * default. No guards, no forced tool-choice, no honest-abstain, no redrive. The loop ends on a text
 * reply. This is the "just a decent agent" baseline the governed arm is measured against.
 *
 *   pnpm run:ungoverned [-- --cases 01,07,62 --agent billing --reps 3 --out runs/van]
 */
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { runArm } from './run-common.js';
import type { ArmSpec, Driver } from './run-common.js';
import type { Bucket, Subject } from './load.js';
import { loadVanillaBundle } from './load.js';
import { modelConfigFromEnv } from './config.js';
import { makeLanguageModel, modelGenerateParams } from './model.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_STEPS = Number(process.env.VANILLA_MAX_STEPS ?? 16);

// ── shallow JSON-Schema → Zod (sufficient for Mastra createTool; mirrors the exported control arm) ──
function jsonTypeToZod(def: Record<string, unknown>): z.ZodTypeAny {
  const type = def.type as string | undefined;
  if (def.enum) return z.enum(def.enum as [string, ...string[]]);
  if (type === 'string') return z.string();
  if (type === 'number' || type === 'integer') return z.number();
  if (type === 'boolean') return z.boolean();
  if (type === 'array') {
    const items = def.items as Record<string, unknown> | undefined;
    return z.array(items ? jsonTypeToZod(items) : z.unknown());
  }
  if (type === 'object') return jsonSchemaToZodObject(def);
  return z.unknown();
}

function jsonSchemaToZodObject(schema: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required ?? []) as string[];
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [k, v] of Object.entries(props)) {
    const field = jsonTypeToZod(v);
    shape[k] = required.includes(k) ? field : field.optional();
  }
  return z.object(shape);
}

function buildTools(world: any, toolDefs: any[], filter?: string[]): Record<string, any> {
  const allow = filter && filter.length ? new Set(filter) : null;
  const tools: Record<string, any> = {};
  for (const t of toolDefs) {
    if (allow && !allow.has(t.name)) continue;
    tools[t.name] = createTool({
      id: t.name,
      description: t.description,
      inputSchema: jsonSchemaToZodObject((t.inputSchema ?? {}) as Record<string, unknown>) as any,
      execute: async (input: unknown) => world.exec(t.name, (input ?? {}) as Record<string, unknown>),
    });
  }
  return tools;
}

const arm: ArmSpec = {
  armName: 'ungoverned',
  bucketAgentId: (b: Bucket) => b.vanilla,
  async prepare(subject: Subject): Promise<Driver> {
    const model = modelConfigFromEnv();
    const { AGENTS } = await loadVanillaBundle();
    const langModel = makeLanguageModel(model);
    const params = modelGenerateParams(model);
    console.log(`[ungoverned] model=${model.id} provider=${model.provider} thinking=${model.thinking} maxSteps=${MAX_STEPS} agents=${Object.keys(AGENTS).join(', ')}`);

    return async (agentId, caseSpec, world) => {
      const agentDef = AGENTS[agentId];
      if (!agentDef) throw new Error(`no ungoverned agent "${agentId}" in bundle (have: ${Object.keys(AGENTS).join(', ')})`);
      const tools = buildTools(world, subject.toolDefs, agentDef.tools);
      const agent = new Agent({ name: 'ungoverned', instructions: agentDef.instructions, model: langModel as any, tools } as any);

      const messages: any[] = [];
      const turnRecords: { assistantFinalText: string; toolCalls: any[] }[] = [];
      let errorMsg: string | undefined;

      for (let i = 0; i < caseSpec.turns.length; i++) {
        if (i > 0) world.advanceTurn();
        const attLabels = ((caseSpec.turns[i].attachments ?? []) as string[]).map((u) => world.ingestAttachment(u));
        let userText = caseSpec.turns[i].userText;
        if (attLabels.length) userText = `${userText}\n\n[Attachments: ${attLabels.join(', ')}]`;
        const before = world.toolCalls.length;
        messages.push({ role: 'user', content: userText });
        try {
          const full: any = await (agent.generate as any)(messages, { maxSteps: MAX_STEPS, ...params });
          if (full.text) messages.push({ role: 'assistant', content: full.text });
          const newCalls = world.toolCalls.slice(before).map((tc: any) => ({ name: tc.name, args: tc.args, tookEffect: tc.tookEffect }));
          turnRecords.push({ assistantFinalText: full.text ?? '', toolCalls: newCalls });
        } catch (e) {
          errorMsg = String((e as any)?.message ?? e);
          turnRecords.push({ assistantFinalText: '', toolCalls: [] });
          break;
        }
      }
      return { turnRecords, errorMsg };
    };
  },
};

runArm(arm, process.argv.slice(2)).catch((e) => {
  console.error(e);
  process.exit(1);
});
