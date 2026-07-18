/**
 * src/shim/step-handler.ts — the governed step handler: governs ONE proposed assistant turn per
 * tau2 request and returns tool_calls (unexecuted, for tau2 to run) OR governed text. Mirrors
 * @looprun-ai/mastra's run-conversation.ts phase ORDERING (ledger+world build → postTool → compose
 * system prompt → call subject → preTool-gate any proposed tool_calls → finalizeReply for text) but at
 * per-request granularity — this shim never owns the loop and never executes a tool itself (tau2 does).
 */
import {
  beginTurn,
  createLedger,
  enforcePostTool,
  evaluatePreTool,
  finalizeReply,
  redriveMessage,
  renderScopedSpecTrunk,
  resolveGuards,
  type Guard,
  type GuardCtx,
  type ReplyViolation,
} from '@looprun-ai/core';
import { telecomSupportSpec, THEME as TELECOM_THEME } from '@looprun-bench/telecom';
import { logActivity, type ActivityEvent } from './activity-log.js';
import { buildTranscript } from './transcript.js';
import { extractReferenceNow, buildWorldAdapter } from './world-adapter.js';
import { callSubject as defaultSubjectClient, type SubjectClient } from './subject-client.js';
import { nextCompletionId, type ChatCompletionRequest, type ChatCompletionResponse, type OpenAIMessage, type OpenAIToolCall } from './openai-types.js';

const spec = telecomSupportSpec;
const theme = TELECOM_THEME;
const DEFAULT_REDRIVES = 1;
const MAX_REDRIVES = spec.controls.redrives ?? DEFAULT_REDRIVES;

// A non-firing Guard shell — carries only the veto's reason text through redriveMessage's shared
// formatter (mirrors @looprun-ai/core's own CHAIN_RESTATE_GUARD pattern in runtime/turn.ts).
const PRETOOL_VETO_GUARD: Guard = { kind: 'preToolVeto', dim: 'run', check: () => null, prose: () => '' };

type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number };
const ZERO_USAGE: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

/** Accumulates real subject usage across every subjectClient call made while servicing one governed
 *  request (the initial proposal plus any veto/onReply redrives) — so tau2's recorded message.usage
 *  reflects actual subject cost/tokens instead of a hardcoded zero. */
function accumulateUsage(acc: Usage, u: Usage | undefined): void {
  if (!u) return;
  acc.prompt_tokens += u.prompt_tokens ?? 0;
  acc.completion_tokens += u.completion_tokens ?? 0;
  acc.total_tokens += u.total_tokens ?? 0;
}

function textResponse(model: string, text: string, usage: Usage = ZERO_USAGE): ChatCompletionResponse {
  return {
    id: nextCompletionId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: 'assistant', content: text, tool_calls: null }, finish_reason: 'stop' }],
    usage,
  };
}

function toolCallResponse(model: string, toolCalls: OpenAIToolCall[], usage: Usage = ZERO_USAGE): ChatCompletionResponse {
  return {
    id: nextCompletionId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: toolCalls }, finish_reason: 'tool_calls' }],
    usage,
  };
}

