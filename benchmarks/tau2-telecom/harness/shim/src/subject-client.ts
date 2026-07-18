/**
 * src/shim/subject-client.ts — calls the local llama.cpp subject model (an OpenAI-compatible
 * `/chat/completions` endpoint) with the exact per-task pinning: temperature 0,
 * `chat_template_kwargs:{enable_thinking:false}`, stream:false. Uses Node's built-in `fetch` (Node 22)
 * — no HTTP dependency needed.
 *
 * TODO (roadmap — flash-lite subject): the raw-`fetch` OpenAI-compat path works for local llama, but
 * FAILS for a Gemini-3 subject over multi-turn tool calls (400 INVALID_ARGUMENT: functionCall parts
 * miss `thought_signature`). Rebuild the CLOUD subject path to use looprun's NATIVE gemini integration
 * (`geminiFlashLiteThinkOff()` from `looprun/models`, the AI-SDK google provider, which manages the
 * thought_signature). Local llama stays on this fetch path. See docs/roadmap.md.
 */
import type { OpenAIMessage, OpenAIToolCall, OpenAIToolDef } from './openai-types.js';

const SUBJECT_API_BASE = process.env.LOOPRUN_SUBJECT_API_BASE ?? 'http://127.0.0.1:8081/v1';
const SUBJECT_MODEL = process.env.LOOPRUN_SUBJECT_MODEL ?? './models/Qwen3.5-4B-UD-Q4_K_XL.gguf';
// Optional bearer auth (cloud subjects, e.g. gemini's OpenAI-compat endpoint). Empty = no header (local llama).
const SUBJECT_API_KEY = process.env.LOOPRUN_SUBJECT_API_KEY ?? '';
// The provider-specific thinking-off / pinning body, merged into every request. Default = the llama.cpp
// form; for gemini set LOOPRUN_SUBJECT_EXTRA_BODY='{"reasoning_effort":"none"}'.
const SUBJECT_EXTRA_BODY: Record<string, unknown> = (() => {
  const raw = process.env.LOOPRUN_SUBJECT_EXTRA_BODY;
  if (raw && raw.trim()) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* malformed → fall back to the llama default below */
    }
  }
  return { chat_template_kwargs: { enable_thinking: false } };
})();

export interface SubjectCallArgs {
  messages: OpenAIMessage[];
  /** The tool schemas to offer — omitted/ignored entirely when `toolsEnabled` is false (a NO-TOOLS
   *  redrive/veto-correction call must not let the subject propose another tool call). */
  tools?: OpenAIToolDef[];
  toolsEnabled: boolean;
}

export interface SubjectCallResult {
  content: string | null;
  toolCalls: OpenAIToolCall[] | null;
  /** Real token usage the subject model reported for this call (llama.cpp forwards an
   *  OpenAI-shaped `usage` object) — undefined if the subject didn't report one. Propagated so the
   *  shim's synthetic response can carry the subject's real cost instead of hardcoded zeros. */
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export type SubjectClient = (args: SubjectCallArgs) => Promise<SubjectCallResult>;

/** The real subject client — POSTs to the local llama.cpp server. Injectable (see step-handler.ts /
 *  shim-smoke.ts) so tests can stub the network call without a live model. */
export const callSubject: SubjectClient = async ({ messages, tools, toolsEnabled }) => {
  const body: Record<string, unknown> = {
    model: SUBJECT_MODEL,
    messages,
    temperature: 0,
    ...SUBJECT_EXTRA_BODY,
    stream: false,
  };
  if (toolsEnabled && tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (SUBJECT_API_KEY) headers.authorization = `Bearer ${SUBJECT_API_KEY}`;
  const res = await fetch(`${SUBJECT_API_BASE}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`subject call failed: ${res.status} ${text}`.slice(0, 2000));
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: OpenAIToolCall[] | null } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
  const msg = json.choices?.[0]?.message ?? {};
  return { content: msg.content ?? null, toolCalls: msg.tool_calls ?? null, usage: json.usage };
};
