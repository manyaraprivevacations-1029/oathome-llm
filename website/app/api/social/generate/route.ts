import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function verifySocialSession(request: NextRequest): Promise<NextResponse | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return jsonError("Please sign in to OAT Social AI before generating content.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY?.trim() || "";
  if (!supabaseUrl || !supabaseAnonKey) return jsonError("OAT Social AI authentication is not configured on the server.", 503);

  try {
    const authUrl = supabaseUrl.replace(/\/+$/, "");
    const auth = await fetch(`${authUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    if (!auth.ok) return jsonError("Your Social AI session expired. Please sign in again.", 401);
    return null;
  } catch {
    return jsonError("Could not verify your Social AI session. Please try again.", 503);
  }
}

function extractGeneratedText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(extractGeneratedText).filter(Boolean).join("\\n").trim();
  }
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["response", "content", "text", "output_text", "generated_text"]) {
    const candidate = extractGeneratedText(record[key]);
    if (candidate) return candidate;
  }
  const choices = record.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== "object") continue;
      const message = (choice as Record<string, unknown>).message;
      const candidate = extractGeneratedText(message);
      if (candidate) return candidate;
      const delta = extractGeneratedText((choice as Record<string, unknown>).delta);
      if (delta) return delta;
      const text = extractGeneratedText((choice as Record<string, unknown>).text);
      if (text) return text;
    }
  }
  return "";
}

function cloudflareConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

export async function POST(request: NextRequest) {
  const authError = await verifySocialSession(request);
  if (authError) return authError;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
  const prompt = body && typeof body === "object" ? (body as { prompt?: unknown }).prompt : undefined;
  if (typeof prompt !== "string" || !prompt.trim()) return jsonError("Add a creative brief before generating.", 400);
  if (prompt.length > 16000) return jsonError("The creative brief is too long. Shorten it and try again.", 413);

  const config = cloudflareConfig();
  if (!config) return jsonError("Cloudflare Workers AI is not configured yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the OAT Social AI server environment.", 503);

  const model = process.env.CLOUDFLARE_TEXT_MODEL?.trim() || "@cf/qwen/qwen3.8-27b";
  const system = [
    "You are OWN, the creative engine for OAT Social AI, not the travel chatbot Radhika.",
    "Create the requested social content directly using the supplied On A Trip Holidays brief.",
    "Return only the requested output. If JSON is requested, return valid JSON only.",
    "Never invent package prices, dates, availability, inclusions, testimonials or guarantees. Mark unknown facts for confirmation."
  ].join(" ");

  try {
    if (!/^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(model)) return jsonError("The configured Cloudflare text model ID is invalid.", 503);

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        max_tokens: /caption/i.test(prompt) ? 700 : 1600,
        temperature: 0.4
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000)
    });

    const payload = await response.json().catch(() => null) as {
      success?: boolean;
      errors?: Array<{ message?: string; code?: number }>;
      result?: unknown;
    } | null;

    if (!response.ok || payload?.success === false) {
      const code = payload?.errors?.[0]?.code;
      console.error("[OAT Social AI] Cloudflare text generation failed:", response.status, code || "unknown");
      if (response.status === 429) return jsonError("Cloudflare's AI usage limit has been reached. Please try again after the daily allowance resets.", 429);
      if (response.status === 401 || response.status === 403) return jsonError("Cloudflare rejected the AI credentials. Check the Workers AI token and account ID in the server settings.", 503);
      if (response.status === 410) return jsonError("The configured Cloudflare text model is no longer available. Update the model setting.", 503);
      return jsonError("Cloudflare could not generate this content. Please try a shorter brief.", 502);
    }

    const result = payload?.result;
    const resultRecord = result && typeof result === "object"
      ? result as Record<string, unknown>
      : {};
    const choices = Array.isArray(resultRecord.choices) ? resultRecord.choices : [];
    const firstChoice = choices[0] && typeof choices[0] === "object"
      ? choices[0] as Record<string, unknown>
      : {};
    const message = firstChoice.message && typeof firstChoice.message === "object"
      ? firstChoice.message as Record<string, unknown>
      : {};
    const contentValue = typeof resultRecord.response === "string"
      ? resultRecord.response
      : typeof message.content === "string"
        ? message.content
        : "";
    const content = contentValue.trim();
    if (!content) {
      console.error("[OAT Social AI] Cloudflare text response contained no extractable text:", {
        model,
        resultKeys: Object.keys(resultRecord).slice(0, 20),
        responseStatus: response.status
      });
      return jsonError("Cloudflare returned no text for this request. Check the model response and Workers AI usage, then try again.", 502);
    }

    return NextResponse.json({ content, provider: "cloudflare", model }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Cloudflare text generation failed:", error instanceof Error ? error.message : String(error));
    return jsonError("Cloudflare AI generation timed out or could not be reached. Please try again.", 502);
  }
}
