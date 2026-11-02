# Run the OWN inference runtime on macOS Intel

This is the first migration milestone from the Ollama-compatible bridge to the inference runtime maintained in this repository.

## What this does

- Builds the Go OWN server and its CPU inference runner from this repository.
- Runs OWN on port `11436`, leaving the existing Ollama service on `11434` untouched.
- Reuses the existing Ollama model directory at `~/.ollama/models`; it does not download another copy of Qwen.
- Disables cloud features and model-store pruning for this shared-store test.
- Does not change Render, ngrok, gateway tokens, or the existing Ollama process.

## Requirements

- macOS Intel (x86_64)
- Go 1.26 or newer
- CMake 3.24 or newer
- Xcode Command Line Tools
- At least 15–25 GB of free disk space recommended for native build artifacts; the exact amount varies.

## Start OWN

From the repository root:

```bash
bash scripts/start-own-runtime-macos.sh
```

The first native build can take a while. Leave the Terminal window open after it starts.

## Verify locally

In a second Terminal window:

```bash
curl -fsS http://127.0.0.1:11436/api/version
curl -fsS http://127.0.0.1:11436/api/tags
```

The tags response should include the existing `qwen2.5:3b` model. If it does not, stop here; do not change the live website connection yet.

## Important

This is a local CPU runtime, not a cloud-hosted model. The Mac must remain powered on, awake, and connected for remote requests to work. The current Render frontend remains separate. Only after local verification should the authenticated gateway and tunnel be pointed at port 11436.

The existing Ollama service and its model store are left in place as a rollback path. This script sets `OLLAMA_NOPRUNE=1` specifically to avoid either runtime deleting unused shared model blobs during this initial test.

OWN's inference engine is based on the repository's llama.cpp integration and Go model/runtime orchestration. This milestone runs that engine; it does not train a new foundation model from scratch.
