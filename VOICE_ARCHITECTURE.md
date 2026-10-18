# OATHome Voice Sales Executive — Architecture

## Goal
Build an Outpero-style AI sales executive for On A Trip Holidays that handles real inbound calls first and consent-based outbound follow-ups later. Avoid paid AI inference APIs and AI-credit dependencies by self-hosting open-weight speech and language models. Telephone connectivity itself is not expected to be free.

## Architecture decision
Keep the current Render service as the public web app and control plane. Do not run speech models on the Render free web service.

1. **Public app/control plane (existing Render service)**
   - Website, package knowledge, sales flows, lead records, configuration.
   - Authenticated endpoints for call events and human handoff.
   - Never expose model runtime URLs, SIP credentials, or telephony secrets in public responses.
2. **Telephony gateway (small always-on Linux VPS)**
   - Asterisk or FreeSWITCH, connected to a licensed Indian cloud telephony provider/SIP trunk.
   - Handles inbound number, call routing, DTMF fallback, transfer to a human, hang-up and recording policy.
   - Keep this separate from GPU inference so calls remain reachable if the model worker restarts.
3. **Voice AI worker (separate container/VM; GPU optional at first)**
   - Streaming ASR: benchmark faster-whisper or whisper.cpp on actual call audio.
   - LLM: quantized open-weight instruct model served by llama.cpp or an Ollama-compatible runtime.
   - TTS: evaluate an open multilingual/Indic model for Telugu-English pronunciation; choose only after listening tests. Do not assume a lightweight voice model has a suitable Telugu voice without testing.
   - Stream short utterances, interrupt on caller speech (barge-in), and use voice activity/end-of-turn detection.
4. **Knowledge and sales state**
   - Use verified package data and pricing from the existing JSON/Supabase store.
   - Structured sales state: destination, dates, people, city, budget, lead consent and next action.
   - The LLM may phrase answers naturally, but package prices, dates, inclusions and booking rules must come from retrieved company data. Unknown answers go to a human.
5. **Security and reliability**
   - Private network or authenticated service-to-service requests between telephony gateway and model worker.
   - Store secrets only as service environment variables; never commit them.
   - Rate limits, request timeouts, health checks, logs without unnecessary personal data, and human transfer on model/provider failure.
   - Do not store call audio by default; enable recording only with appropriate notice, purpose and access controls.

## Call flow
Inbound number -> Indian telephony/SIP provider -> Asterisk/FreeSWITCH -> streaming ASR -> sales state plus retrieved package facts -> LLM response -> streaming TTS -> caller. At any point, allow DTMF/voice request for a human and transfer to the team.

Outbound calling must be opt-in/consent-based and use a provider/setup compliant with current Indian telecom rules. Do not use ordinary personal SIMs for bulk promotional calls. Confirm sender/telemarketer registration, number/header requirements, customer consent, DND/preference rules and provider terms before enabling outbound campaigns.

## Hosting choice
- **Now:** keep the current Render web service. Add a small always-on Linux VPS for telephony only when a phone provider and budget are selected. Test ASR/LLM/TTS locally/offline for free during development.
- **Pilot:** a metered GPU worker (for example RunPod Serverless) can host the language model when requests arrive. Scale-to-zero saves idle cost but may introduce cold-start delay; keep a warm worker if call latency matters.
- **Production:** separate always-on telephony gateway and a warm GPU inference worker. Budget for the Indian phone number/SIP minutes, VPS, GPU time, storage and monitoring. Open-source software avoids mandatory AI API fees, not infrastructure or telecom charges.

## Implementation milestones
1. Build a browser-based voice test harness with 10–20 Telugu-English travel-sales scenarios; measure transcription accuracy, first-audio latency, pronunciation and interruptions.
2. Add a private voice service contract with streaming ASR/LLM/TTS and a health endpoint; do not expose a public telephony webhook until provider credentials and signature verification are chosen.
3. Add inbound call handling, call transfer, DTMF fallback, consent/notice and minimal call logs.
4. Add CRM/lead capture and opt-in outbound follow-ups only after compliance review.
5. Load-test concurrent calls and set spend limits/alerts before exposing the number publicly.

## Definition of done for first phone pilot
- A caller can ask for a package in Telugu, English or mixed Telugu-English.
- The system answers only with verified package facts and can ask qualifying questions.
- Caller can interrupt the AI and request a human.
- Failure routes to a human or safe fallback rather than dead air.
- p95 response latency, call drop rate, ASR accuracy and per-minute infrastructure/telecom cost are measured.
- Inbound works reliably before outbound calling is enabled.