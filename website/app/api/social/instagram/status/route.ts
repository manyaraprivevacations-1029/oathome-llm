import { NextRequest, NextResponse } from "next/server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const serviceKey = process.env.SOCIAL_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SOCIAL_SUPABASE_SECRET_KEY?.trim();
  const configured = Boolean(process.env.SOCIAL_META_APP_ID?.trim() && process.env.SOCIAL_META_APP_SECRET?.trim() && process.env.SOCIAL_META_TOKEN_ENCRYPTION_KEY?.trim() && serviceKey);
  try {
    const admin = getSocialAdmin();
    const { data, error } = await admin.from("social_platform_accounts")
      .select("platform_account_id,account_username,account_type,token_expires_at,connected_at")
      .eq("user_id", user.id).eq("platform", "instagram").order("connected_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      configured,
      connected: Boolean(data),
      account: data ? {
        id: data.platform_account_id,
        username: data.account_username,
        accountType: data.account_type,
        expiresAt: data.token_expires_at,
        connectedAt: data.connected_at,
      } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Instagram status failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load Instagram connection status." }, { status: 503 });
  }
}
