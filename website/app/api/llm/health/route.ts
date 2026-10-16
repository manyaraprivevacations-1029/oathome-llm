import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function runtimeBaseUrl() {
  const configured = process.env.OATHOME_LLM_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? null : "http://127.0.0.1:11434";
}

export async function GET() {
  const baseUrl = runtimeBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({
      ok: false,
      configured: false,
      runtime: "OATHome LLM",
      error: "Set OATHOME_LLM_BASE_URL to your OATHome inference server.",
      models: [],
    }, { status: 503 });
  }

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        configured: true,
        runtime: "OATHome LLM",
        error: `Inference server returned HTTP ${response.status}.`,
        models: [],
      }, { status: 502 });
    }

    const data = await response.json() as { models?: Array<{ name?: string; model?: string; size?: number }> };
    return NextResponse.json({
      ok: true,
      configured: true,
      runtime: "OATHome LLM",
      models: Array.isArray(data.models)
        ? data.models.map((model) => ({
            name: model.name ?? model.model ?? "unknown",
            size: typeof model.size === "number" ? model.size : undefined,
          }))
        : [],
    });
  } catch {
    return NextResponse.json({
      ok: false,
      configured: true,
      runtime: "OATHome LLM",
      error: "Cannot reach the inference server. Check its URL and that the runtime is running.",
      models: [],
    }, { status: 502 });
  }
}
