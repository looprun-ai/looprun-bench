/**
 * Load the exported edition artifacts — the subject (world + tools + cases + judge prompt), the
 * governed spec bundle (SPECS + THEME), and the ungoverned control bundle (AGENTS). Every artifact
 * is pulled in by a RUNTIME-resolved path so the type checker never has to reach into the frozen
 * files (they carry their own build-time type imports); the harness's own source stays public-only.
 *
 * Before any spec bundle is imported, we register a module-resolution hook that maps the editions'
 * embedded runtime specifier onto the public `@looprun-ai/core`, so the frozen artifacts load
 * unchanged.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { editionPath, DEFAULTS } from './config.js';
import type { CaseSpec } from './types.js';

register(new URL('./edition-runtime-alias.mjs', import.meta.url));

/* eslint-disable @typescript-eslint/no-explicit-any */
async function importAbs(absPath: string): Promise<any> {
  return import(pathToFileURL(absPath).href);
}

function pick(mod: Record<string, unknown>, names: string[]): unknown {
  for (const n of names) if (mod[n] != null) return mod[n];
  return undefined;
}

/** The five Atlas agent buckets: which case file feeds them, and the governed spec id + ungoverned
 *  agent id each maps to (the exported bundles key them differently — the inventory bucket is
 *  `at-inventory` governed / `fleet` ungoverned). Case-id ranges match the exported CASE-MAP. */
const BUCKET_DEFS: { file: string; exportName: string; governed: string; vanilla: string }[] = [
  { file: 'cases-at-rentals', exportName: 'ATLAS_CASES_AT_RENTALS', governed: 'at-rentals', vanilla: 'rentals' },
  { file: 'cases-at-billing', exportName: 'ATLAS_CASES_AT_BILLING', governed: 'at-billing', vanilla: 'billing' },
  { file: 'cases-at-claims', exportName: 'ATLAS_CASES_AT_CLAIMS', governed: 'at-claims', vanilla: 'claims' },
  { file: 'cases-at-inventory', exportName: 'ATLAS_CASES_AT_INVENTORY', governed: 'at-inventory', vanilla: 'fleet' },
  { file: 'cases-at-admin', exportName: 'ATLAS_CASES_AT_ADMIN', governed: 'at-admin', vanilla: 'admin' },
];

export interface Bucket {
  governed: string;
  vanilla: string;
  cases: CaseSpec[];
}

export interface Subject {
  makeWorld(preset: string): any;
  toolDefs: any[];
  buckets: Bucket[];
  judgePrompt: string;
}

/** Load the subject: the world factory, the tool surface, the 61 cases (bucketed), and the judge
 *  prompt — all from the exported `subject/` directory. */
export async function loadSubject(): Promise<Subject> {
  const dir = editionPath('SUBJECT_DIR', DEFAULTS.SUBJECT_DIR);

  const worldMod = await importAbs(join(dir, 'world.ts'));
  const WorldCtor = pick(worldMod, [
    (process.env.WORLD_EXPORT ?? '').trim(), 'AtlasWorld', 'World', 'default',
  ].filter(Boolean) as string[]) as (new (preset: string) => any) | undefined;
  if (typeof WorldCtor !== 'function') {
    throw new Error(`subject world.ts must export a world class (looked for AtlasWorld/World/default). Got: ${Object.keys(worldMod).join(', ')}`);
  }

  const toolsMod = await importAbs(join(dir, 'tools.ts'));
  const toolDefs = pick(toolsMod, [
    (process.env.TOOLS_EXPORT ?? '').trim(), 'ATLAS_TOOLS', 'TOOLS', 'default',
  ].filter(Boolean) as string[]) as any[] | undefined;
  if (!Array.isArray(toolDefs)) {
    throw new Error(`subject tools.ts must export a ToolDef[] (looked for ATLAS_TOOLS/TOOLS/default). Got: ${Object.keys(toolsMod).join(', ')}`);
  }

  const buckets: Bucket[] = [];
  for (const def of BUCKET_DEFS) {
    const mod = await importAbs(join(dir, `${def.file}.ts`));
    const cases = pick(mod, [def.exportName, 'default']) as CaseSpec[] | undefined;
    if (!Array.isArray(cases)) {
      throw new Error(`subject ${def.file}.ts must export ${def.exportName}. Got: ${Object.keys(mod).join(', ')}`);
    }
    buckets.push({ governed: def.governed, vanilla: def.vanilla, cases });
  }

  const judgePrompt = await readFile(join(dir, 'judge-prompt.md'), 'utf8');
  return { makeWorld: (preset: string) => new WorldCtor(preset), toolDefs, buckets, judgePrompt };
}

/** Load the governed spec bundle (exports SPECS: Record<id, AgentSpec> + THEME: TrunkTheme). */
export async function loadGovernedBundle(): Promise<{ SPECS: Record<string, any>; THEME: any }> {
  const p = editionPath('SPECS_BUNDLE', DEFAULTS.SPECS_BUNDLE);
  const mod = await importAbs(p);
  if (!mod.SPECS || !mod.THEME) {
    throw new Error(`specs bundle "${p}" must export SPECS and THEME. Got: ${Object.keys(mod).join(', ')}`);
  }
  return { SPECS: mod.SPECS, THEME: mod.THEME };
}

/** Load the ungoverned control bundle (exports AGENTS: Record<id, { id, instructions, tools? }>). */
export async function loadVanillaBundle(): Promise<{ AGENTS: Record<string, { id: string; instructions: string; tools?: string[] }> }> {
  const p = editionPath('VANILLA_BUNDLE', DEFAULTS.VANILLA_BUNDLE);
  const mod = await importAbs(p);
  if (!mod.AGENTS) {
    throw new Error(`vanilla bundle "${p}" must export AGENTS. Got: ${Object.keys(mod).join(', ')}`);
  }
  return { AGENTS: mod.AGENTS };
}
