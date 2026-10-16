import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "demo_adapter",
    period: "7d",
    metrics: {
      connectionRate: 60.5,
      qualificationRate: 47.2,
      hotLeadRate: 20.2,
      averageCallDurationSeconds: 168,
    },
  });
}
