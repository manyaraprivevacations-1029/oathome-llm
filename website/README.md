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

- `OATHOME_LLM_BASE_URL`: URL of the inference server, reachable **from the website server**. Do not use `localhost` for a separate cloud deployment.
- `OATHOME_LLM_ACCESS_TOKEN`: long, random secret required to access the production chat API. Enter this in the OWN UI to unlock chat; it is held in browser session storage for the current tab session.
- `OATHOME_LLM_UPSTREAM_TOKEN` (optional): separate bearer token for an inference endpoint that requires upstream authentication. Do not reuse the frontend access token for this.
- `OATHOME_LLM_MODEL` (optional): default installed model name, such as `qwen2.5:3b`.
- `SUPABASE_URL`: your Supabase project URL.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key (preferred, typically starts with `sb_secret_`). The legacy `SUPABASE_SERVICE_ROLE_KEY` name is also supported by the server helper.

Generate secrets with a password manager or cryptographically secure generator. Never commit secrets to Git or expose them through a `NEXT_PUBLIC_*` variable. Add production variables in Render and redeploy.

## Supabase server connection

The Supabase JavaScript dependency is already installed. The server-only helper in `lib/supabase-admin.ts` uses the project URL and secret key only on the Next.js server. Do not import it into a Client Component.

1. In the Supabase SQL Editor, run `supabase/migrations/20261017000000_oathome_healthcheck.sql`.
2. In Render, open the OATHome LLM service's Environment page and add `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Use the URL from Supabase Project Settings and the **secret** key from API Keys. Do not use a publishable key for this server-only health check.
3. Redeploy the Render service.
4. Open the OWN website and use the existing access token to authorize the health check request. Call `GET /api/supabase/health` with `Authorization: Bearer <OATHOME_LLM_ACCESS_TOKEN>`. A successful response reports `{"ok":true,"configured":true,"service":"Supabase","database":"reachable"}`.

The health-check table contains no user data and is locked to server-side service-role access. This first integration verifies connectivity; it does not yet store chat history or provide Supabase Auth.

## Production inference connection

The inference URL must be reachable from the deployed Next.js server. A Mac's `127.0.0.1` is not reachable from Render. Keep Ollama behind an authenticated private tunnel or deploy an inference endpoint on a server that can be reached securely. Do not expose an unauthenticated Ollama port directly to the public internet.

The shared-token gate is starter access control, not a multi-user identity system. Before sharing broadly, add account-based auth, rate limiting, usage limits, and server-side observability.

Run `npm run typecheck` and `npm run build` before shipping.

## Legacy travel API

The old `/api/ai-bot/*` routes are intentionally blocked with HTTP 404 by `middleware.ts`. They are not part of OWN LLM and remain disabled until separately audited and secured.

## Architecture

Browser → OWN Next.js UI → `/api/chat` server route → inference server `/api/tags` and `/api/chat`.

Supabase connectivity is verified by a separate authenticated server route. The browser never receives the Supabase secret key or upstream inference credentials.
