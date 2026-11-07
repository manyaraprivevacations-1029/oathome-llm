import { NextRequest, NextResponse } from "next/server";
import { composioRequest } from "@/lib/social/composio-server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const admin = getSocialAdmin();
    const { data, error } = await admin.from("social_platform_accounts")
      .select("composio_connected_account_id")
      .eq("user_id", user.id).eq("platform", "instagram");
    if (error) throw error;
    for (const row of data || []) {
      if (row.composio_connected_account_id) {
        const remote = await composioRequest<{ user_id?: string }>(
          "/connected_accounts/" + encodeURIComponent(row.composio_connected_account_id)
        );
        if (remote.user_id !== user.id) throw new Error("Connected account ownership check failed.");
        await composioRequest("/connected_accounts/" + encodeURIComponent(row.composio_connected_account_id), { method: "DELETE" });
      }
    }
    const { error: deleteError } = await admin.from("social_platform_accounts")
      .delete().eq("user_id", user.id).eq("platform", "instagram");
    if (deleteError) throw deleteError;
    return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Instagram disconnect failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not disconnect Instagram." }, { status: 503 });
  }
}
