import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRuntimeBaseUrl() {
  const configured = process.env.OATHOME_LLM_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV !== "production" ? "http://127.0.0.1:11434" : "";
}

/**
 * Public, non-secret runtime diagnostics.
 * Never return the configured URL, access tokens, or upstream credentials.
 */
export async function GET() {
  const baseUrl = getRuntimeBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({
      service: "OATHome Runtime Gateway",
      status: "not_configured",
      runtimeConfigured: false,
      reachable: false,
      modelCount: 0,
      inferenceReady: false,
      message: "No cloud inference runtime is connected yet. The OWN website is online, but model inference is not hosted by this service.",
      externalAIRequired: false,
      apiKeysRequired: false,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const upstreamToken = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
    const headers: Record<string, string> = {};
    if (upstreamToken) headers.Authorization = `Bearer ${upstreamToken}`;
    const [versionResponse, tagsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/version`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) }),
      fetch(`${baseUrl}/api/tags`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) }),
    ]);
    if (!versionResponse.ok || !tagsResponse.ok) {
      return NextResponse.json({
        service: "OATHome Runtime Gateway",
        status: "unhealthy",
        runtimeConfigured: true,
        reachable: false,
        modelCount: 0,
        inferenceReady: false,
        message: "The configured runtime did not return a healthy response.",
        externalAIRequired: false,
        apiKeysRequired: false,
      }, { headers: { "Cache-Control": "no-store" }, status: 502 });
    }
    const versionData: unknown = await versionResponse.json().catch(() => ({}));
    const tagsData: unknown = await tagsResponse.json().catch(() => ({}));
    const models = tagsData && typeof tagsData === "object" && Array.isArray((tagsData as { models?: unknown }).models)
      ? (tagsData as { models: unknown[] }).models
      : [];
    return NextResponse.json({
      service: "OATHome Runtime Gateway",
      status: "connected",
      runtimeConfigured: true,
      reachable: true,
      runtimeVersion: versionData && typeof versionData === "object" && typeof (versionData as { version?: unknown }).version === "string"
        ? (versionData as { version: string }).version
        : "unknown",
      modelCount: models.length,
      models: models.map((item) => {
        if (!item || typeof item !== "object") return { name: "unknown" };
        const model = item as { name?: unknown; size?: unknown; modified_at?: unknown };
        return {
          name: typeof model.name === "string" ? model.name : "unknown",
          ...(typeof model.size === "number" ? { size: model.size } : {}),
          ...(typeof model.modified_at === "string" ? { modified_at: model.modified_at } : {}),
        };
      }),
      inferenceReady: models.length > 0,
      message: models.length > 0 ? "Runtime reachable and at least one model is installed." : "Runtime reachable, but no model is installed.",
      externalAIRequired: false,
      apiKeysRequired: false,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      service: "OATHome Runtime Gateway",
      status: "unreachable",
      runtimeConfigured: true,
      reachable: false,
      modelCount: 0,
      inferenceReady: false,
      message: "The configured runtime could not be reached. Check the private runtime service and its network access.",
      externalAIRequired: false,
      apiKeysRequired: false,
    }, { headers: { "Cache-Control": "no-store" }, status: 502 });
  }
}
