/**
 * Runtime module-resolution hook.
 *
 * The exported edition bundles (the frozen `specs/<name>/*-spec.ts` files) are byte-for-byte
 * snapshots produced by the maintainers. Each one imports the governance runtime through a bare
 * specifier that ends in `/agentspec-runtime` — the private build-time name of what ships publicly
 * as `@looprun-ai/core`. This hook maps that embedded specifier onto the public package so the
 * frozen artifacts load unchanged, straight from npm, with nothing to edit.
 *
 * It is registered (via `node:module` `register`) by the run scripts BEFORE any spec bundle is
 * dynamically imported. Every other specifier is passed straight through untouched.
 */
const PUBLIC_CORE = '@looprun-ai/core';

/** True for the frozen editions' embedded runtime specifier (e.g. `<scope>/agentspec-runtime`). */
function isEditionRuntime(specifier) {
  return typeof specifier === 'string' && /(^|\/)[^/]*\/agentspec-runtime$/.test(specifier);
}

export async function resolve(specifier, context, nextResolve) {
  if (isEditionRuntime(specifier)) {
    // Anchor resolution to THIS module (inside the harness package) rather than the frozen spec's
    // directory, which has no node_modules — so `@looprun-ai/core` resolves from harness deps.
    return nextResolve(PUBLIC_CORE, { ...context, parentURL: import.meta.url });
  }
  return nextResolve(specifier, context);
}
