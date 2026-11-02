import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, non-secret Groq diagnostics.
 * Never return the API key or upstream credentials.
 */
export async function GET() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const selectedModel = process.env.OATHOME_LLM_MODEL?.trim() || "openai/gpt-oss-20b";

  if (!apiKey) {
    return NextResponse.json({
      service: "OATHome Runtime Gateway",
      provider: "Groq",
      status: "not_configured",
      runtimeConfigured: false,
      reachable: false,
      modelCount: 0,
      inferenceReady: false,
      selectedModel,
      message: "Groq API key is not configured. Add GROQ_API_KEY in the Render environment.",
      externalAIRequired: true,
      apiKeysRequired: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json({
        service: "OATHome Runtime Gateway",
        provider: "Groq",
        status: "unhealthy",
        runtimeConfigured: true,
        reachable: false,
        modelCount: 0,
        inferenceReady: false,
        selectedModel,
        message: `Groq returned HTTP ${response.status}. Check the API key and Groq account.`,
        externalAIRequired: true,
        apiKeysRequired: true,
      }, { headers: { "Cache-Control": "no-store" }, status: 502 });
    }

    const payload: unknown = await response.json();
    const models = payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Array<{ id?: unknown }> }).data
          .filter((item) => item && typeof item.id === "string")
          .map((item) => ({ name: item.id as string }))
      : [];
    const selectedAvailable = models.some((item) => item.name === selectedModel);

    return NextResponse.json({
      service: "OATHome Runtime Gateway",
      provider: "Groq",
      status: "connected",
      runtimeConfigured: true,
      reachable: true,
      modelCount: models.length,
      models,
      selectedModel,
      selectedModelAvailable: selectedAvailable,
      inferenceReady: selectedAvailable,
      message: selectedAvailable
        ? "Groq is reachable and the selected model is available."
        : "Groq is reachable, but the selected model was not found in the account's model list.",
      externalAIRequired: true,
      apiKeysRequired: true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      service: "OATHome Runtime Gateway",
      provider: "Groq",
      status: "unreachable",
      runtimeConfigured: true,
      reachable: false,
      modelCount: 0,
      inferenceReady: false,
      selectedModel,
      message: "The Groq API could not be reached from the website server.",
      externalAIRequired: true,
      apiKeysRequired: true,
    }, { headers: { "Cache-Control": "no-store" }, status: 502 });
  }
}
