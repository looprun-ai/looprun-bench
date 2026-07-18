/**
 * `vanilla-mastra` — an UNGOVERNED Mastra baseline arm, subject-generic.
 *
 * The point of this arm: measure "just a decent Mastra agent" against s15 (AgentSpec + deterministic
 * guards) on the SAME subject + ruler, to attribute how much of s15's result is governance vs. a
 * capable frontier LLM in a plain ReAct loop. This adapter is NEUTRAL plumbing only — it holds ZERO
 * business strings and ZERO governance. Every business string (persona/instructions, tool selection)
 * comes from the blind-session bundle (`agents-generated/<example>`); the loop is a plain
 * `agent.generate(messages, { maxSteps, ...modelParams })` with `toolChoice` left at its default
 * ('auto') — none of s15's guard levers (forced rules, required tool-choice, honest-abstain, redrive).
 *
 * Mirrors the s5-mastra adapter (Mastra `Agent`/`createTool`/`generate` + message-history +
 * `mapTotalUsage`) but is subject-generic via the `activeExample()` seam (like s15/index.ts):
 *   - tools come from `activeExample().toolsSnapshot()` (the active subject's surface), each wired to
 *     `ctx.world.exec(name, args)`; optional per-agent filter via `agentDef.tools`,
 *   - the agent DATA (id + instructions + optional tool list) comes from the generated bundle,
 *     resolved by BENCH_EXAMPLE and (for N-agent bundles) selected by NB_AGENT,
 *   - `assembleCaseRun` with `modelSpec: ctx.model` (this is what enables `estCostUsd`).
 *
 * Instructions are STATIC (no per-turn state block) — that is the whole point of the naive baseline.
 * The loop ends via a text reply (no terminal tools) — `assistantFinalText = full.text`.
 */

import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { makeLanguageModel, modelGenerateParams } from '../../bench-core/src/models';
import { assembleCaseRun } from '../../bench-core/src/report/assemble-run';
import { activeExample } from '@config/examples';
import type { AgentAdapter, AdapterContext, CaseSetup, CaseTurn } from '../../bench-core/src/adapter';
import type { CaseRun, TurnRecord, TokenUsage } from '../../bench-core/src/metrics';

// ── Constants ─────────────────────────────────────────────────────────────────
// 16 = parity with the s15 runtime's DEFAULT_MAX_STEPS. Override with NB_VANILLA_MAXSTEPS.
const MAX_STEPS = Number(process.env.NB_VANILLA_MAXSTEPS ?? 16);

// ── Blind-session bundle contract (agent DATA, no plumbing) ─────────────────────
// agents-generated/<example>/index.ts exports:
//   AGENTS: Record<string, { id: string; instructions: string; tools?: string[] }>
// 1 agent → used directly; N agents → NB_AGENT selects (error style mirrors s15/index.ts).
interface VanillaAgentDef {
  id: string;
  instructions: string;
  tools?: string[];
}

async function loadBundle(example: string): Promise<{ AGENTS: Record<string, VanillaAgentDef> }> {
  const override = (process.env.NB_VANILLA_BUNDLE ?? '').trim();
  if (override) {
    const mod = (await import(override)) as { AGENTS?: Record<string, VanillaAgentDef> };
    if (!mod.AGENTS) throw new Error(`NB_VANILLA_BUNDLE "${override}" must export AGENTS.`);
    return { AGENTS: mod.AGENTS };
  }
  const mod = (await import(`./agents-generated/${example}/index`)) as { AGENTS?: Record<string, VanillaAgentDef> };
  if (!mod.AGENTS) throw new Error(`vanilla-mastra bundle "agents-generated/${example}/index" must export AGENTS.`);
  return { AGENTS: mod.AGENTS };
}

function selectAgent(AGENTS: Record<string, VanillaAgentDef>, example: string): VanillaAgentDef {
  const keys = Object.keys(AGENTS);
  if (keys.length === 1) return AGENTS[keys[0]];
  const sel = (process.env.NB_AGENT ?? '').trim();
  const def = AGENTS[sel];
  if (!def) {
    throw new Error(`vanilla-mastra needs NB_AGENT to name a built agent of "${example}". Got "${sel}". Available: ${keys.join(', ')}.`);
  }
  return def;
}

// ── JSON Schema → Zod conversion (shallow, sufficient for Mastra createTool) ─────
// Per-adapter copy of the converter (repo precedent = copy, not shared import); byte-parallel to
// bench/adapters/mastra/index.ts:74-110. Schemas with `pattern` are ignored (shallow) — same as s15.
function jsonTypeToZod(def: Record<string, unknown>): z.ZodTypeAny {
  const type = def.type as string | undefined;
  if (def.enum) {
    const values = def.enum as [string, ...string[]];
    return z.enum(values);
  }
  if (type === 'string') return z.string();
  if (type === 'number' || type === 'integer') return z.number();
  if (type === 'boolean') return z.boolean();
  if (type === 'array') {
    const items = def.items as Record<string, unknown> | undefined;
    const itemSchema = items ? jsonTypeToZod(items) : z.unknown();
    return z.array(itemSchema);
  }
  if (type === 'object') {
    const props = (def.properties ?? {}) as Record<string, Record<string, unknown>>;
    const required = (def.required ?? []) as string[];
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [k, v] of Object.entries(props)) {
      const field = jsonTypeToZod(v);
      shape[k] = required.includes(k) ? field : field.optional();
    }
    return z.object(shape);
  }
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

