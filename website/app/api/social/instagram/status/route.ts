import { NextRequest, NextResponse } from "next/server";
import { composioConfigured, composioRequest } from "@/lib/social/composio-server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConnectedAccount = { id?: string; status?: string; toolkit?: { slug?: string } };

export async function GET(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const serviceKey = process.env.SOCIAL_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SOCIAL_SUPABASE_SECRET_KEY?.trim();
  const configured = composioConfigured() && Boolean(serviceKey);
  if (!serviceKey) return NextResponse.json({ configured, connected: false, account: null }, { headers: { "Cache-Control": "no-store" } });

  try {
    const admin = getSocialAdmin();
    const { data, error } = await admin.from("social_platform_accounts")
      .select("platform_account_id,composio_connected_account_id,account_username,account_type,connected_at")
      .eq("user_id", user.id).eq("platform", "instagram").order("connected_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data?.composio_connected_account_id) {
      return NextResponse.json({ configured, connected: false, account: null }, { headers: { "Cache-Control": "no-store" } });
    }

    const remote = await composioRequest<ConnectedAccount>(
      "/connected_accounts/" + encodeURIComponent(data.composio_connected_account_id)
    );
    const valid = remote.id === data.composio_connected_account_id &&
      remote.user_id === user.id &&
      remote.status === "ACTIVE" &&
      remote.toolkit?.slug?.toLowerCase() === "instagram";
    if (!valid) {
      return NextResponse.json({ configured, connected: false, account: null, connectionStatus: remote.status || "UNKNOWN" }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      configured, connected: true,
      account: {
        id: data.platform_account_id,
        username: data.account_username,
        accountType: data.account_type,
        expiresAt: null,
        connectedAt: data.connected_at,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Instagram status failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load Instagram connection status." }, { status: 503 });
  }
}
