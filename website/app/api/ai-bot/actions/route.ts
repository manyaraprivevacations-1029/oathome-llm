import { NextResponse } from "next/server";
import { getSalesActionAdapter } from "@/lib/ai-bot/actions";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.leadId || !body?.action) {
    return NextResponse.json(
      { ok: false, error: "leadId and action are required" },
      { status: 400 },
    );
  }

  const allowed = [
    "assign_salesperson",
    "send_package_details",
    "schedule_follow_up",
    "send_whatsapp",
    "mark_no_answer",
    "close_lost",
  ];

  if (!allowed.includes(body.action)) {
    return NextResponse.json({ ok: false, error: "Unsupported sales action" }, { status:400 });
  }

  const result = await getSalesActionAdapter().execute(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