// ── Build Mastra tools from the active subject's snapshot ────────────────────────
// Tools created once per setup (world reference captured in closure). Each tool's execute calls
// `ctx.world.exec(name, args)` — the world records the call. Optional per-agent filter (agentDef.tools).
function buildTools(
  world: AdapterContext['world'],
  filter?: string[],
): Record<string, ReturnType<typeof createTool>> {
  const snapshot = (activeExample().toolsSnapshot?.() ?? []) as Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
  const allow = filter && filter.length ? new Set(filter) : null;
  const tools: Record<string, ReturnType<typeof createTool>> = {};
  for (const t of snapshot) {
    if (allow && !allow.has(t.name)) continue;
    const zodSchema = jsonSchemaToZodObject((t.inputSchema ?? {}) as Record<string, unknown>);
    tools[t.name] = createTool({
      id: t.name,
      description: t.description,
      inputSchema: zodSchema,
      execute: async (args: Record<string, unknown>) => {
        return world.exec(t.name, args);
      },
    });
  }
  return tools;
}

// ── Token usage mapping (copy of mastra/index.ts) ────────────────────────────────
function mapTotalUsage(u: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined): TokenUsage {
  return {
    input: u?.inputTokens ?? null,
    output: u?.outputTokens ?? null,
    reasoning: null,
    cacheRead: null,
    cacheWrite: null,
    total: u?.totalTokens ?? null,
  };
}

const EMPTY_TOKENS: TokenUsage = { input: null, output: null, reasoning: null, cacheRead: null, cacheWrite: null, total: null };

// ── Main adapter ─────────────────────────────────────────────────────────────────

export function vanillaAdapter(): AgentAdapter {
  let ctx: AdapterContext;

  return {
    id: 'vanilla-mastra',

    async setup(c: AdapterContext) {
      ctx = c;
    },

    async runConversation(_setup: CaseSetup, turns: CaseTurn[]): Promise<CaseRun> {
      const spec = ctx.model;
      const example = activeExample().name;
      const { AGENTS } = await loadBundle(example);
      const agentDef = selectAgent(AGENTS, example);

      // Per-model generation params (thinking/reasoning + sampling), IDENTICAL to the s15/s5 arms so
      // both arms drive each model with the SAME knobs (fair comparison). toolChoice is NOT set here:
      // it defaults to 'auto' — the 'required' choice is part of s15's governance, not this baseline.
      const genParams = modelGenerateParams(spec);

      const tools = buildTools(ctx.world, agentDef.tools);

      // Instructions are STATIC (the naive baseline has no per-turn state block).
      const agent = new Agent({
        name: 'vanilla-mastra',
        instructions: agentDef.instructions,
        model: makeLanguageModel(spec) as any,
        tools,
      } as any);

      const turnRecords: TurnRecord[] = [];
      // Stateless generate() → accumulate prior messages manually (same strategy as s5-mastra).
      const messages: any[] = [];
      let errorMsg: string | undefined;

      for (let i = 0; i < turns.length; i++) {
        if (i > 0) ctx.world.advanceTurn();

        // Ingest current-turn attachments → labels; surface them in the user message (instructions
        // are static, so the naive equivalent of s5's prompt injection is appending to the turn text).
        const attLabels = (((turns[i] as any).attachments ?? []) as string[])
          .map((u: string) => ctx.world.ingestAttachment(u));

        let userText = (turns[i] as any).userText as string;
        if (attLabels.length) userText = `${userText}\n\n[Attachments: ${attLabels.join(', ')}]`;

        const before = ctx.world.toolCalls.length;
        const sseBefore = ctx.world.sseActions.length;

        messages.push({ role: 'user', content: userText });

        const t0 = Date.now();

        try {
          const full = await (agent.generate as any)(messages, {
            maxSteps: MAX_STEPS,
            ...genParams,
          });
          const durationMs = Date.now() - t0;

          if (full.text) {
            messages.push({ role: 'assistant', content: full.text });
          }

          const newCalls = ctx.world.toolCalls.slice(before).map((tc: any) => ({
            name: tc.name,
            args: tc.args,
            resultSummary: JSON.stringify(tc.result ?? null).slice(0, 800),
            tookEffect: tc.tookEffect,
            latencyMs: 0,
          }));

          const stepCount = (full.steps?.length ?? 0) || 1;

          turnRecords.push({
            userText,
            assistantFinalText: full.text ?? '',
            finalMode: 'ALL',
            assistantMsgCount: 1,
            iters: stepCount,
            llmCalls: stepCount,
            toolCalls: newCalls,
            thoughts: null,
            tokens: mapTotalUsage(full.totalUsage as any),
            llmCallLatenciesMs: [durationMs],
            durationMs,
            maxIterHit: stepCount >= MAX_STEPS,
            recoveryEvents: [],
            sseActions: ctx.world.sseActions.slice(sseBefore),
            attachments: attLabels,
          });
        } catch (e) {
          const durationMs = Date.now() - t0;
          errorMsg = String(e);
          turnRecords.push({
            userText,
            assistantFinalText: '',
            finalMode: 'ALL',
            assistantMsgCount: 0,
            iters: 0,
            llmCalls: 1,
            toolCalls: [],
            thoughts: null,
            tokens: { ...EMPTY_TOKENS },
            llmCallLatenciesMs: [durationMs],
            durationMs,
            maxIterHit: false,
            recoveryEvents: ['error'],
          });
          break;
        }
      }

      return assembleCaseRun(
        {
          system: 'vanilla-mastra',
          model: ctx.model.id,
          caseId: '',
          mode: '',
          runIndex: ctx.seed,
          seed: ctx.seed,
          startedAt: new Date().toISOString(),
          benchSha: '',
          toolLayer: 'fake',
          modelSpec: ctx.model,
          provenance: { framework: 'mastra', arm: 'vanilla', agent: agentDef.id, example },
        },
        turnRecords,
        messages,
        errorMsg,
      );
    },

    async teardown() {},
  };
}
