import { NextResponse } from "next/server";
import { getTelephonyProvider } from "@/lib/ai-bot/telephony";
import { getDatabaseLead, insertDatabaseCallSession } from "@/lib/ai-bot/database-store";
import { getLead, addCallSession } from "@/lib/ai-bot/store";
import type { CallRequest } from "@/lib/ai-bot/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<CallRequest> | null;

  if (!body?.leadId || !body.employeeId || !body.phone) {
    return NextResponse.json(
      { ok: false, error: "leadId, employeeId and phone are required" },
      { status: 400 },
    );
  }

  const memoryLead = getLead(body.leadId);
  let databaseLead;

  if (!memoryLead) {
    try {
      databaseLead = await getDatabaseLead(body.leadId);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to load lead",
        },
        { status: 500 },
      );
    }
  }

  if (!memoryLead && !databaseLead) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  try {
    const session = await getTelephonyProvider().createOutboundCall(
      body as CallRequest,
      {
        provider: process.env.VOICE_PROVIDER ?? "not_configured",
        fromNumber: process.env.VOICE_FROM_NUMBER,
        webhookBaseUrl: process.env.VOICE_WEBHOOK_BASE_URL,
      },
    );

    addCallSession(session);
    try {
      await insertDatabaseCallSession(session);
    } catch (databaseError) {
      console.error("Unable to persist outbound call session", databaseError);
      return NextResponse.json({ ok: false, error: databaseError instanceof Error ? databaseError.message : "Unable to persist call session." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create outbound call",
      },
      { status: 503 },
    );
  }
}
