import { NextResponse } from "next/server";
import {
  findDatabaseCallSessionByProviderId,
  insertDatabaseCallEvent,
  insertDatabaseCallSession,
  insertDatabaseTranscriptLines,
  updateDatabaseCallSessionFromProvider,
  updateDatabaseLeadLastContact,
} from "@/lib/ai-bot/database-store";
import { getSupabaseAdmin, getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { normalizeCallStatus, type NormalizedCallEvent } from "@/lib/ai-bot/call-events";
import type { CallSession } from "@/lib/ai-bot/types";

function authorized(request: Request) {
  const expected =
    process.env.VAPI_WEBHOOK_SECRET ??
    process.env.VOICE_WEBHOOK_SECRET ??
    process.env.AI_BOT_API_SECRET;

  if (!expected) return true;

  const vapiSecret = request.headers.get("x-vapi-secret");
  if (vapiSecret === expected) return true;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${expected}`;
}

function extractVapiCall(payload: any) {
  return payload?.message?.call ?? payload?.call ?? null;
}

function extractVapiStatus(payload: any) {
  const message = payload?.message ?? {};
  const value = message?.status ?? message?.call?.status ?? message?.call?.endedReason;
  if (typeof value === "string") return value;
  if (message?.type === "end-of-call-report") return "completed";
  return undefined;
}

function extractVapiContext(payload: any) {
  const call = extractVapiCall(payload);
  const metadata = call?.metadata ?? payload?.message?.metadata ?? payload?.metadata ?? {};
  const variableValues =
    call?.assistantOverrides?.variableValues ??
    call?.metadata?.variableValues ??
    payload?.message?.assistantOverrides?.variableValues ??
    {};

  return {
    leadId: metadata?.leadId ?? metadata?.lead_id ?? variableValues?.leadId ?? variableValues?.lead_id,
    employeeId:
      metadata?.employeeId ??
      metadata?.employee_id ??
      variableValues?.employeeId ??
      variableValues?.employee_id ??
      "ananya",
  };
}

function extractArtifact(payload: any) {
  return payload?.message?.artifact ?? payload?.artifact ?? null;
}

function extractTranscriptLines(payload: any) {
  const artifact = extractArtifact(payload);
  const messages = Array.isArray(artifact?.messages) ? artifact.messages : [];

  return messages
    .map((item: any, index: number) => {
      const role = String(item?.role ?? "").toLowerCase();
      const text =
        typeof item?.message === "string"
          ? item.message
          : typeof item?.content === "string"
            ? item.content
            : Array.isArray(item?.content)
              ? item.content
                  .map((part: any) =>
                    typeof part === "string" ? part : typeof part?.text === "string" ? part.text : "",
                  )
                  .filter(Boolean)
                  .join(" ")
              : "";

      if (!text) return null;

      const speaker = role === "assistant" ? "ai" : role === "user" ? "customer" : "system";
      return {
        speaker: speaker as "ai" | "customer" | "system",
        text,
        language: undefined,
        sequence: index,
      };
    })
    .filter(Boolean) as Array<{
      speaker: "ai" | "customer" | "system";
      text: string;
      language?: string;
      sequence: number;
    }>;
}

function extractRecordingUrl(payload: any) {
  const artifact = extractArtifact(payload);
  return artifact?.recording?.url ?? artifact?.recordingUrl ?? payload?.message?.recordingUrl ?? payload?.recordingUrl;
}

function extractSummary(payload: any) {
  const message = payload?.message ?? {};
  const call = extractVapiCall(payload);
  return message?.analysis?.summary ?? call?.analysis?.summary ?? message?.summary ?? call?.summary ?? undefined;
}

function extractOutcome(payload: any) {
  const message = payload?.message ?? {};
  const call = extractVapiCall(payload);
  return message?.endedReason ?? call?.endedReason ?? message?.status ?? call?.status ?? undefined;
}

function extractDurationSeconds(payload: any) {
  const call = extractVapiCall(payload);
  const candidates = [call?.duration, call?.durationSeconds, payload?.message?.duration, payload?.duration];

  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.round(number);
  }

  const started = Date.parse(call?.startedAt ?? "");
  const ended = Date.parse(call?.endedAt ?? "");
  if (Number.isFinite(started) && Number.isFinite(ended) && ended > started) {
    return Math.round((ended - started) / 1000);
  }

  return undefined;
}

async function persistVapiMessage(payload: any) {
  if (!isSupabaseConfigured() || !getSupabaseWorkspaceId()) {
    return { persisted: false, reason: "supabase_not_configured" };
  }

  const call = extractVapiCall(payload);
  const providerCallId = String(call?.id ?? "");
  if (!providerCallId) return { persisted: false, reason: "missing_provider_call_id" };

  const message = payload?.message ?? {};
  const eventType = String(message?.type ?? "unknown");
  const status = extractVapiStatus(payload);
  const context = extractVapiContext(payload);

  let session = await findDatabaseCallSessionByProviderId(providerCallId);

  // Browser/Talk calls may not have been created through our /calls endpoint.
  // If our lead metadata is present, create the missing database session here.
  if (!session && context.leadId) {
    const created: CallSession = {
      id: crypto.randomUUID(),
      leadId: String(context.leadId),
      employeeId: String(context.employeeId),
      status: status ? normalizeCallStatus(status) : "queued",
      provider: "vapi",
      providerCallId,
      startedAt: call?.startedAt ?? undefined,
      endedAt: call?.endedAt ?? undefined,
    };
    await insertDatabaseCallSession(created);
    session = await findDatabaseCallSessionByProviderId(providerCallId);
  }

  if (!session) {
    return {
      persisted: false,
      reason: "call_session_not_found_and_no_lead_id",
      providerCallId,
      eventType,
    };
  }

  await insertDatabaseCallEvent({
    callSessionId: session.id,
    eventType,
    status,
    payload,
    occurredAt: message?.timestamp ?? call?.endedAt ?? call?.startedAt ?? new Date().toISOString(),
  });

  const endedAt =
    call?.endedAt ?? (eventType === "end-of-call-report" ? new Date().toISOString() : undefined);

  await updateDatabaseCallSessionFromProvider({
    providerCallId,
    status: status ? normalizeCallStatus(status) : undefined,
    startedAt: call?.startedAt,
    endedAt,
    durationSeconds: extractDurationSeconds(payload),
    recordingUrl: extractRecordingUrl(payload),
    summary: extractSummary(payload),
    outcome: extractOutcome(payload),
    fromNumber: call?.customer?.number ?? call?.fromNumber,
    toNumber: call?.phoneNumber?.number ?? call?.toNumber,
  });

  if (eventType === "end-of-call-report") {
    const lines = extractTranscriptLines(payload);
    if (lines.length) await insertDatabaseTranscriptLines(session.id, lines);
    await updateDatabaseLeadLastContact(session.lead_id, endedAt);
  }

  return {
    persisted: true,
    callSessionId: session.id,
    providerCallId,
    eventType,
    transcriptSaved: eventType === "end-of-call-report" && extractTranscriptLines(payload).length > 0,
  };
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  // Vapi server messages use { message: { type, call, ... } }.
  if (payload?.message?.type) {
    const call = extractVapiCall(payload);
    const providerCallId = String(call?.id ?? "");
    const status = extractVapiStatus(payload);

    try {
      const persistence = await persistVapiMessage(payload);
      return NextResponse.json({
        ok: true,
        provider: "vapi",
        messageType: String(payload.message.type),
        accepted: Boolean(providerCallId),
        providerCallId: providerCallId || undefined,
        status: status ? normalizeCallStatus(status) : undefined,
        persistence,
      });
    } catch (error) {
      console.error("AI bot Vapi webhook persistence failed", error);
      return NextResponse.json({
        ok: true,
        provider: "vapi",
        messageType: String(payload.message.type),
        accepted: Boolean(providerCallId),
        providerCallId: providerCallId || undefined,
        persistence: { persisted: false, reason: "persistence_error" },
      });
    }
  }

  const rawStatus =
    typeof payload.status === "string"
      ? payload.status
      : typeof payload.CallStatus === "string"
        ? payload.CallStatus
        : "failed";

  const event: NormalizedCallEvent = {
    provider: process.env.VOICE_PROVIDER ?? "unknown",
    providerCallId: String(payload.callId ?? payload.CallSid ?? ""),
    status: normalizeCallStatus(rawStatus),
    direction: payload.direction === "inbound" ? "inbound" : "outbound",
    from: payload.from ?? payload.From,
    to: payload.to ?? payload.To,
    timestamp: new Date().toISOString(),
    durationSeconds: Number(payload.duration ?? payload.Duration ?? 0) || undefined,
    recordingUrl: payload.recordingUrl ?? payload.RecordingUrl,
    raw: payload,
  };

  return NextResponse.json({ ok: true, accepted: Boolean(event.providerCallId), event });
}
