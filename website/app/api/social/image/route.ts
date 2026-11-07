import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function verifySocialSession(request: NextRequest): Promise<NextResponse | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return jsonError("Please sign in to OAT Social AI before generating images.", 401);

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

export async function POST(request: NextRequest) {
  const authError = await verifySocialSession(request);
  if (authError) return authError;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
  const prompt = body && typeof body === "object" ? (body as { prompt?: unknown }).prompt : undefined;
  if (typeof prompt !== "string" || !prompt.trim()) return jsonError("Describe the image you want to create.", 400);
  if (prompt.length > 2048) return jsonError("The image prompt must be 2,048 characters or fewer.", 413);

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) return jsonError("Cloudflare Workers AI is not configured yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the OAT Social AI server environment.", 503);

  const model = process.env.CLOUDFLARE_IMAGE_MODEL?.trim() || "@cf/black-forest-labs/flux-1-schnell";

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(model)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), steps: 4 }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000)
    });

    const payload = await response.json().catch(() => null) as {
      success?: boolean;
      errors?: Array<{ message?: string; code?: number }>;
      result?: { image?: unknown };
    } | null;

    if (!response.ok || payload?.success === false) {
      const code = payload?.errors?.[0]?.code;
      console.error("[OAT Social AI] Cloudflare image generation failed:", response.status, code || "unknown");
      if (response.status === 429) return jsonError("Cloudflare's AI usage limit has been reached. Please try again after the daily allowance resets.", 429);
      if (response.status === 401 || response.status === 403) return jsonError("Cloudflare rejected the AI credentials. Check the Workers AI token and account ID in the server settings.", 503);
      return jsonError("Cloudflare could not generate this image. Please try a simpler prompt.", 502);
    }

    const image = payload?.result?.image;
    if (typeof image !== "string" || !image) return jsonError("The image model returned no image. Please try again.", 502);

    return NextResponse.json({
      image: `data:image/jpeg;base64,${image}`,
      provider: "cloudflare",
      model
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Cloudflare image generation failed:", error instanceof Error ? error.message : String(error));
    return jsonError("Cloudflare image generation timed out or could not be reached. Please try again.", 502);
  }
}
