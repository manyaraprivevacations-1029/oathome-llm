import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const headers = { "Cache-Control": "no-store" };
// Best-effort concurrency guard per server instance. Provider quotas remain the hard limit.
const running = new Set<string>();
function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers });
}
async function session(request: NextRequest): Promise<string | NextResponse> {
  const authorization = request.headers.get("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim();
  if (!token) return fail("Please sign in to OAT Social AI before generating an image.", 401);
  const url = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return fail("Social AI authentication is not configured.", 503);
  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store", signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return fail("Your session expired. Please sign in again.", 401);
    const user = await response.json();
    if (typeof user?.id !== "string" || !user.id) return fail("Please sign in again.", 401);
    return user.id;
  } catch { return fail("Could not verify your session. Please try again.", 503); }
}
function configured() {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim() && /^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || ""));
}
export async function GET(request: NextRequest) {
  const user = await session(request);
  if (typeof user !== "string") return user;
  return NextResponse.json({ configured: configured(), provider: "Cloudflare Workers AI", model: MODEL }, { headers });
}
export async function POST(request: NextRequest) {
  const user = await session(request);
  if (typeof user !== "string") return user;
  if (Number(request.headers.get("content-length")) > 10000) return fail("The image brief is too long.", 413);
  let body: unknown;
  try { body = await request.json(); } catch { return fail("The image request must be valid JSON.", 400); }
  const value = body as { prompt?: unknown; format?: unknown } | null;
  if (typeof value?.prompt !== "string" || !value.prompt.trim()) return fail("Add an image prompt first.", 400);
  if (value.prompt.length > 1600) return fail("Shorten the image prompt to 1,600 characters or fewer.", 413);
  if (!["1:1", "4:5", "9:16"].includes(String(value.format))) return fail("Choose a supported image format.", 400);
  if (!configured()) return fail("Image generation needs Cloudflare setup. Your workspace owner must configure the image service and redeploy.", 503);
  if (running.has(user)) return fail("An image is already being generated. Wait for it to finish.", 429);
  running.add(user);
  try {
    // Fixed free-allocation eligible model; never fall back to a paid model or enable billing.
    const prompt = `${value.prompt.trim()}\nPhotorealistic travel editorial scene, lifelike faces, natural skin texture and realistic hands. Preserve the exact requested action and its distinctive props. Keep the main subject centered with generous safe margins for a ${value.format} crop. Fill the frame with the scene; leave only modest quiet space for optional typography. No text, prices, watermarks or invented brand logos. No generic replacement subject or oversized empty sky.`;
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID!.trim()}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN!.trim()}` },
      body: JSON.stringify({ prompt, steps: 4 }),
      cache: "no-store", signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
      // Never relay provider response bodies; they can contain account details.
      if (response.status === 429) return fail("Cloudflare's free allowance or capacity limit was reached. Try later; no paid fallback was used.", 429);
      if ([401,403].includes(response.status)) return fail("Cloudflare rejected the image-service credentials. Ask the workspace owner to verify Workers AI permissions.", 503);
      if (response.status === 400) return fail("Cloudflare could not accept this image brief. Adjust the prompt and try again.", 422);
      return fail("The image service is temporarily unavailable. Your existing artwork is unchanged.", 502);
    }
    const payload = await response.json() as { success?: boolean; result?: { image?: unknown }; errors?: Array<{code?:number}> };
    if (payload.errors?.some(e => e.code === 3036 || e.code === 3040)) return fail("Cloudflare's free allowance or capacity limit was reached. Try later; no paid fallback was used.", 429);
    const image = payload.result?.image;
    if (payload.success === false || typeof image !== "string" || !image || image.length > 3500000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return fail("The image service returned no usable image. Try again.", 502);
    const bytes = Buffer.from(image, "base64");
    const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg"
      : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" : "";
    if (!mime) return fail("The image service returned an unsupported image format.", 502);
    return NextResponse.json({ image: `data:${mime};base64,${image}`, provider: "Cloudflare Workers AI", model: MODEL }, { headers });
  } catch {
    return fail("Image generation timed out or could not finish. Try again; your existing artwork is unchanged.", 504);
  } finally { running.delete(user); }
}
