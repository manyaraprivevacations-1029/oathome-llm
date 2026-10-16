import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  return NextResponse.json({
    ok: true,
    mode: "inbound_adapter",
    message: "Inbound call received. Route this event to an active AI employee after provider signature verification.",
    caller: payload?.from ?? payload?.From ?? null,
    employeeId: process.env.INBOUND_AI_EMPLOYEE_ID ?? "ananya",
  });
}
