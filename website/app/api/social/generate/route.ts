import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function normalizeGeneratedContent(raw: string): string {
  let content = raw.trim().replace(/^\`\`\`(?:json|text)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();

  // Older/local models may still wrap a plain-text caption in JSON despite the prompt.
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const object = parsed as Record<string, unknown>;
      const candidate = object.caption ?? object.text ?? object.content ?? object.response ?? object.output;
      if (typeof candidate === "string") content = candidate.trim();
    } else if (typeof parsed === "string") {
      content = parsed.trim();
    }
  } catch {
    // The expected response is plain text, so leave non-JSON output unchanged.
  }

  // Remove exact repeated sentences without changing the wording of unique sentences.
  const seen = new Set<string>();
  content = content
    .split(/(?<=[.!?।])\s+/u)
    .filter((sentence) => {
      const key = sentence.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ")
    .trim();

  return content;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Please sign in to OAT Social AI before generating content.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return jsonError("OAT Social AI authentication is not configured on the server.", 503);

  try {
    const authResponse = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    if (!authResponse.ok) return jsonError("Your Social AI session expired. Please sign in again.", 401);
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
  baseUrl = baseUrl.replace(/\/+$/, "");
  if (!baseUrl) return jsonError("OWN model runtime is not configured. Set OATHOME_LLM_BASE_URL in the existing runtime environment.", 503);

  const model = process.env.OATHOME_LLM_MODEL?.trim() || "qwen2.5:3b";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const upstreamToken = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
  if (upstreamToken) headers.Authorization = `Bearer ${upstreamToken}`;

  const system = [
    "You are OWN, the creative engine for OAT Social AI. You are not the travel-customer chatbot Radhika.",
    "Follow the supplied On A Trip Holidays brand brief. Generate the requested creative asset directly; never answer with a generic travel enquiry, FAQ fallback, or a question asking what destination the customer wants.",
    "Return clean plain text by default. Do not wrap ordinary captions or creative copy in JSON, code fences, labels, or introductory commentary. Return JSON only when the user explicitly asks for JSON.",
    "For captions, write naturally and concisely. Use one clear hook, useful distinct sentences, one CTA and a small set of relevant hashtags. Never repeat a sentence, idea, CTA or hashtag block to fill space.",
    "Never invent package prices, dates, departures, availability, inclusions, hotel standards, testimonials, performance results or guarantees. Mark uncertain facts for team confirmation.",
    "Do not claim to have researched live trends, created media files, sourced footage or published content unless those actions actually occurred."
  ].join("\n");

  const call = async (path: string, payload: unknown) => fetch(`${baseUrl}${path}`, {
    method: "POST", headers, body: JSON.stringify(payload), cache: "no-store",
    signal: AbortSignal.timeout(270000)
  });

  try {
    let content = "";
    const chat = await call("/api/chat", {
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      stream: false
    });
    if (chat.ok) {
      const result = await chat.json().catch(() => null) as { message?: { content?: unknown } } | null;
      if (typeof result?.message?.content === "string") content = result.message.content.trim();
    }

    if (!content) {
      const generated = await call("/api/generate", {
        model,
        system,
        prompt,
        stream: false
      });
      if (!generated.ok) {
        const detail = (await generated.text().catch(() => "")).slice(0, 700);
        console.error("[OAT Social AI] OWN generation failed:", generated.status, detail);
        return jsonError("OWN could not generate this creative brief. Check the configured model runtime and try again.", 502);
      }
      const result = await generated.json().catch(() => null) as { response?: unknown } | null;
      if (typeof result?.response === "string") content = result.response.trim();
    }

    content = normalizeGeneratedContent(content);
    if (!content) return jsonError("OWN returned an empty creative response. Please try again.", 502);
    return NextResponse.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] OWN generation request failed:", error instanceof Error ? error.message : String(error));
    return jsonError("Could not reach the OWN model runtime. Please try again shortly.", 502);
  }
}
