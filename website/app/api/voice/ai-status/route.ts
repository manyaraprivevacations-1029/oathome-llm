import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ServiceResult = {
  configured: boolean;
  reachable: boolean;
  status: "not_configured" | "connected" | "unhealthy" | "unreachable";
};

async function probe(url: string | undefined, path: string, token?: string): Promise<ServiceResult> {
  const baseUrl = url?.trim().replace(/\/+$/, "");
  if (!baseUrl) return { configured: false, reachable: false, status: "not_configured" };

  try {
    const headers: Record<string, string> = {};
    if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });
    return {
      configured: true,
      reachable: response.ok,
      status: response.ok ? "connected" : "unhealthy"
    };
  } catch {
    return { configured: true, reachable: false, status: "unreachable" };
  }
}

/**
 * Safe public diagnostics for the three self-hosted AI services.
 * Never returns internal URLs, credentials, prompts, or customer data.
 */
export async function GET() {
  const llmUrl = process.env.OATHOME_LLM_BASE_URL?.trim().replace(/\/+$/, "");
  const [llm, stt, tts] = await Promise.all([
    probe(llmUrl, "/api/version", process.env.OATHOME_LLM_UPSTREAM_TOKEN),
    probe(process.env.OATHOME_STT_BASE_URL, "/health", process.env.OATHOME_STT_TOKEN),
    probe(process.env.OATHOME_TTS_BASE_URL, "/health", process.env.OATHOME_TTS_TOKEN)
  ]);

  const allConfigured = llm.configured && stt.configured && tts.configured;
  const allReachable = llm.reachable && stt.reachable && tts.reachable;
  return NextResponse.json({
    service: "OATHome AI services",
    status: allReachable ? "connected" : allConfigured ? "partially_unavailable" : "not_configured",
    readyForVoice: allReachable,
    services: { llm, stt, tts },
    apiKeysRequired: false,
    message: allReachable
      ? "All configured self-hosted AI service health checks passed. End-to-end voice quality still needs testing."
      : "AI service endpoints are not all connected. This is expected during platform development; website and database can be developed independently."
  }, { headers: { "Cache-Control": "no-store" } });
}
