import { NextRequest, NextResponse } from "next/server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const admin = getSocialAdmin();
    const { error } = await admin.from("social_platform_accounts").delete().eq("user_id", user.id).eq("platform", "instagram");
    if (error) throw error;
    return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Instagram disconnect failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not disconnect Instagram." }, { status: 503 });
  }
}
