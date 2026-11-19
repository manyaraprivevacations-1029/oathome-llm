import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Frame = { second: number; image: string };
type Highlight = { start: number; end: number; title: string; reason: string; score: number; caption: string };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

async function authenticate(request: NextRequest) {
  const value = request.headers.get("authorization") || "";
  const token = /^Bearer\s+/i.test(value) ? value.replace(/^Bearer\s+/i, "").trim() : "";
  const url = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY?.trim();
  if (!token || !url || !key) return false;
  try {
    const result = await fetch(url.replace(/\/+$/, "") + "/auth/v1/user", {
      headers: { apikey: key, Authorization: "Bearer " + token },
      cache: "no-store", signal: AbortSignal.timeout(10000)
    });
    return result.ok;
  } catch { return false; }
}

function validFrames(input: unknown): Frame[] | null {
  if (!Array.isArray(input) || input.length < 2 || input.length > 32) return null;
  const result: Frame[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const frame = item as Record<string, unknown>;
    const second = Number(frame.second);
    const image = frame.image;
    if (!Number.isFinite(second) || second < 0 || typeof image !== "string" ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 165000) return null;
    result.push({ second, image });
  }
  return result.sort((a,b) => a.second - b.second);
}

export async function POST(request: NextRequest) {
  if (!(await authenticate(request))) return fail("Sign in to OAT Social AI to analyze videos.", 401);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 5500000) return fail("Video analysis sample is too large; use fewer frames.", 413);
    body = JSON.parse(text) as Record<string, unknown>;
  } catch { return fail("Invalid analysis request.", 400); }

  const frames = validFrames(body.frames);
  const duration = Number(body.duration);
  const count = Math.max(1, Math.min(10, Number(body.count) || 3));
  const length = Math.max(8, Math.min(60, Number(body.length) || 30));
  const focus = typeof body.focus === "string" ? body.focus.slice(0,400) : "";
  if (!frames || !Number.isFinite(duration) || duration <= 2 || duration > 21600 ||
      frames.some(f => f.second >= duration + .5)) return fail("Please load a valid video and sample it again.", 400);
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return fail("GEMINI_API_KEY is not configured on Vercel.", 503);

  const manifest = frames.map((f,i) => "Frame " + (i+1) + " at " + f.second.toFixed(1) + " seconds").join("; ");
  const prompt = [
    "You are an expert short-form video editor for OAT Social AI, a travel brand targeting Telugu and English audiences.",
    "Analyze ONLY the provided sequential video frames (there is no audio). Identify genuinely eye-catching scenic/action changes and strong visual moments.",
    "Provide exactly " + count + " distinct highlight windows of roughly " + length + " seconds each within the " + duration.toFixed(1) + "-second source.",
    "Avoid unnecessary overlaps wherever video duration allows. Prefer scenes with action, beautiful destinations, people, and strong first seconds.",
    "This is VISUAL-ONLY analysis. Never claim to have heard dialogue or detected speech. Never invent destination names, package details, or prices.",
    "Focus: " + (focus || "travel reels, hooks, and visually compelling moments") + ".",
    "Frame timestamps: " + manifest + ".",
    "Respond with ONE JSON object: {\"clips\":[{\"start\":number,\"end\":number,\"title\":string,\"reason\":string,\"score\":number,\"caption\":string}]}",
    "All timecodes in seconds, score 1 to 100. Captions must describe visible evidence only. No markdown."
  ].join("\n");

  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [{ text: prompt }];
  frames.forEach((frame,i) => {
    parts.push({ text: "Frame " + (i+1) + " at " + frame.second.toFixed(1) + " seconds" });
    parts.push({ inline_data: { mime_type: "image/jpeg", data: frame.image.split(",")[1] } });
  });
  const configured = process.env.GEMINI_TEXT_MODEL?.trim();
  const models = [...new Set([configured, "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"].filter((m): m is string => Boolean(m)))].filter(m => /^[a-z0-9.-]{3,64}$/.test(m));
  for (const model of models) {
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: .25, maxOutputTokens: 2400, responseMimeType: "application/json" }
        }),
        cache: "no-store", signal: AbortSignal.timeout(48000)
      });
      if (response.status === 404 || response.status === 503) continue;
      if (response.status === 429) return fail("Gemini API quota or rate limit reached. Try again later.", 429);
      if (response.status === 401 || response.status === 403) return fail("Gemini API key is not authorized for this model.", 503);
      if (!response.ok) return fail("Gemini analysis failed (HTTP " + response.status + "). Try fewer frames or another model.", 502);
      const data = await response.json() as { candidates?: Array<{content?: {parts?: Array<{text?: string}>}} > };
      const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
      const parsed = JSON.parse(raw.replace(/^\x60\x60\x60(?:json)?/i,"").replace(/\x60\x60\x60$/,"").trim()) as { clips?: unknown[] };
      if (!Array.isArray(parsed.clips)) return fail("Gemini did not return valid clip suggestions. Retry analysis.",502);
      const clips: Highlight[] = parsed.clips.slice(0,count).map((entry) => {
        const item = entry && typeof entry === "object" ? entry as Record<string,unknown> : {};
        const start = Math.max(0,Math.min(duration - .5,Number(item.start) || 0));
        const end = Math.min(duration,Math.max(start+.5, Number(item.end) || start + length));
        return {
          start: Number(start.toFixed(2)), end: Number(end.toFixed(2)),
          title: String(item.title || "Visual highlight").slice(0,100),
          reason: String(item.reason || "Promising visual moment").slice(0,300),
          caption: String(item.caption || "").slice(0,280),
          score: Math.max(1,Math.min(100,Math.round(Number(item.score)||70)))
        };
      });
      if (!clips.length) return fail("Gemini returned no highlights. Try different footage.",502);
      return NextResponse.json({ clips, model, analysis: "visual-frames-only" },{ headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("[autoclip] Gemini video highlight analysis error", { model, reason: error instanceof Error ? error.message : "unknown" });
    }
  }
  return fail("Gemini analysis is unavailable. Check the configured model and retry.", 502);
}
