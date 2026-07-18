/**
 * Runtime module-resolution hook.
 *
 * The exported edition bundles (the frozen `specs/<name>/*-spec.ts` files) are byte-for-byte
 * snapshots produced by the maintainers. They import the governance runtime as `@looprun-ai/core`,
 * but they live in edition directories that carry no `node_modules` of their own — so a bare
 * specifier resolved from the spec's own directory would fail. This hook re-anchors the
 * `@looprun-ai/core` specifier (and its subpaths) to THIS module inside the harness package, whose
 * dependencies do provide the package, so the frozen artifacts load unchanged straight from npm.
 *
 * It is registered (via `node:module` `register`) by the run scripts BEFORE any spec bundle is
 * dynamically imported. Every other specifier is passed straight through untouched.
 */
const PUBLIC_CORE = '@looprun-ai/core';

/** True for the public core package or any of its subpaths (e.g. `@looprun-ai/core/testing`). */
function isPublicCore(specifier) {
  return typeof specifier === 'string'
    && (specifier === PUBLIC_CORE || specifier.startsWith(`${PUBLIC_CORE}/`));
}

export async function resolve(specifier, context, nextResolve) {
  if (isPublicCore(specifier)) {
    // Anchor resolution to THIS module (inside the harness package) rather than the frozen spec's
    // directory, which has no node_modules — so `@looprun-ai/core` resolves from harness deps.
    return nextResolve(specifier, { ...context, parentURL: import.meta.url });
  }
  return nextResolve(specifier, context);
}
