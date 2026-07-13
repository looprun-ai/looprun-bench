#!/usr/bin/env bash
# Restore the external τ²-bench harness into vendor/ (gitignored). Reproducible: pinned commit.
# Usage: pnpm setup:tau2   (or: bash scripts/setup-tau2.sh)
set -euo pipefail

REPO="https://github.com/sierra-research/tau2-bench.git"
PIN="1901a301961cbbe3fd11f3e84a2a376530c759e3"   # the commit this bench was built + validated against
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/vendor/tau2-bench"

if [ -d "$DEST/.git" ]; then
  echo "[setup-tau2] vendor/tau2-bench already present — checking out $PIN"
  git -C "$DEST" fetch --quiet origin "$PIN" || git -C "$DEST" fetch --quiet origin
  git -C "$DEST" checkout --quiet "$PIN"
else
  echo "[setup-tau2] cloning tau2-bench into vendor/ …"
  mkdir -p "$ROOT/vendor"
  git clone --quiet "$REPO" "$DEST"
  git -C "$DEST" checkout --quiet "$PIN"
fi

echo "[setup-tau2] uv sync (Python 3.12–3.13, LiteLLM) …"
if ! command -v uv >/dev/null 2>&1; then
  echo "[setup-tau2] 'uv' not found — install it: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 2
fi
( cd "$DEST" && uv sync )

echo "[setup-tau2] done. Verify: cd vendor/tau2-bench && uv run tau2 --help"
