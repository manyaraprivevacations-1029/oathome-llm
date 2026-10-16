import { NextResponse } from "next/server";
import { processConversationTurn } from "@/lib/ai-bot/orchestrator";

export async function POST(request: Request) {
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
