import { NextResponse } from "next/server";
import { buildCallSummary } from "@/lib/ai-bot/summary";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.state || typeof body?.transcript !== "string") {
    return NextResponse.json({ ok:false, error:"state and transcript are required" }, { status:400 });
  }
  return NextResponse.json({ ok:true, summary:buildCallSummary(body.state, body.transcript) });
}
