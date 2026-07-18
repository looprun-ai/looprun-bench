#!/usr/bin/env node
/**
 * no-private-refs — the one-way-street guard.
 *
 * This repo is public and standalone. It must never reintroduce a reference to the private
 * research lineage it was exported from. This test walks every tracked file and fails on any of
 * the forbidden tokens below, so the drift can never re-enter the tree unnoticed.
 *
 * Forbidden (case-sensitive, word-bounded where noted):
 *   - `neurono` / `@neurono-bench`  — the private lab + its build-time package scope
 *   - `s12` / `s14` / `s15`         — internal arm codenames (use "governed" / "looprun")
 *   - `NB_<UPPER>`                  — the private harness env-var prefix
 *
 * Node-only, zero dependencies. Run: `node tests/no-private-refs.test.mjs`.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FORBIDDEN = /neurono|@neurono-bench|\bs1[245]\b|NB_[A-Z]/;

// Directories that are never scanned: dependencies and the harness scratch-output dir.
// (`.git` and gitignored trees like the τ² vendor are already absent from `git ls-files`.)
const SKIP = (path) =>
  path.includes('node_modules/') ||
  path === 'runs' ||
  path.startsWith('runs/') ||
  path.includes('/runs/');

// This test file legitimately contains the forbidden patterns (it defines them) — allow only itself.
const ALLOWLIST = new Set(['tests/no-private-refs.test.mjs']);

const files = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n')
  .filter(Boolean);

const offenders = [];
for (const file of files) {
  if (ALLOWLIST.has(file) || SKIP(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // unreadable/binary — skip
  }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (FORBIDDEN.test(lines[i])) {
      offenders.push(`${file}:${i + 1}: ${lines[i].trim().slice(0, 140)}`);
    }
  }
}

if (offenders.length > 0) {
  console.error(
    `no-private-refs: FAIL — ${offenders.length} forbidden private-lineage reference(s):\n` +
      offenders.join('\n'),
  );
  process.exit(1);
}

console.log(`no-private-refs: OK — scanned ${files.length} tracked files, zero forbidden references.`);
