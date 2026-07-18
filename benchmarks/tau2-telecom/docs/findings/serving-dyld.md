# Finding — llama.cpp serving + the DYLD/SIP gotcha

## Config parity (confirmed)
looprun's `packages/models/src/llamacpp.ts` launch recipe is **identical** to the upstream-validated looprun runtime
config — same flags, same tiers (4B: ctx 32768, cache-ram 3072; 35B-A3B: ctx 65536, cache-ram 16384), KV
f16 both, `-ctxcp 64`, non-MTP. looprun has the latest serving optimizations; use `looprun models serve`.

## The DYLD abort (root cause)
The b9780 **source** build (`llama-server --version` → `version: 1 (1191758)`, Metal) links its dylibs via
an `@rpath` that points at the build dir (`/tmp/llamacpp-src/build/bin`), which the OS clears on reboot →
`dyld: Library not loaded: @rpath/libggml-base.dylib` (Abort trap 6). The real dylibs sit **next to the
binary**. Fix: `DYLD_FALLBACK_LIBRARY_PATH=<binary dir>`.

## The SIP / `nohup` trap (the subtle part)
Setting `DYLD_FALLBACK_LIBRARY_PATH` is not enough if you launch through **`nohup`**: `/usr/bin/nohup` is a
SIP-protected system binary, and macOS **strips all `DYLD_*` env vars** when exec'ing such binaries. So
`DYLD_...=... nohup llama-server &` loses the fix and the abort returns. The upstream serving script works
because it does `export DYLD_...; exec llama-server` (direct exec, no protected intermediary). A plain `&`
(no nohup) also preserves it.

**Rule:** never launch `llama-server` via `nohup`. Use `looprun models serve` (which sets DYLD in the
`spawn` env), or an `export`+`exec` wrapper.

## The looprun fix (upstream, out of this repo)
`packages/models/src/llamacpp.ts` was patched to set `DYLD_FALLBACK_LIBRARY_PATH` (to the resolved binary's
dir) in the `spawn` env, and `docs/guides/local-models.md` documents the source-build requirement. That
change lives in the **looprun repo** (decide separately whether to release it); this bench relies on a
looprun version that has it (or exports DYLD before `models serve`).
