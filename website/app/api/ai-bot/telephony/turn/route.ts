import { NextResponse } from "next/server";
import { handleCallTurn } from "@/lib/ai-bot/call-control";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.employeeId || !body?.leadId) {
    return NextResponse.json(
      { ok: false, error: "employeeId and leadId are required" },
      { status: 400 },
    );
  }

  try {
    const result = handleCallTurn(body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Call turn failed" },
      { status: 500 },
    );
  }
}
