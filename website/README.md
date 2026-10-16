# OATHome LLM + On A Trip Holidays

This repository contains the OATHome Go inference runtime and a Next.js web interface. The runtime is the source of model inference; the website does not require a third-party LLM API.

## OATHome model playground

Run the Go runtime locally on its default port (11434), install a supported model, and start the website:

```bash
# From the repository root, build/run the runtime using this project's documented Go commands.
go run . serve

# In another terminal
cd website
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000/llm](http://localhost:3000/llm). The playground discovers installed models through the runtime's `/api/tags` endpoint and sends chat messages to `/api/chat`.

If your local checkout uses a prebuilt executable, run that executable with `serve` instead of `go run . serve`. Install a model with the runtime's `pull` command before selecting it in the playground.

## Production configuration

Configure these server-side variables in Vercel or the hosting environment:

- `OATHOME_LLM_BASE_URL`: base URL of the OATHome inference service, reachable from the website server.
- `OATHOME_LLM_ACCESS_TOKEN`: long random access token required by the website's chat route in production.

The website forwards requests server-side and does not expose the inference URL in browser code. Protect the inference server with network rules or an authenticated reverse proxy; do not expose an unrestricted model endpoint to the public internet. Vercel hosts the website/API proxy, not the model weights or GPU inference process.

## Existing travel assistant

The On A Trip Holidays sales dashboard remains available at `/`. Its voice/telephony integrations are separate from the OATHome LLM playground and are not required to run local model inference.
