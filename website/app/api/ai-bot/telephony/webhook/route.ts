import { NextResponse } from "next/server";
import { normalizeCallStatus, type NormalizedCallEvent } from "@/lib/ai-bot/call-events";
import {
  findDatabaseCallSessionByProviderId,
  insertDatabaseCallEvent,
  insertDatabaseTranscriptLines,
  updateDatabaseCallSessionFromProvider,
  updateDatabaseLeadLastContact,
} from "@/lib/ai-bot/database-store";

type VapiPayload = {
  message?: Record<string, unknown>;
  [key: string]: unknown;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? value as Record<string, any> : {};
}

function providerCallId(call: Record<string, any>): string {
  return String(call.id ?? call.callId ?? call.CallSid ?? "");
}

function isoFrom(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function recordingUrl(message: Record<string, any>, call: Record<string, any>): string | undefined {
  const artifact = asRecord(message.artifact);
  const recording = asRecord(artifact.recording);
  const candidates = [
    recording.url,
    recording.stereoUrl,
    recording.monoUrl,
    message.recordingUrl,
    call.recordingUrl,
  ];
  return candidates.find((value) => typeof value === "string" && value.length > 0);
}

function transcriptLines(message: Record<string, any>) {
  const artifact = asRecord(message.artifact);
  const messages = Array.isArray(artifact.messages) ? artifact.messages : [];
  return messages
    .map((item, index) => {
      const row = asRecord(item);
      const role = String(row.role ?? "").toLowerCase();
      const text = String(row.message ?? row.content ?? row.transcript ?? "").trim();
      if (!text) return null;
      const speaker = role === "assistant" ? "ai" : role === "user" ? "customer" : "system";
      return { speaker, text, sequence: index + 1 };
    })
    .filter(Boolean) as Array<{speaker: "ai" | "customer" | "system"; text: string; sequence: number}>;
}

function summaryFrom(message: Record<string, any>): string | undefined {
  const analysis = asRecord(message.analysis);
  const artifact = asRecord(message.artifact);
  const summary = analysis.summary ?? artifact.summary ?? message.summary;
  return typeof summary === "string" && summary.trim() ? summary.trim() : undefined;
}

function scoreFrom(message: Record<string, any>): number | undefined {
  const analysis = asRecord(message.analysis);
  const score = Number(analysis.score ?? message.score);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : undefined;
}

export async function POST(request: Request) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-vapi-webhook-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as VapiPayload | null;
  const message = asRecord(payload?.message);
  const call = asRecord(message.call ?? payload?.call);
  const type = String(message.type ?? payload?.type ?? "unknown");
  const id = providerCallId(call);

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing Vapi call ID." }, { status: 400 });
  }

  const provider = "vapi";
  const rawStatus = String(message.status ?? call.status ?? "");
  const event: NormalizedCallEvent = {
    provider,
    providerCallId: id,
    status: normalizeCallStatus(rawStatus || (type === "end-of-call-report" ? "ended" : "queued")),
    direction: String(call.type ?? call.direction ?? "").toLowerCase().includes("inbound") ? "inbound" : "outbound",
    from: call.customer?.number ?? call.from,
    to: call.phoneNumber?.number ?? call.destination?.number ?? call.to,
    timestamp: new Date().toISOString(),
    durationSeconds: Number(call.durationSeconds ?? call.duration ?? 0) || undefined,
    recordingUrl: recordingUrl(message, call),
    raw: payload,
  };

  try {
    const session = await findDatabaseCallSessionByProviderId(id);

    if (session) {
      await insertDatabaseCallEvent({
        callSessionId: session.id,
        eventType: type,
        status: rawStatus || event.status,
        payload,
      });

      if (type === "status-update") {
        const status = normalizeCallStatus(rawStatus);
        const now = new Date().toISOString();
        await updateDatabaseCallSessionFromProvider({
          providerCallId: id,
          status,
          startedAt: status === "in_progress" && !session.started_at ? now : undefined,
          endedAt: status === "completed" || status === "failed" || status === "no_answer" ? now : undefined,
          fromNumber: event.from,
          toNumber: event.to,
        });
      }

      if (type === "transcript") {
        const text = String(message.transcript ?? "").trim();
        if (text && String(message.transcriptType ?? "final") === "final") {
          const role = String(message.role ?? "").toLowerCase();
          await insertDatabaseTranscriptLines(session.id, [{
            speaker: role === "assistant" ? "ai" : role === "user" ? "customer" : "system",
            text,
            language: typeof message.language === "string" ? message.language : undefined,
            sequence: Number(message.turn ?? Date.now()),
          }]);
        }
      }

      if (type === "end-of-call-report") {
        const artifact = asRecord(message.artifact);
        const recording = recordingUrl(message, call);
        const duration = Number(call.durationSeconds ?? call.duration ?? 0) || undefined;
        const summary = summaryFrom(message);
        const score = scoreFrom(message);
        await updateDatabaseCallSessionFromProvider({
          providerCallId: id,
          status: "completed",
          endedAt: isoFrom(call.endedAt) ?? new Date().toISOString(),
          durationSeconds: duration,
          recordingUrl: recording,
          summary,
          score,
          outcome: typeof message.endedReason === "string" ? message.endedReason : undefined,
        });

        const lines = transcriptLines(message);
        if (lines.length) {
          await insertDatabaseTranscriptLines(session.id, lines);
        }
        await updateDatabaseLeadLastContact(session.lead_id);
      }
    }

    return NextResponse.json({
      ok: true,
      accepted: true,
      type,
      event,
      persisted: Boolean(session),
    });
  } catch (error) {
    console.error("Vapi webhook persistence failed", error);
    return NextResponse.json({
      ok: false,
      accepted: true,
      persisted: false,
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    }, { status: 500 });
  }
}
