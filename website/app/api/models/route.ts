import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function baseUrl() {
  const configured = process.env.OATHOME_LLM_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV !== "production" ? "http://127.0.0.1:11434" : "";
}
function authorized(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.OATHOME_LLM_ACCESS_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function headers() {
  const result: Record<string, string> = { "content-type": "application/json" };
  const token = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
  if (token) result.authorization = `Bearer ${token}`;
  return result;
}
function authError() {
  return NextResponse.json({ error: process.env.OATHOME_LLM_ACCESS_TOKEN ? "Unauthorized." : "Production access is not configured." }, { status: process.env.OATHOME_LLM_ACCESS_TOKEN ? 401 : 503 });
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return authError();
  const base = baseUrl();
  if (!base) return NextResponse.json({ error: "OATHOME_LLM_BASE_URL is not configured." }, { status: 503 });
  try {
    const response = await fetch(`${base}/api/tags`, { headers: process.env.OATHOME_LLM_UPSTREAM_TOKEN ? { authorization: `Bearer ${process.env.OATHOME_LLM_UPSTREAM_TOKEN}` } : {}, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return NextResponse.json({ error: `Runtime returned HTTP ${response.status}.` }, { status: 502 });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not reach the model runtime." }, { status: 502 }); }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return authError();
  const base = baseUrl();
  if (!base) return NextResponse.json({ error: "OATHOME_LLM_BASE_URL is not configured." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const model = body && typeof body === "object" ? (body as { model?: unknown }).model : undefined;
  if (typeof model !== "string" || model.length > 200 || !/^[\w.:-]+(?:\/[\w.:-]+)?$/.test(model.trim())) return NextResponse.json({ error: "Enter a valid model name, such as qwen2.5:3b." }, { status: 400 });
  try {
    const response = await fetch(`${base}/api/pull`, { method: "POST", headers: headers(), body: JSON.stringify({ name: model.trim(), stream: false }), signal: AbortSignal.timeout(290000) });
    const text = await response.text();
    if (!response.ok) return NextResponse.json({ error: text.slice(0, 500) || `Runtime returned HTTP ${response.status}.` }, { status: 502 });
    return NextResponse.json({ ok: true, message: `Model ${model.trim()} downloaded successfully.` });
  } catch { return NextResponse.json({ error: "Model download failed or timed out. Check the runtime and try again." }, { status: 502 }); }
}
export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return authError();
  const base = baseUrl();
  if (!base) return NextResponse.json({ error: "OATHOME_LLM_BASE_URL is not configured." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const model = body && typeof body === "object" ? (body as { model?: unknown }).model : undefined;
  if (typeof model !== "string" || model.length > 200 || !/^[\w.:-]+(?:\/[\w.:-]+)?$/.test(model.trim())) return NextResponse.json({ error: "Choose a valid model." }, { status: 400 });
  try {
    const response = await fetch(`${base}/api/delete`, { method: "DELETE", headers: headers(), body: JSON.stringify({ name: model.trim() }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) return NextResponse.json({ error: (await response.text()).slice(0, 500) || "Could not delete model." }, { status: 502 });
    return NextResponse.json({ ok: true, message: `Model ${model.trim()} removed.` });
  } catch { return NextResponse.json({ error: "Could not reach the model runtime." }, { status: 502 }); }
}
