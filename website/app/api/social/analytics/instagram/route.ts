import { NextRequest, NextResponse } from "next/server";
import { composioConfigured, composioRequest } from "@/lib/social/composio-server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProxyResponse = {
  status?: number;
  data?: {
    id?: string;
    username?: string;
    account_type?: string;
    media_count?: number;
    data?: Array<{
      name?: string;
      title?: string;
      period?: string;
      values?: Array<{ value?: number; end_time?: string }>;
      total_value?: { value?: number };
    }>;
    error?: { message?: string; code?: number };
  };
};

async function proxyInstagram(accountId: string, userId: string, endpoint: string) {
  return composioRequest<ProxyResponse>("/tools/execute/proxy", {
    method: "POST",
    body: JSON.stringify({
      connected_account_id: accountId,
      user_id: userId,
      endpoint,
      method: "GET",
    }),
  });
}

export async function GET(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!composioConfigured()) return NextResponse.json({ error: "Instagram analytics is not configured." }, { status: 503 });

  try {
    const admin = getSocialAdmin();
    const { data, error } = await admin.from("social_platform_accounts")
      .select("composio_connected_account_id,account_username")
      .eq("user_id", user.id).eq("platform", "instagram")
      .order("connected_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data?.composio_connected_account_id) {
      return NextResponse.json({ connected: false, insightsAvailable: false }, { status: 404 });
    }

    const accountId = data.composio_connected_account_id;
    const profile = await proxyInstagram(accountId, user.id, "/me?fields=id,username,account_type,media_count");
    if ((profile.status && profile.status >= 400) || profile.data?.error || !profile.data?.id) {
      return NextResponse.json({
        connected: true,
        insightsAvailable: false,
        error: profile.data?.error?.message || "The connected Instagram profile could not be read. Verify the Composio Instagram connection and granted permissions.",
      }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const metrics = "reach,views,follower_count,accounts_engaged,total_interactions,profile_views";
    const insights = await proxyInstagram(
      accountId,
      user.id,
      "/" + encodeURIComponent(profile.data.id) + "/insights?metric=" + encodeURIComponent(metrics) + "&period=day"
    );
    if ((insights.status && insights.status >= 400) || insights.data?.error) {
      return NextResponse.json({
        connected: true,
        insightsAvailable: false,
        username: profile.data.username || data.account_username,
        error: insights.data?.error?.message || "Instagram Insights is not available for this account.",
        permissionHint: "The current Composio authorization may not include Instagram Insights access. The auth configuration must request the relevant insights permission before reconnecting.",
      }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const rows = insights.data?.data || [];
    const result = rows.map((row) => {
      const latest = row.values?.[row.values.length - 1];
      const value = row.total_value?.value ?? latest?.value;
      return {
        name: row.name || "metric",
        title: row.title || row.name || "Metric",
        value: typeof value === "number" ? value : null,
        period: row.period || null,
        endTime: latest?.end_time || null,
      };
    }).filter((row) => row.value !== null);

    return NextResponse.json({
      connected: true,
      insightsAvailable: result.length > 0,
      username: profile.data.username || data.account_username,
      accountType: profile.data.account_type || "PROFESSIONAL",
      mediaCount: profile.data.media_count ?? null,
      metrics: result,
      fetchedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Instagram analytics failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load Instagram insights through the connected account." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
