#!/usr/bin/env bash
set -euo pipefail

# Build and run the in-repository OWN inference runtime on macOS Intel.
# Reuses the existing Ollama model store read-only (pruning/cloud disabled)
# and listens on a separate port so the current Ollama service is not stopped.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for tool in git go cmake; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing prerequisite: $tool"
    echo "Install Go 1.26+, CMake 3.24+, and Xcode Command Line Tools, then run this script again."
    exit 1
  fi
done

if ! xcode-select -p >/dev/null 2>&1; then
  echo "Xcode Command Line Tools are required. Run: xcode-select --install"
  exit 1
fi

GO_VERSION="$(go env GOVERSION | sed 's/^go//')"
if ! printf '%s\n' "$GO_VERSION" | awk -F. '{ if ($1 > 1 || ($1 == 1 && $2 >= 26)) exit 0; exit 1 }'; then
  echo "OWN requires Go 1.26 or newer; detected $GO_VERSION"
  exit 1
fi

MODEL_DIR="${HOME}/.ollama/models"
if [[ ! -d "$MODEL_DIR" ]]; then
  echo "Existing Ollama model directory not found at $MODEL_DIR"
  echo "No model files were changed. Install a model with Ollama first, then retry."
  exit 1
fi

echo "Building OWN CPU inference runtime. This first build can take a while..."
cmake -B build .
cmake --build build --parallel 4
go build -trimpath -o ./own .

echo
echo "Starting OWN on http://127.0.0.1:11436"
echo "Using existing model files from $MODEL_DIR"
echo "Ollama remains untouched on its original port 11434."
echo "Keep this Terminal window open while OWN is serving."
echo

export OLLAMA_HOST="127.0.0.1:11436"
export OLLAMA_MODELS="$MODEL_DIR"
export OLLAMA_NO_CLOUD=1
export OLLAMA_NOPRUNE=1
exec ./own serve
