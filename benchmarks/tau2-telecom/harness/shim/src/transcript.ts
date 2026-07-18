/**
 * src/shim/transcript.ts — reconstructs the per-conversation TurnLedger observation set (and the raw
 * tool-result records the world adapter needs) from tau2's OpenAI-shaped `messages` array.
 *
 * turnIndex mapping: turnIndex counts USER turns, 0-based. It starts at 0 (covers any pre-user-message
 * assistant activity, e.g. an agent-first opening greeting) and increments by one on every `user`
 * message encountered — mirroring @looprun-ai/mastra's run-conversation.ts `beginTurn(ledger, i)` for
 * the i-th user turn. A "turn" spans a user message through the assistant's tool calls/reply up to
 * (not including) the next user message.
 *
 * ok/fail detection: the wire-level `tool` message tau2 sends us carries only `{content,
 * tool_call_id}` — NOT the separate `error: bool` field tau2 tracks internally (see
 * tau2.utils.llm_utils.to_litellm_messages, which drops it). Tau2's own error path
 * (tau2.environment.environment.Environment.get_response) sets `content = f"Error: {e}"` on a raised
 * exception and otherwise JSON-encodes the tool's return value (or passes a plain success string
 * through unmodified — several telecom tools return bare strings on success, e.g. send_payment_request,
 * enable_roaming/disable_roaming, transfer_to_human_agents). So: valid JSON parse ⇒ ok; a bare string
 * ⇒ ok UNLESS it starts with the literal "Error: " prefix tau2 always uses for a caught exception.
 *
 * Synthetic `replyToUser` observed entries: @looprun-ai/core's `confirmFirst({mechanism:'prior-ask'})`
 * (auto-installed on refuel_data by the spec's `destructiveTools`/`confirmMechanism` config) looks for
 * an earlier-turn `obs.name === 'replyToUser' && askRe.test(text)` to prove the model already asked the
 * user to confirm (that's the Mastra backend's terminal-tool convention — every assistant reply is
 * literally a call to a `replyToUser` tool there). tau2 has no such tool: an assistant "reply" is just
 * plain `content` text. To keep confirmFirst's prior-ask mechanism meaningful under tau2 (else it can
 * never unlock — see the design-decisions note in the handback report), every PLAIN-TEXT assistant
 * turn (no tool_calls) is recorded here as a synthetic `{name:'replyToUser', args:{text}, ok:true,
 * turnIndex}` observed entry — the faithful analogue of what the Mastra backend would have recorded for
 * the same reply.
 */
import type { ObservedCall } from '@looprun-ai/core';
import type { OpenAIMessage } from './openai-types.js';

export interface ToolRecord {
  name: string;
  args: Record<string, unknown>;
  parsed: unknown;
  ok: boolean;
  turnIndex: number;
  toolCallId: string;
}

export interface TranscriptInfo {
  /** tau2's own domain-policy system message content (the FIRST system message in the array). */
  systemContent: string;
  /** Every message after the system message, unchanged — forwarded to the subject verbatim (plus our
   *  own composed system message prepended by the caller). */
  rest: OpenAIMessage[];
  /** The reconstructed conversation-scoped observed-call ledger (real + synthetic replyToUser). */
  observed: ObservedCall[];
  /** The turn this request is asking us to continue. */
  currentTurnIndex: number;
  /** Every REAL (non-synthetic) tool call+result this conversation, in order — the raw material the
   *  world stateView adapter replays. */
  toolRecords: ToolRecord[];
  /** The trailing run of `tool` messages immediately following the assistant's last tool-calling turn
   *  — i.e. tool results tau2 executed and fed back since our last invocation. Empty when this request
   *  starts a fresh user turn (no pending tool results to postTool-check). */
  freshToolRecords: ToolRecord[];
}

/** Parse a tool call's `arguments` JSON string defensively — malformed JSON never throws, it just
 *  yields `{}` (a guard reading a missing arg denies exactly as if the model had omitted it). */
function parseArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** ok/fail + parsed-body detection for one tool result's `content` string — see the file header. */
export function parseToolContent(content: string | null | undefined): { parsed: unknown; ok: boolean } {
  const text = content ?? '';
  try {
    return { parsed: JSON.parse(text), ok: true };
  } catch {
    return { parsed: text, ok: !text.startsWith('Error: ') && !text.startsWith('Error:') };
  }
}

export function buildTranscript(messages: OpenAIMessage[]): TranscriptInfo {
  let systemContent = '';
  let sawSystem = false;
  const rest: OpenAIMessage[] = [];
  for (const m of messages) {
    if (!sawSystem && m.role === 'system') {
      systemContent = m.content ?? '';
      sawSystem = true;
      continue;
    }
    rest.push(m);
  }

  const observed: ObservedCall[] = [];
  const toolRecords: ToolRecord[] = [];
  // toolCallId -> {name, args, turnIndex} for the assistant tool_calls awaiting their `tool` result.
  const pending = new Map<string, { name: string; args: Record<string, unknown>; turnIndex: number }>();

  let userCount = 0;
  let turnIndex = 0;

  for (const m of rest) {
    if (m.role === 'user') {
      userCount += 1;
      turnIndex = userCount - 1;
      continue;
    }
    if (m.role === 'assistant') {
      if (m.tool_calls && m.tool_calls.length) {
        for (const tc of m.tool_calls) {
          const name = tc.function?.name ?? tc.name ?? '';
          if (!name) continue;
          const args = parseArgs(tc.function?.arguments ?? (typeof (tc as { arguments?: unknown }).arguments === 'string' ? (tc as { arguments?: string }).arguments : undefined));
          pending.set(tc.id, { name, args, turnIndex });
        }
      } else if (m.content && m.content.trim()) {
        // Synthetic replyToUser — see file header.
        observed.push({ name: 'replyToUser', args: { text: m.content }, ok: true, turnIndex });
      }
      continue;
    }
    if (m.role === 'tool') {
      const callId = m.tool_call_id ?? '';
      const call = callId ? pending.get(callId) : undefined;
      if (!call) continue; // no matching assistant tool_call this shim ever proposed — ignore defensively
      const { parsed, ok } = parseToolContent(m.content);
      observed.push({ name: call.name, args: call.args, ok, turnIndex: call.turnIndex });
      toolRecords.push({ name: call.name, args: call.args, parsed, ok, turnIndex: call.turnIndex, toolCallId: callId });
    }
  }

  // freshToolRecords: the trailing contiguous run of `tool` messages in `rest` — the batch tau2 just
  // executed and fed back since our last invocation (empty when this request opens a fresh user turn).
  const freshToolRecords: ToolRecord[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const m = rest[i];
    if (m.role !== 'tool') break;
    const callId = m.tool_call_id ?? '';
    const rec = toolRecords.find((r) => r.toolCallId === callId);
    if (rec) freshToolRecords.unshift(rec);
  }

  return { systemContent, rest, observed, currentTurnIndex: turnIndex, toolRecords, freshToolRecords };
}
