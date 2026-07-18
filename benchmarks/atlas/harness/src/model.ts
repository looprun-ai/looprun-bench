/**
 * Subject-model construction — an AI-SDK LanguageModel + the per-call generation params, driven by
 * env (config.ts). Two provider paths:
 *   - `google`            → Gemini via @ai-sdk/google. Thinking-off = a NUMERIC thinkingBudget 0
 *                           (thinkingLevel alone does NOT turn thinking off); temperature omitted so
 *                           the provider default is used, matching the published subject.
 *   - `openai-compatible` → any OpenAI /v1 endpoint via @ai-sdk/openai (a local llama.cpp / vLLM /
 *                           ollama server, or a hosted OpenAI-style API). Thinking-off maps to
 *                           reasoningEffort:'none' and a body-shaping fetch that also injects
 *                           `chat_template_kwargs.enable_thinking=false` (the portable local-recipe
 *                           form; hosted APIs ignore the extra field).
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ModelConfig } from './config.js';

/** Inject the thinking-off template flag into OpenAI-compatible request bodies (llama.cpp/vLLM honor
 *  it; ollama ignores it and hosted APIs ignore an unknown field). Everything else passes through. */
function bodyShapingFetch(rawFetch: typeof fetch): typeof fetch {
  return async (url, init) => {
    if (init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        if (body.reasoning_effort === 'none') {
          body.chat_template_kwargs = {
            ...(body.chat_template_kwargs as Record<string, unknown> | undefined),
            enable_thinking: false,
          };
          return rawFetch(url, { ...init, body: JSON.stringify(body) });
        }
      } catch {
        /* non-JSON body — pass through untouched */
      }
    }
    return rawFetch(url, init);
  };
}

/** Build the AI-SDK LanguageModel for the configured subject model. */
export function makeLanguageModel(m: ModelConfig): LanguageModel {
  if (m.provider === 'google') {
    return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(m.id);
  }
  return createOpenAI({
    baseURL: m.baseURL,
    apiKey: process.env.OPENAI_API_KEY ?? 'not-needed',
    fetch: bodyShapingFetch(fetch),
  }).chat(m.id);
}

/** Per-call generation params (spread into every generate()): thinking config + sampling. Mirrors the
 *  published measurement's provider rules so both arms drive a model with identical knobs. */
export function modelGenerateParams(m: ModelConfig): Record<string, unknown> {
  const p: Record<string, unknown> = { maxOutputTokens: m.maxOutput };
  if (m.temperature != null) p.temperature = m.temperature;
  if (m.provider === 'google') {
    p.providerOptions = {
      google: {
        thinkingConfig: m.thinking === 'off'
          ? { thinkingBudget: 0, includeThoughts: false }
          : { thinkingLevel: m.thinking, includeThoughts: false },
      },
    };
  } else {
    p.providerOptions = { openai: { reasoningEffort: m.thinking === 'off' ? 'none' : m.thinking } };
  }
  return p;
}
