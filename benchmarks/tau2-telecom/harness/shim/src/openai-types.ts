/**
 * src/shim/openai-types.ts — the minimal OpenAI-compatible `/chat/completions` wire types the tau2
 * shim needs. tau2 talks to us through litellm's generic "openai-compatible api_base" transport
 * (see tau2.utils.llm_utils.to_litellm_messages) — that transport sends/expects plain OpenAI
 * chat-completion JSON, non-streaming only (tau2 never sets stream:true for the agent LLM).
 *
 * Only AssistantMessage / UserMessage(non-tool-call) / ToolMessage(requestor="assistant") ever reach
 * the agent's message history (see tau2.agent.base_agent.is_valid_agent_history_message) — so the
 * `messages` array this shim receives NEVER contains the user-simulator's own device-tool calls/
 * results (those are requestor="user" and filtered out before the agent ever sees them).
 */

/** A proposed/observed tool call in OpenAI wire shape. Some litellm-internal paths (see
 *  tau2.utils.llm_utils.to_litellm_messages) also stamp a redundant top-level `name` — accepted
 *  defensively alongside the standard `function.name`. */
export interface OpenAIToolCall {
  id: string;
  type?: string;
  function?: { name: string; arguments: string };
  name?: string;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[] | null;
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIToolDef {
  type?: string;
  function?: { name: string; description?: string; parameters?: unknown };
  // Some callers (tau2's own Tool.openai_schema) may already flatten to {name,description,parameters}.
  name?: string;
  description?: string;
  parameters?: unknown;
}

export interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAIToolDef[];
  tool_choice?: unknown;
  temperature?: number;
  stream?: boolean;
  [k: string]: unknown;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] | null };
    finish_reason: 'stop' | 'tool_calls';
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

let seq = 0;
/** A stable-enough unique id for a synthetic chat-completion response (no external dep). */
export function nextCompletionId(): string {
  seq += 1;
  return `chatcmpl-looprun-${Date.now().toString(36)}-${seq}`;
}
