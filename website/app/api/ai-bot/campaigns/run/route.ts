import { NextResponse } from "next/server";
import { previewCampaignRun } from "@/lib/ai-bot/campaign-runner";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.campaignId) {
    return NextResponse.json({ ok:false, error:"campaignId is required" }, { status:400 });
  }

  try {
    const result = previewCampaignRun(body.campaignId);
    return NextResponse.json({ ok:true, result });
  } catch (error) {
    return NextResponse.json(
      { ok:false, error:error instanceof Error ? error.message : "Campaign preview failed" },
      { status:404 },
    );
  }
}
