import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/ai-bot/config";
import { getDatabaseLead, insertDatabaseCallSession, listDatabaseCallSessions } from "@/lib/ai-bot/database-store";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { getLead, addCallSession, listCallSessions } from "@/lib/ai-bot/store";
import { getVoiceProvider } from "@/lib/ai-bot/voice";
import type { CallRequest, CallSession } from "@/lib/ai-bot/types";
import { processConversationTurn } from "@/lib/ai-bot/orchestrator";

const databaseMode = () => isSupabaseConfigured() && Boolean(getSupabaseWorkspaceId());

export async function GET() {
  if (databaseMode()) {
    try {
      return NextResponse.json({ ok: true, source: "supabase", sessions: await listDatabaseCallSessions() });
    } catch (error) {
      return NextResponse.json(
        { ok: false, source: "supabase", error: error instanceof Error ? error.message : "Unable to load call sessions" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, source: "demo_adapter", sessions: listCallSessions() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<CallRequest> | null;
  if (!body?.leadId || !body.employeeId || !body.phone) {
    return NextResponse.json(
      { ok: false, error: "leadId, employeeId and phone are required" },
      { status: 400 },
    );
  }

  const lead = databaseMode() ? await getDatabaseLead(body.leadId) : getLead(body.leadId);
  const employee = getEmployee(body.employeeId);
  if (!lead) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  if (!employee) return NextResponse.json({ ok: false, error: "AI employee not found" }, { status: 404 });

  try {
    const session = await getVoiceProvider().placeCall(body as CallRequest);
    if (databaseMode()) {
      await insertDatabaseCallSession(session);
    } else {
      addCallSession(session);
    }
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    const session: CallSession = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      employeeId: employee.id,
      status: "failed",
      provider: getVoiceProvider().name,
    };

    if (databaseMode()) {
      await insertDatabaseCallSession(session).catch(() => undefined);
    } else {
      addCallSession(session);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to place call",
        session,
      },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.employeeId || !body?.leadId || typeof body?.text !== "string") {
    return NextResponse.json(
      { ok: false, error: "employeeId, leadId and text are required" },
      { status: 400 },
    );
  }

  try {
    const result = processConversationTurn(
      {
        employeeId: body.employeeId,
        leadId: body.leadId,
        phone: body.phone ?? "",
        purpose: body.purpose ?? "qualification",
      },
      body.text,
      body.previous,
      Boolean(body.completed),
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Conversation processing failed" },
      { status: 500 },
    );
  }
}
