# OATHome LLM

**OWN** is the custom web experience for OATHome LLM. This repository includes a self-hostable Go inference runtime and a Next.js frontend. The initial chat adapter supports Ollama-compatible APIs; the long-term goal is to keep the OWN frontend stable while evolving our own inference runtime.

- **OWN web app:** Next.js application in `website/`, served from `/`.
- **Inference runtime:** Go server at the repository root, with Ollama-compatible endpoints such as `/api/tags` and `/api/chat`.
- **Local development:** run the inference server on `127.0.0.1:11434`, then start the website.
- **Cloud deployment:** deploy the website separately from model inference. Vercel hosts the frontend/API proxy; it does not run model weights or GPU inference.
- **Privacy and access:** production chat requires `OATHOME_LLM_ACCESS_TOKEN`. Keep the inference server private or behind network-level protection.

## Quick start

1. Install Go and Node.js 20+.
2. Start the runtime using the supported command for this checkout (the documented default is `go run . serve`).
3. In a second terminal:

   ```bash
   cd website
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

For model installation, supported runtime commands, environment variables, and deployment security, see [website/README.md](website/README.md), [LICENSE](LICENSE), and the runtime source.

Open-weight models remain subject to their own licenses and hardware requirements.
