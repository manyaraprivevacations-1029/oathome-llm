import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_MODEL = process.env.OATHOME_LLM_MODEL || "";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 24000;
const MAX_TOTAL_CHARS = 100000;

function ollamaBaseUrl() {
  const configured = process.env.OATHOME_LLM_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:11434";
  return "";
}

function isAuthorized(request: NextRequest): boolean {
  // Local development stays convenient; production is closed unless explicitly configured.
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.OATHOME_LLM_ACCESS_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function authError() {
  if (!process.env.OATHOME_LLM_ACCESS_TOKEN?.trim()) {
    return NextResponse.json({ error: "Production access is not configured. Set OATHOME_LLM_ACCESS_TOKEN in your hosting environment." }, { status: 503 });
  }
  return NextResponse.json({ error: "Enter the OATHome access token to use this runtime." }, { status: 401 });
}

function upstreamHeaders() {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return authError();
  const baseUrl = ollamaBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "OATHOME_LLM_BASE_URL is not configured for production.", models: [] }, { status: 503 });
  }
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      headers: process.env.OATHOME_LLM_UPSTREAM_TOKEN ? { authorization: `Bearer ${process.env.OATHOME_LLM_UPSTREAM_TOKEN}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return NextResponse.json({ error: `Ollama returned HTTP ${response.status}.`, models: [] }, { status: 502 });
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models.map((item: { name?: string; size?: number; details?: { parameter_size?: string; family?: string } }) => ({
      name: item.name, size: item.size, details: item.details,
    })).filter((item: { name?: string }) => typeof item.name === "string") : [];
    return NextResponse.json({ models, defaultModel: DEFAULT_MODEL || models[0]?.name || "" }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Ollama. Check the runtime URL and network access.", models: [] }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return authError();
  const baseUrl = ollamaBaseUrl();
  if (!baseUrl) return NextResponse.json({ error: "OATHOME_LLM_BASE_URL is not configured for production." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const payload = body as { model?: unknown; messages?: unknown };
  const model = typeof payload.model === "string" ? payload.model.trim() : "";
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!model || model.length > 200 || !/^[\w.:-]+(?:[\w.:-]*)(?:\/[\w.:-]+)?$/.test(model)) {
    return NextResponse.json({ error: "Choose a valid installed model." }, { status: 400 });
  }
  if (!messages.length || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_MESSAGES} messages.` }, { status: 400 });
  }

  let totalChars = 0;
  const safeMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  for (const entry of messages) {
    if (!entry || typeof entry !== "object") return NextResponse.json({ error: "Invalid message format." }, { status: 400 });
    const message = entry as { role?: unknown; content?: unknown };
    if (!["user", "assistant", "system"].includes(String(message.role)) || typeof message.content !== "string") {
      return NextResponse.json({ error: "Each message needs a supported role and text content." }, { status: 400 });
    }
    if (message.content.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: "A message is too long." }, { status: 413 });
    totalChars += message.content.length;
    if (totalChars > MAX_TOTAL_CHARS) return NextResponse.json({ error: "Conversation is too large. Start a new chat." }, { status: 413 });
    safeMessages.push({ role: message.role as "system" | "user" | "assistant", content: message.content });
  }

  try {
    const upstream = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: JSON.stringify({ model, messages: safeMessages, stream: true }),
      cache: "no-store",
      signal: request.signal,
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json({ error: detail.slice(0, 500) || `Ollama returned HTTP ${upstream.status}.` }, { status: upstream.status >= 400 && upstream.status < 500 ? 400 : 502 });
    }
    if (!upstream.body) return NextResponse.json({ error: "The model returned no response stream." }, { status: 502 });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return NextResponse.json({ error: "Generation was cancelled." }, { status: 499 });
    return NextResponse.json({ error: "Could not reach the model runtime. Check that Ollama is running and accessible to this server." }, { status: 502 });
  }
}
