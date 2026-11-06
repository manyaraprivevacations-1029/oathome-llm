import { NextRequest, NextResponse } from "next/server";
import { composioConfigured, composioRequest } from "@/lib/social/composio-server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;
type MetricRow = {
  name?: string; title?: string; period?: string;
  values?: Array<{ value?: unknown; end_time?: string }>;
  total_value?: { value?: unknown; breakdowns?: Array<{ results?: Array<{ dimension_values?: string[]; value?: unknown }> }> };
};
type ProxyResponse = { status?: number; data?: JsonObject };

async function proxyInstagram(accountId: string, userId: string, endpoint: string) {
  return composioRequest<ProxyResponse>("/tools/execute/proxy", {
    method: "POST",
    body: JSON.stringify({ connected_account_id: accountId, user_id: userId, endpoint, method: "GET" }),
  });
}
function payload(response: ProxyResponse): JsonObject {
  const outer = response.data || {};
  const nested = outer.data;
  return nested && typeof nested === "object" && !Array.isArray(nested) ? nested as JsonObject : outer;
}
function graphError(response: ProxyResponse): string | null {
  const error = payload(response).error as { message?: string } | undefined;
  return error?.message || (response.status && response.status >= 400 ? "Instagram API request failed." : null);
}
function metricRows(response: ProxyResponse): MetricRow[] {
  const rows = payload(response).data;
  return Array.isArray(rows) ? rows as MetricRow[] : [];
}
function metricValue(row: MetricRow): number | null {
  const value = row.total_value?.value ?? row.values?.[row.values.length - 1]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function metricBreakdown(row: MetricRow): Record<string, number> {
  const result: Record<string, number> = {};
  for (const breakdown of row.total_value?.breakdowns || []) {
    for (const item of breakdown.results || []) {
      const key = item.dimension_values?.[0];
      if (key && typeof item.value === "number") result[key.toLowerCase()] = item.value;
    }
  }
  return result;
}
function dateOnly(date: Date) { return date.toISOString().slice(0, 10); }
function unix(date: Date) { return Math.floor(date.getTime() / 1000); }

export async function GET(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!composioConfigured()) return NextResponse.json({ error: "Instagram analytics is not configured." }, { status: 503 });

  const requestedRange = request.nextUrl.searchParams.get("range") || "week";
  const days = requestedRange === "month" ? 30 : requestedRange === "3months" ? 90 : 7;
  const until = new Date();
  const since = new Date(until.getTime() - (days - 1) * 86400000);

  try {
    const admin = getSocialAdmin();
    const { data: connection, error } = await admin.from("social_platform_accounts")
      .select("composio_connected_account_id,account_username")
      .eq("user_id", user.id).eq("platform", "instagram")
      .order("connected_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!connection?.composio_connected_account_id) {
      return NextResponse.json({ connected: false, insightsAvailable: false }, { status: 404 });
    }

    const accountId = connection.composio_connected_account_id;
    const profileResponse = await proxyInstagram(accountId, user.id,
      "/me?fields=id,username,account_type,media_count,followers_count,follows_count");
    const profile = payload(profileResponse);
    if (graphError(profileResponse) || typeof profile.id !== "string") {
      return NextResponse.json({ connected: true, insightsAvailable: false,
        error: graphError(profileResponse) || "The connected Instagram profile could not be read." },
      { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    // Graph API since/until parameters are Unix timestamps, not date strings.
    const accountMetricNames = "views,reach,accounts_engaged,total_interactions,likes,comments,shares,saves,profile_links_taps";
    const accountEndpoint = "/" + encodeURIComponent(profile.id) + "/insights?metric=" +
      encodeURIComponent(accountMetricNames) + "&period=day&metric_type=total_value&since=" +
      unix(since) + "&until=" + unix(until);
    const accountResponse = await proxyInstagram(accountId, user.id, accountEndpoint);
    const accountRows = graphError(accountResponse) ? [] : metricRows(accountResponse);
    const followResponse = await proxyInstagram(accountId, user.id,
      "/" + encodeURIComponent(profile.id) + "/insights?metric=follows_and_unfollows&period=day&metric_type=total_value&breakdown=follow_type&since=" +
      unix(since) + "&until=" + unix(until));
    const followRows = graphError(followResponse) ? [] : metricRows(followResponse);
    const accountMetrics = accountRows.map((row) => ({
      name: row.name || "metric", title: row.title || row.name || "Metric",
      value: metricValue(row), breakdown: metricBreakdown(row),
    }));
    const followRow = followRows.find((row) => row.name === "follows_and_unfollows");
    const followBreakdown = followRow ? metricBreakdown(followRow) : {};
    const follows = followBreakdown.follower ?? followBreakdown.followers ?? followBreakdown.follows ?? null;
    const unfollows = followBreakdown.nonfollower ?? followBreakdown.non_followers ?? followBreakdown.unfollowers ?? followBreakdown.unfollows ?? null;

    // Per-media profile_visits/follows are lifetime attribution, not account-wide period totals.
    const mediaResponse = await proxyInstagram(accountId, user.id,
      "/" + encodeURIComponent(profile.id) + "/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,like_count,comments_count&limit=25");
    const mediaPayload = payload(mediaResponse);
    const media = Array.isArray(mediaPayload.data) ? mediaPayload.data as JsonObject[] : [];
    const inRangeMedia = media.filter((item) => {
      if (typeof item.timestamp !== "string") return false;
      const time = new Date(item.timestamp).getTime();
      return Number.isFinite(time) && time >= since.getTime() && time <= until.getTime();
    });
    const mediaResults = await Promise.all(inRangeMedia.slice(0, 12).map(async (item) => {
      const id = typeof item.id === "string" ? item.id : "";
      if (!id) return null;
      const kind = String(item.media_product_type || item.media_type || "").toUpperCase();
      const isStory = kind === "STORY";
      const isReel = kind === "REELS" || kind === "REEL";
      const requested = isStory
        ? "views,reach,replies,shares,total_interactions,profile_visits,follows"
        : isReel
          ? "views,reach,likes,comments,shares,saved,total_interactions"
          : "views,reach,likes,comments,shares,saved,total_interactions,profile_visits,follows";
      const response = await proxyInstagram(accountId, user.id,
        "/" + encodeURIComponent(id) + "/insights?metric=" + encodeURIComponent(requested));
      const rows = graphError(response) ? [] : metricRows(response);
      const values: Record<string, number> = {};
      for (const row of rows) {
        const value = metricValue(row);
        if (row.name && value !== null) values[row.name] = value;
      }
      return {
        id, caption: typeof item.caption === "string" ? item.caption : "",
        mediaType: typeof item.media_type === "string" ? item.media_type : kind,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : null,
        permalink: typeof item.permalink === "string" ? item.permalink : null,
        thumbnailUrl: typeof item.thumbnail_url === "string" ? item.thumbnail_url : null,
        likeCount: typeof item.like_count === "number" ? item.like_count : null,
        commentCount: typeof item.comments_count === "number" ? item.comments_count : null,
        insights: values,
      };
    }));
    const posts = mediaResults.filter((item): item is NonNullable<typeof item> => item !== null);
    const attributedProfileVisits = posts.reduce((sum, item) => sum + (item.insights.profile_visits || 0), 0);
    const attributedFollows = posts.reduce((sum, item) => sum + (item.insights.follows || 0), 0);
    const bestPosts = [...posts].sort((a, b) =>
      (b.insights.views || b.insights.reach || 0) - (a.insights.views || a.insights.reach || 0));

    return NextResponse.json({
      connected: true, insightsAvailable: accountMetrics.some((item) => item.value !== null),
      username: profile.username || connection.account_username,
      accountType: profile.account_type || "PROFESSIONAL",
      mediaCount: typeof profile.media_count === "number" ? profile.media_count : null,
      followersCount: typeof profile.followers_count === "number" ? profile.followers_count : null,
      followsCount: typeof profile.follows_count === "number" ? profile.follows_count : null,
      follows, unfollows, netFollows: follows !== null && unfollows !== null ? follows - unfollows : null,
      attributedProfileVisits, attributedFollows, attributedMediaCount: posts.length,
      range: requestedRange, since: dateOnly(since), until: dateOnly(until),
      metrics: accountMetrics, posts,
      mediaInsightsNote: "Profile visits and follows shown here are lifetime results attributed to posts published in the selected date range, not account-wide visits or follows during that range.",
      accountInsightsError: graphError(accountResponse) || graphError(followResponse),
      mediaInsightsError: graphError(mediaResponse),
      fetchedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[OAT Social AI] Instagram analytics failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load Instagram insights through the connected account." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
