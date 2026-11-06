import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return jsonError("Please sign in to OAT Social AI before generating content.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return jsonError("OAT Social AI authentication is not configured on the server.", 503);

  try {
    let authUrl = supabaseUrl;
    while (authUrl.endsWith("/")) authUrl = authUrl.slice(0, -1);
    const auth = await fetch(`${authUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    if (!auth.ok) return jsonError("Your Social AI session expired. Please sign in again.", 401);
  } catch {
    return jsonError("Could not verify your Social AI session. Please try again.", 503);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
  const prompt = body && typeof body === "object" ? (body as { prompt?: unknown }).prompt : undefined;
  if (typeof prompt !== "string" || !prompt.trim()) return jsonError("Add a creative brief before generating.", 400);
  if (prompt.length > 16000) return jsonError("The creative brief is too long. Shorten it and try again.", 413);

  let baseUrl = process.env.OATHOME_LLM_BASE_URL?.trim() || "";
  if (!baseUrl && process.env.NODE_ENV !== "production") baseUrl = "http://127.0.0.1:11434";
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  if (!baseUrl) return jsonError("OWN model runtime is not connected to this deployment yet. The editor can still create a clearly labelled local starter, but AI generation requires the private Qwen inference service.", 503);

  const model = process.env.OATHOME_LLM_MODEL?.trim() || "qwen2.5:3b";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const upstreamToken = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
  if (upstreamToken) headers.Authorization = `Bearer ${upstreamToken}`;

  const system = [
    "You are OWN, the creative engine for OAT Social AI, not the travel chatbot Radhika.",
    "Create the requested social content directly using the supplied On A Trip Holidays brief.",
    "Return only the requested output. If JSON is requested, return valid JSON only.",
    "Never invent package prices, dates, availability, inclusions, testimonials or guarantees. Mark unknown facts for confirmation."
  ].join(" ");

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        stream: false,
        format: "json",
        options: { num_predict: /caption/i.test(prompt) ? 180 : 600 }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      console.error("[OAT Social AI] OWN generation failed:", response.status, detail);
      return jsonError("OWN could not generate this content. Try a shorter brief.", 502);
    }

    const result = await response.json().catch(() => null) as { message?: { content?: unknown } } | null;
    const content = typeof result?.message?.content === "string" ? result.message.content.trim() : "";
    if (!content) return jsonError("OWN returned an empty response. Please try again.", 502);
    return NextResponse.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] OWN generation failed:", error instanceof Error ? error.message : String(error));
    return jsonError("OWN generation timed out or the model runtime could not be reached.", 502);
  }
}
