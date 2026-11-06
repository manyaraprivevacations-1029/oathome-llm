import { NextRequest, NextResponse } from "next/server";
import { composioConfigured, composioRequest } from "@/lib/social/composio-server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const user = await requireSocialUser(request);
 if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
 if (!composioConfigured()) return NextResponse.json({ error: "Instagram analytics is not configured." }, { status: 503 });
 try {
  const admin = getSocialAdmin();
  const { data, error } = await admin.from("social_platform_accounts").select("composio_connected_account_id,account_username").eq("user_id", user.id).eq("platform", "instagram").order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.composio_connected_account_id) return NextResponse.json({ connected: false, insightsAvailable: false }, { status: 404 });
  const response = await composioRequest<any>("/tools/execute/proxy", { method: "POST", body: JSON.stringify({ connected_account_id: data.composio_connected_account_id, user_id: user.id, endpoint: "/me?fields=id,username,account_type,media_count", method: "GET" }) });
  return NextResponse.json({ connected: true, profile: response.data || response, accountUsername: data.account_username }, { headers: { "Cache-Control": "no-store" } });
 } catch (error) {
  console.error("[OAT Social AI] Instagram analytics failed:", error instanceof Error ? error.message : String(error));
  return NextResponse.json({ error: "Could not load Instagram insights." }, { status: 503 });
 }
}
