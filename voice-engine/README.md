# OATHome Voice Engine (phone-provider independent)

This folder is the first self-hosted prototype for the three AI components: LLM, STT and TTS. Telephone integration is intentionally not included yet.

## Components
- **LLM:** Ollama-compatible model runner. Default suggested model: `qwen2.5:3b` for initial tests; evaluate Telugu-English conversation quality before selecting production model.
- **STT:** faster-whisper-server, an OpenAI-compatible transcription endpoint. Test Telugu and code-switched Telugu-English recordings; ASR performance varies with accent, noise and English words.
- **TTS:** IndicF5 service for Telugu-capable speech generation. IndicF5 needs text, a short reference voice clip, and the exact transcript of that clip. Use a voice you own or have explicit permission to use. Model access may require accepting the model's terms on Hugging Face; this is not a paid inference API.

## Run
1. Install Docker Engine with Docker Compose on a Linux machine or GPU host.
2. Copy `.env.example` to `.env` and adjust model settings.
3. Start the services with `docker compose up -d --build`.
4. Pull the default LLM model: `docker compose exec ollama ollama pull qwen2.5:3b`.
5. Verify Ollama at `http://localhost:11434`, STT at `http://localhost:8000/docs`, and TTS at `http://localhost:8001/health`.

## Security
- These ports are for development only. Do not expose Ollama or STT/TTS directly to the public internet.
- Use a private network, authentication, HTTPS at the gateway, request limits and secrets in environment variables before public deployment.
- GPU is strongly recommended for useful TTS latency. CPU mode is for compatibility tests, not live-call readiness.
- This prototype is not yet real-time streaming. Measure first-audio latency and transcription quality before connecting telephony.

## Free-first cost model
Model software and local inference do not require paid AI API credits. Cloud CPU/GPU time, storage and bandwidth can still cost money. Start locally or with an approved free compute allocation; do not assume a free cloud host can keep all three models loaded reliably.

## Initial acceptance tests
- STT: Telugu, English and mixed Telugu-English clips in clean and noisy conditions.
- LLM: package facts must be retrieved from company knowledge; never invent prices or dates.
- TTS: listen to Telugu pronunciation, English destination names, code-switching, pauses and number/price pronunciation.
- End-to-end: STT transcript -> LLM response -> TTS WAV, with no telephony integration.