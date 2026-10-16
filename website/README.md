# OWN — OATHome Intelligence

OWN is our custom AI chat frontend. It uses a server-side adapter to talk to an Ollama-compatible inference endpoint. The UI and platform are ours; the model runtime can evolve independently.

## Local development

Requirements: Node.js 20+ and either Ollama or the OATHome Go runtime. Use only one server on port `11434` at a time.

### Option A — Ollama backend (quickest)

1. Install Ollama from https://ollama.com/download and start it.
2. Pull a starter model: `ollama pull qwen2.5:3b`.
3. Start the website in a terminal:

   ```bash
   cd website
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

### Option B — OATHome Go runtime

To test the in-repository runtime instead, stop Ollama first and start the Go server using the supported command for this checkout (currently `go run . serve`). Then use the same website steps above.

During local development the website defaults to `http://127.0.0.1:11434` and does not require the production access token.

## Environment variables

Set these in the hosting environment, not in client-side variables:

- `OATHOME_LLM_BASE_URL`: URL of the inference server, reachable **from the website server**. Do not use `localhost` for a separate Vercel deployment.
- `OATHOME_LLM_ACCESS_TOKEN`: long, random secret required to access the production chat API. Enter this in the OWN UI to unlock chat; it is held in browser session storage for the current tab session.
- `OATHOME_LLM_UPSTREAM_TOKEN` (optional): separate bearer token for an inference endpoint that requires upstream authentication. Do not reuse the frontend access token for this.
- `OATHOME_LLM_MODEL` (optional): default installed model name, such as `qwen2.5:3b`.

Generate secrets with a password manager or cryptographically secure generator. Never commit them to Git or expose them through a `NEXT_PUBLIC_*` variable. Add production variables in Vercel and redeploy.

## Legacy travel API

The old `/api/ai-bot/*` routes are intentionally blocked with HTTP 404 by `middleware.ts`. They are not part of OWN LLM and remain disabled until separately audited and secured.

## Production checklist

- Set the Vercel project root to `website`.
- Configure `OATHOME_LLM_BASE_URL` and `OATHOME_LLM_ACCESS_TOKEN` for Production.
- Configure `OATHOME_LLM_UPSTREAM_TOKEN` only if the inference server itself requires bearer authentication.
- The inference URL must be reachable from the deployed Next.js server. A Mac's `127.0.0.1` is not reachable from Vercel.
- Do not expose an unauthenticated Ollama/OATHome port directly to the public internet.
- The shared-token gate is starter access control, not a multi-user identity system. Before sharing broadly, add account-based auth, rate limiting, usage limits, and server-side observability.
- Run `npm run typecheck` and `npm run build` before shipping.

## Architecture

Browser → OWN Next.js UI → `/api/chat` server route → inference server `/api/tags` and `/api/chat`.

The browser never calls the inference server directly, keeping its URL and upstream credentials out of the client bundle. The existing `/llm` route remains as a legacy runtime playground while the OWN homepage becomes the primary experience.
