import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function runtimeBaseUrl() {
  const configured = process.env.OATHOME_LLM_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? null : "http://127.0.0.1:11434";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.model !== "string" ||
    body.model.trim().length === 0 ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > 100 ||
    !body.messages.every((message: unknown) =>
      typeof message === "object" &&
      message !== null &&
      ["system", "user", "assistant"].includes((message as ChatMessage).role) &&
      typeof (message as ChatMessage).content === "string" &&
      (message as ChatMessage).content.length <= 20000
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Provide a model and 1–100 valid chat messages." },
      { status: 400 },
    );
  }

  // Never expose an unprotected public inference endpoint by default.
  const accessToken = process.env.OATHOME_LLM_ACCESS_TOKEN;
  if (process.env.NODE_ENV === "production" && !accessToken) {
    return NextResponse.json(
      { ok: false, error: "Inference is disabled until OATHOME_LLM_ACCESS_TOKEN is configured." },
      { status: 503 },
    );
  }
  if (accessToken && request.headers.get("authorization") !== `Bearer ${accessToken}`) {
    return NextResponse.json({ ok: false, error: "Invalid or missing access token." }, { status: 401 });
  }

  const baseUrl = runtimeBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Set OATHOME_LLM_BASE_URL to your OATHome inference server." },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: body.model.trim(),
        messages: body.messages,
        stream: false,
        options: body.options && typeof body.options === "object" ? body.options : undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });

    const data = await upstream.json().catch(() => null) as
      | { message?: { content?: string }; error?: string; done?: boolean; model?: string }
      | null;
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error ?? `Inference server returned HTTP ${upstream.status}.` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }
    if (typeof data?.message?.content !== "string") {
      return NextResponse.json(
        { ok: false, error: "The inference server returned an unexpected response." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      model: data.model ?? body.model.trim(),
      message: data.message.content,
      done: data.done ?? true,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Inference request failed or timed out. Check the model and server logs." },
      { status: 502 },
    );
  }
}
