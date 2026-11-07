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
    const auth = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
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

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

export async function POST(request: NextRequest) {
  const authError = await verifySocialSession(request);
  if (authError) return authError;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
  const prompt = body && typeof body === "object" ? (body as { prompt?: unknown }).prompt : undefined;
  if (typeof prompt !== "string" || !prompt.trim()) return jsonError("Add a creative brief before generating.", 400);
  if (prompt.length > 16000) return jsonError("The creative brief is too long. Shorten it and try again.", 413);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonError("Gemini is not configured. Add GEMINI_API_KEY to Vercel and redeploy.", 503);

  // Model 2.5 returns HTTP 404 for newly eligible projects; use current free-tier Flash-Lite models.
  const preferredModel = process.env.GEMINI_TEXT_MODEL?.trim();
  const models = [...new Set([preferredModel, "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"].filter((m): m is string => Boolean(m)))];
  const allowed = new Set(["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]);
  const modelCandidates = models.filter(m => allowed.has(m));
  if (!modelCandidates.length) return jsonError("No supported free-tier Gemini model is configured.", 503);

  const system = [
    "You are OWN, the creative engine for OAT Social AI, not the travel chatbot Radhika.",
    "Create the requested social content directly using the supplied On A Trip Holidays brief.",
    "Return only the requested output. If JSON is requested, return valid JSON only.",
    "Never invent package prices, dates, availability, inclusions, testimonials or guarantees. Mark unknown facts for confirmation."
  ].join(" ");

  const wantsJson = /return only valid json/i.test(prompt);
  for (const model of modelCandidates) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: wantsJson ? 3000 : 1800,
            thinkingConfig: { thinkingLevel: "minimal" },
            ...(wantsJson ? { responseMimeType: "application/json" } : {})
          }
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(40000)
      });

      if (!response.ok) {
        // A 404 may mean this particular model is not provisioned for the key.
        // Try the other current free-tier model, without leaking API credentials.
        console.error("[OAT Social AI] Gemini generation failed:", { status: response.status, model });
        if (response.status === 404 || response.status === 503) continue;
        if (response.status === 429) return jsonError("Gemini free-tier usage limit reached. Please try again after quota resets.", 429);
        if (response.status === 401 || response.status === 403) return jsonError("Gemini API key was rejected or is not authorized for generation.", 503);
        if (response.status === 400) return jsonError("Gemini could not accept this request. Please shorten or adjust your brief.", 502);
        return jsonError("Gemini could not generate content right now. Please try again.", 502);
      }

      const data = await response.json().catch(() => null) as GeminiResponse | null;
      const candidate = data?.candidates?.[0];
      const content = candidate?.content?.parts?.filter(part => typeof part.text === "string").map(part => part.text).join("").trim() || "";
      if (!content) {
        console.error("[OAT Social AI] Gemini empty candidate:", { model, finishReason: candidate?.finishReason, blocked: Boolean(data?.promptFeedback?.blockReason) });
        if (candidate?.finishReason === "SAFETY" || data?.promptFeedback?.blockReason) {
          return jsonError("Gemini flagged this brief. Please revise the requested content.", 422);
        }
        continue;
      }

      if (wantsJson) {
        try { JSON.parse(content); } catch {
          console.error("[OAT Social AI] Gemini returned invalid JSON:", model);
          continue;
        }
      }

      return NextResponse.json({ content, provider: "gemini", model }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("[OAT Social AI] Gemini request error:", { model, type: error instanceof Error ? error.name : "unknown" });
    }
  }
  return jsonError("The available free-tier Gemini models could not produce a response. Please check Gemini project access and current quotas.", 503);
}