function toolCallName(tc: OpenAIToolCall): string {
  return tc.function?.name ?? tc.name ?? '';
}
function toolCallArgs(tc: OpenAIToolCall): Record<string, unknown> {
  const raw = tc.function?.arguments;
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/**
 * Govern one tau2 request. `subjectClient` is injectable — shim-smoke.ts stubs it to force specific
 * proposed tool_calls without depending on a live model (see the task's unit veto test).
 */
export async function handleChatCompletion(
  body: ChatCompletionRequest,
  subjectClient: SubjectClient = defaultSubjectClient,
): Promise<ChatCompletionResponse> {
  const messages = body.messages ?? [];
  const tools = body.tools ?? [];
  const { systemContent, rest, observed, currentTurnIndex, toolRecords, freshToolRecords } = buildTranscript(messages);

  const referenceNow = extractReferenceNow(systemContent);
  const worldFull = buildWorldAdapter(referenceNow, toolRecords);

  const ledger = createLedger();
  ledger.observed = observed;
  beginTurn(ledger, currentTurnIndex);

  // ── postTool hook (zero-cost today: spec.guards.postTool is empty for telecom-support) ──────────
  const postToolCorrections: string[] = [];
  for (const rec of freshToolRecords) {
    const guards = resolveGuards(spec.guards.postTool, rec.name);
    if (!guards.length) continue;
    const ctx: GuardCtx = { args: rec.args, tool: rec.name, world: worldFull, observed: ledger.observed, turnIndex: ledger.turnIndex, result: rec.parsed };
    const { corrections, violations } = await enforcePostTool(guards, ctx);
    if (corrections.length) {
      ledger.turnCorrections.push(...corrections);
      postToolCorrections.push(...corrections);
    }
    if (violations.length) ledger.postToolViolations.push(...(violations as ReplyViolation[]));
  }

  const composedSystem = `${systemContent}\n\n---\n\n${renderScopedSpecTrunk(worldFull, spec, [], theme)}`;
  const subjectMessages: OpenAIMessage[] = [{ role: 'system', content: composedSystem }, ...rest];

  const usageAcc: Usage = { ...ZERO_USAGE };

  const redrive = async (message: string): Promise<string> => {
    const withMsg = [...subjectMessages, { role: 'user' as const, content: message }];
    const r = await subjectClient({ messages: withMsg, tools, toolsEnabled: false });
    accumulateUsage(usageAcc, r.usage);
    return r.content ?? '';
  };

  const activity: ActivityEvent = {
    ts: Date.now(),
    turnIndex: currentTurnIndex,
    path: 'reply',
    proposedTools: [],
    vetoes: [],
    redrives: 0,
    abstained: false,
    postToolCorrections,
  };

  const first = await subjectClient({ messages: subjectMessages, tools, toolsEnabled: true });
  accumulateUsage(usageAcc, first.usage);

  if (first.toolCalls && first.toolCalls.length) {
    activity.proposedTools = first.toolCalls.map(toolCallName);
    let vetoReason: string | null = null;
    for (const tc of first.toolCalls) {
      const name = toolCallName(tc);
      const args = toolCallArgs(tc);
      const verdict = await evaluatePreTool(spec, ledger, worldFull, name, args);
      if (verdict.verdict === 'deny') {
        vetoReason = verdict.reason;
        activity.vetoes.push({ tool: name, reason: verdict.reason });
        break;
      }
    }

    if (!vetoReason) {
      activity.path = 'allow';
      logActivity(activity);
      return toolCallResponse(body.model, first.toolCalls, usageAcc);
    }

    // Vetoed: abandon the tool-call path entirely (never re-offer tools this request — the shim must
    // never execute/relitigate a forbidden call). One NO-TOOLS regenerate seeded with the veto reason,
    // then hand off to finalizeReply for its own checkReply → bounded redrive → honest-abstain closure.
    activity.path = 'veto-redrive';
    const seedMessage = redriveMessage([{ guard: PRETOOL_VETO_GUARD, reason: vetoReason }]);
    const initialText = await redrive(seedMessage);
    const finalized = await finalizeReply(spec, theme, worldFull, ledger, initialText, redrive, MAX_REDRIVES);
    activity.redrives = ledger.turnCorrections.filter((c) => c.startsWith('redrive:')).length;
    activity.abstained = finalized.exhausted;
    logActivity(activity);
    return textResponse(body.model, finalized.text, usageAcc);
  }

  // Plain-text proposal: mutators → onReply checks → bounded no-tools redrive → honest-abstain.
  const initialText = first.content ?? '';
  const finalized = await finalizeReply(spec, theme, worldFull, ledger, initialText, redrive, MAX_REDRIVES);
  activity.path = 'reply';
  activity.redrives = ledger.turnCorrections.filter((c) => c.startsWith('redrive:')).length;
  activity.abstained = finalized.exhausted;
  logActivity(activity);
  return textResponse(body.model, finalized.text, usageAcc);
}
