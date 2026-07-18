# Guide — serving the local subjects (llama.cpp)

Use looprun's own CLI. Do not hand-roll flags.

```bash
looprun models status                 # binary / model file / server health per alias
looprun models serve qwen3.5-4b       # ~2.9 GB, 8–16 GB machines
looprun models serve qwen3.6-35b-a3b  # ~21 GB, 32 GB+  (serve ONE at a time — single GPU)
```

`looprun models serve` applies the **measured** launch recipe (identical to the config validated upstream):
`--jinja -fa on -ngl 99 --mlock --no-mmap -np 1 -c <ctx> -ctk f16 -ctv f16 -ctxcp 64 --cache-ram <MiB>
--slot-save-path <dir>`, on port 8081. KV = **f16 both tiers**; `-ctxcp` + `--cache-ram` are both
load-bearing for the qwen3.5/3.6 hybrids (warm agent-switch TTFT 0.5–0.6 s vs 11–22 s cold); **non-MTP**.
Thinking-off + temp-0 are request-level (`chat_template_kwargs:{enable_thinking:false}`, temperature 0),
not server flags.

## Requirements
- `llama-server` build **≥ b9780** (older builds can't load the qwen3.5/3.6 family). Resolution order:
  `$LLAMA_BIN` → `~/llamacpp-b9780/bin/llama-server` → PATH.
- A GPU the build offloads to (`-ngl 99`) — Metal on Apple Silicon.

## ⚠️ DYLD / SIP gotcha (macOS source builds)
A from-source `llama-server` links its `libggml-*`/`libllama-*` dylibs by an `@rpath` pointing at the build
dir (often under `/tmp`), which the OS clears on reboot → `dyld: Library not loaded` (Abort trap 6). The
dylibs ship beside the binary.
- `looprun models serve` **sets `DYLD_FALLBACK_LIBRARY_PATH` to the binary's dir automatically** (looprun ≥
  the version with this fix). If you must launch `llama-server` yourself: `export
  DYLD_FALLBACK_LIBRARY_PATH="$(dirname "$LLAMA_BIN"):/usr/local/lib:/usr/lib"` then `exec` it.
- **NEVER via `nohup`** — `/usr/bin/nohup` is SIP-protected and macOS **strips `DYLD_*`** when exec'ing it.
  Use `looprun models serve`, or an `export`+`exec` wrapper, or a plain `&`. See `findings/serving-dyld.md`.
