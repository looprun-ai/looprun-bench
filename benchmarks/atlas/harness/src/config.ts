/** Environment + CLI configuration for the Atlas harness. */
import { fileURLToPath } from 'node:url';
import { isAbsolute, resolve as resolvePath } from 'node:path';

export type Provider = 'google' | 'openai-compatible';

/** The subject-under-test model config, assembled from env. */
export interface ModelConfig {
  id: string;
  provider: Provider;
  thinking: 'off' | 'low' | 'medium' | 'high';
  temperature?: number;
  maxOutput: number;
  baseURL?: string;
}

/** Resolve an artifact path: an env override (absolute, or relative to CWD) wins; else a default
 *  path relative to this module (so the harness finds the sibling edition dirs out of the box). */
export function editionPath(envVar: string, defaultRelToHere: string): string {
  const override = (process.env[envVar] ?? '').trim();
  if (override) return isAbsolute(override) ? override : resolvePath(process.cwd(), override);
  return fileURLToPath(new URL(defaultRelToHere, import.meta.url));
}

/** Default edition artifact locations (relative to `src/`). All overridable by env. */
export const DEFAULTS = {
  // Governed spec bundle (exports SPECS + THEME). Defaults to the v0.6.1 governed anchor bundle.
  SPECS_BUNDLE: '../../v0.6.1/specs/atlas-r2/index.ts',
  // The subject (world + tools + presets + cases + judge prompt).
  SUBJECT_DIR: '../../v0.6.0/subject',
  // The ungoverned control-arm bundle (exports AGENTS).
  VANILLA_BUNDLE: '../../v0.6.0/vanilla/agents-generated/atlas/index.ts',
} as const;

/** Pick the provider: explicit `PROVIDER` wins; else infer from which key/base URL is present. */
function resolveProvider(modelId: string): Provider {
  const explicit = (process.env.PROVIDER ?? '').trim().toLowerCase();
  if (explicit === 'google' || explicit === 'openai-compatible') return explicit;
  if ((process.env.OPENAI_BASE_URL ?? '').trim()) return 'openai-compatible';
  if ((process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '').trim() || /^gemini/i.test(modelId)) return 'google';
  return 'openai-compatible';
}

/** Assemble the subject model config from env. */
export function modelConfigFromEnv(): ModelConfig {
  const id = (process.env.MODEL_ID ?? 'gemini-3.1-flash-lite').trim();
  const provider = resolveProvider(id);
  const thinking = ((process.env.THINKING ?? 'off').trim() as ModelConfig['thinking']);
  const maxOutput = Number(process.env.MAX_OUTPUT ?? 2048);
  // Temperature: an explicit env wins; else provider default — omitted for google (its API default),
  // greedy 0 for an OpenAI-compatible endpoint (the local-recipe convention).
  const tempEnv = (process.env.TEMPERATURE ?? '').trim();
  const temperature = tempEnv !== '' ? Number(tempEnv) : provider === 'openai-compatible' ? 0 : undefined;
  const baseURL = provider === 'openai-compatible'
    ? (process.env.OPENAI_BASE_URL ?? 'http://localhost:8080/v1').trim()
    : undefined;
  return { id, provider, thinking, temperature, maxOutput, baseURL };
}

/** Parsed common CLI flags. */
export interface CliOptions {
  cases?: Set<string>;
  agents?: Set<string>;
  reps: number;
  out?: string;
  rest: Record<string, string>;
}

/** Minimal flag parser: `--cases 01,07`, `--agent at-billing` (repeatable/comma), `--reps N`,
 *  `--out DIR`, plus passthrough `--key value` / `--key=value`. */
export function parseCli(argv: string[]): CliOptions {
  const rest: Record<string, string> = {};
  let cases: Set<string> | undefined;
  let agents: Set<string> | undefined;
  let reps = 1;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    let key = a.slice(2);
    let val: string;
    const eq = key.indexOf('=');
    if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
    else { val = argv[i + 1] ?? ''; i++; }
    switch (key) {
      case 'cases':
        cases = new Set((cases ? [...cases] : []).concat(val.split(',').map((s) => s.trim()).filter(Boolean)));
        break;
      case 'agent':
      case 'agents':
        agents = new Set((agents ? [...agents] : []).concat(val.split(',').map((s) => s.trim()).filter(Boolean)));
        break;
      case 'reps': reps = Math.max(1, Number(val) || 1); break;
      case 'out': out = val; break;
      default: rest[key] = val;
    }
  }
  return { cases, agents, reps, out, rest };
}
