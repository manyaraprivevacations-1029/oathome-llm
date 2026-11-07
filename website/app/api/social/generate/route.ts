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

  // Keep a free-tier eligible text model by default; changing models requires verifying current eligibility.
  const model = process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.5-flash-lite";
  if (!/^gemini-[a-z0-9.-]+$/i.test(model)) return jsonError("The Gemini text model setting is invalid.", 503);

  const system = [
    "You are OWN, the creative engine for OAT Social AI, not the travel chatbot Radhika.",
    "Create the requested social content directly using the supplied On A Trip Holidays brief.",
    "Return only the requested output. If JSON is requested, return valid JSON only.",
    "Never invent package prices, dates, availability, inclusions, testimonials or guarantees. Mark unknown facts for confirmation."
  ].join(" ");

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: /caption/i.test(prompt) ? 1300 : 2400 }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55000)
    });

    if (!response.ok) {
      console.error("[OAT Social AI] Gemini generation HTTP error:", response.status);
      if (response.status === 429) return jsonError("Gemini free-tier request limit reached. Please try again after the quota resets.", 429);
      if (response.status === 401 || response.status === 403) return jsonError("Gemini rejected the API key or project access. Check GEMINI_API_KEY in Vercel.", 503);
      if (response.status === 404) return jsonError("The configured Gemini model is unavailable for this API key.", 503);
      if (response.status === 400) return jsonError("Gemini rejected the generation request. Check the model configuration or shorten the brief.", 502);
      return jsonError("Gemini generation is temporarily unavailable. Please try again.", 502);
    }

    const data = await response.json().catch(() => null) as GeminiResponse | null;
    const candidate = data?.candidates?.[0];
    const content = candidate?.content?.parts?.map(part => part.text || "").join("").trim() || "";
    if (!content) {
      console.error("[OAT Social AI] Gemini returned no text:", {
        finishReason: candidate?.finishReason || "none",
        blockReason: data?.promptFeedback?.blockReason || "none"
      });
      return jsonError(candidate?.finishReason === "SAFETY" || data?.promptFeedback?.blockReason
        ? "Gemini could not generate content for this brief. Please adjust the wording."
        : "Gemini returned no text. Please try a shorter or more specific brief.", 502);
    }

    return NextResponse.json({ content, provider: "gemini", model }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Gemini request failed:", error instanceof Error ? error.name : "unknown");
    return jsonError("Gemini request timed out or could not be reached. Please try again.", 502);
  }
}
