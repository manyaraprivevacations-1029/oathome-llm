# OATHome LLM

OATHome is a self-hostable LLM runtime and platform built around this repository's Go inference server and supported model backends.

- **Local inference:** run the runtime on your own Mac or server and use supported local model files.
- **Model API:** Ollama-compatible endpoints such as `/api/tags` and `/api/chat`.
- **Web playground:** the Next.js application lives in `website/`; open `/llm` to chat with your configured runtime.
- **Cloud:** deploy the website separately from the inference server. Set `OATHOME_LLM_BASE_URL` and a strong `OATHOME_LLM_ACCESS_TOKEN` in the website's hosting environment, and protect the inference server from direct public access.

This platform does not require a third-party LLM API for inference. Open-weight models remain subject to their own licenses and hardware requirements. See [website/README.md](website/README.md) for setup instructions and the project's [LICENSE](LICENSE).
