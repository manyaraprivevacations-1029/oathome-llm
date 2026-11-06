"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

type Item = { id: string; status: string; content_type: string; created_at: string; approved_at: string | null };
type Insight = { name: string; title: string; value: number; period: string | null; endTime: string | null };
type InstagramInsights = { connected?: boolean; insightsAvailable?: boolean; username?: string | null; metrics?: Insight[]; followersCount?: number | null; followsCount?: number | null; follows?: number | null; unfollows?: number | null; netFollows?: number | null; attributedProfileVisits?: number; attributedFollows?: number; attributedMediaCount?: number; mediaInsightsNote?: string; accountInsightsError?: string | null; mediaInsightsError?: string | null; error?: string; permissionHint?: string; fetchedAt?: string };
type RangeKey = "week" | "month" | "3months";

const ranges: { key: RangeKey; label: string; days: number }[] = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "3months", label: "3 Months", days: 90 },
];
const metricLabels: Record<string, string> = {
  views: "Views",
  reach: "Reach",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  accounts_engaged: "Accounts engaged",
  total_interactions: "Interactions",
  profile_views: "Profile views",
  follows_and_unfollows: "Follows and unfollows",
  profile_links_taps: "Contact button taps",
};
const number = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
const shell: CSSProperties = { minHeight: "100vh", padding: "30px clamp(18px,4vw,56px) 56px", background: "#f5f2eb", color: "#28251f" };
const panel: CSSProperties = { background: "#fff", border: "1px solid #e8e3d9", borderRadius: 15, padding: 18, boxShadow: "0 2px 10px rgba(40,35,25,.025)" };

export default function SocialAnalyticsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [instagram, setInstagram] = useState<InstagramInsights | null>(null);
  const [instagramLoading, setInstagramLoading] = useState(true);
  const [instagramError, setInstagramError] = useState("");
  const [range, setRange] = useState<RangeKey>("week");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sb = getSocialSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) { router.replace("/social/login"); return; }
        const { data, error } = await sb.from("social_content_items")
          .select("id,status,content_type,created_at,approved_at")
          .eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        if (active) setItems((data || []) as Item[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load workflow analytics.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [router]);

  const loadInstagram = useCallback(async () => {
    setInstagramLoading(true);
    setInstagramError("");
    try {
      const sb = getSocialSupabase();
      const { data: sessionData } = await sb.auth.getSession();
      if (!sessionData.session) { router.replace("/social/login"); return; }
      const response = await fetch("/api/social/analytics/instagram?range=" + range, {
        headers: { Authorization: "Bearer " + sessionData.session.access_token },
        cache: "no-store",
      });
      const data = await response.json() as InstagramInsights;
      if (!response.ok) throw new Error(data.error || "Could not load Instagram insights.");
      setInstagram(data);
    } catch (e) {
      setInstagramError(e instanceof Error ? e.message : "Instagram insights could not be loaded.");
    } finally {
      setInstagramLoading(false);
    }
  }, [range, router]);

  useEffect(() => { void loadInstagram(); }, [loadInstagram]);

  const metrics = useMemo(() => {
    const byName = new Map((instagram?.metrics || []).map((metric) => [metric.name, metric]));
    return ["views", "reach", "likes", "comments", "shares", "saves", "accounts_engaged", "total_interactions"]
      .map((name) => ({ name, label: metricLabels[name], metric: byName.get(name) }));
  }, [instagram]);

  const headlineViews = instagram?.metrics?.find((metric) => metric.name === "views")?.value;
  const count = (status: string) => items.filter((item) => item.status === status).length;
  const recentItems = items.filter((item) => Date.now() - new Date(item.created_at).getTime() <= ranges.find((r) => r.key === range)!.days * 86400000);
  const postsInRange = recentItems.length;
  const workflow = [["Drafts", items.length], ["In review", count("in_review")], ["Approved", count("approved")], ["Created in range", postsInRange]] as const;

  return <main style={shell}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
      <div>
        <Link href="/social" style={{ color: "#8b6a32", fontSize: 12, textDecoration: "none" }}>← Social AI workspace</Link>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: 34, fontWeight: 500, margin: "12px 0 5px" }}>Reports</h1>
        <p style={{ fontSize: 13, color: "#766f63", margin: 0 }}>Instagram performance for your team, in one place.</p>
      </div>
      <Link href="/social/instagram" style={{ border: "1px solid #ded6c8", borderRadius: 24, padding: "11px 16px", color: "#332f28", background: "#fff", fontSize: 12, textDecoration: "none" }}>Manage Instagram connection ↗</Link>
    </header>

    <section style={{ ...panel, padding: "24px clamp(16px,3vw,30px)", marginBottom: 18 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#95805c", marginBottom: 9 }}>Instagram report · @{instagram?.username || "onatripholidays"}</div>
        <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 500, fontSize: "clamp(23px,3vw,34px)", margin: "0 0 16px", lineHeight: 1.2 }}>
          {instagramLoading ? "Loading Instagram performance…" : headlineViews !== undefined ? number(headlineViews) + " views across @" + (instagram?.username || "onatripholidays") : "Instagram performance overview"}
        </h2>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 30, background: "#f3efe7" }}>
          {ranges.map((option) => <button key={option.key} onClick={() => setRange(option.key)} aria-pressed={range === option.key} style={{ border: 0, borderRadius: 24, padding: "9px 17px", fontSize: 12, cursor: "pointer", background: range === option.key ? "#26231e" : "transparent", color: range === option.key ? "#fff" : "#5d574d" }}>{option.label}</button>)}
        </div>
      </div>

      {instagramLoading ? <p style={{ textAlign: "center", color: "#81796d", fontSize: 13 }}>Fetching the latest available metrics…</p> :
        instagramError ? <div role="alert" style={{ background: "#fff0ed", color: "#a33d2e", borderRadius: 10, padding: 14, fontSize: 13 }}>{instagramError}</div> :
        !instagram?.connected ? <div style={{ background: "#fff8e9", color: "#795d2a", borderRadius: 10, padding: 14, fontSize: 13 }}>Instagram is not connected yet. <Link href="/social/instagram" style={{ color: "#8b6a32" }}>Connect account →</Link></div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
          {metrics.map(({ name, label, metric }) => <article key={name} style={{ border: "1px solid #e8e3d9", borderRadius: 13, padding: "15px 16px", background: "#fcfbf8", minHeight: 88 }}>
            <div style={{ fontSize: 11, color: "#766f63", marginBottom: 7 }}>{label}</div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 25, color: "#29251f" }}>{metric ? number(metric.value) : "—"}</div>
          </article>)}
        </div>}
      {instagram?.connected && <section style={{ marginTop: 18 }}>
        <h3 style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 500, margin: "0 0 10px" }}>Audience growth & profile activity</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {[
            ["Current followers", instagram.followersCount],
            ["New followers in range", instagram.follows],
            ["Unfollows in range", instagram.unfollows],
            ["Net follower change", instagram.netFollows],
            ["Profile visits from selected posts", instagram.attributedProfileVisits],
            ["Follows from selected posts", instagram.attributedFollows],
          ].map(([label, value]) => <article key={String(label)} style={{ border: "1px solid #e8e3d9", borderRadius: 13, padding: "15px 16px", background: "#fcfbf8", minHeight: 88 }}>
            <div style={{ fontSize: 11, color: "#766f63", marginBottom: 7 }}>{label}</div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 25, color: "#29251f" }}>{typeof value === "number" ? number(value) : "Unavailable"}</div>
          </article>)}
        </div>
        <p style={{ fontSize: 10, color: "#8c8376", lineHeight: 1.55, margin: "10px 0 0" }}>{instagram.mediaInsightsNote || "Post-attributed profile visits and follows are lifetime totals for eligible posts published in the selected date range. They are not account-wide totals for that date range."}</p>
        {instagram.accountInsightsError && <p style={{ fontSize: 11, color: "#94652c" }}>Account growth metrics: {instagram.accountInsightsError}</p>}
        {instagram.mediaInsightsError && <p style={{ fontSize: 11, color: "#94652c" }}>Post activity metrics: {instagram.mediaInsightsError}</p>}
      </section>}
      {instagram?.connected && instagram?.insightsAvailable && <p style={{ fontSize: 10, color: "#958c7d", margin: "14px 0 0" }}>Fetched {instagram.fetchedAt ? new Date(instagram.fetchedAt).toLocaleString() : "just now"}. A dash means Meta did not return that metric.</p>}
      {instagram?.error && <p style={{ fontSize: 12, color: "#8a5b28", margin: "12px 0 0" }}>{instagram.error}</p>}
    </section>

    <section style={{ ...panel, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 15 }}>
        <div><h2 style={{ fontFamily: "Georgia,serif", fontSize: 23, fontWeight: 500, margin: 0 }}>Your content workflow</h2><p style={{ fontSize: 11, color: "#8b8377", margin: "5px 0 0" }}>Social AI drafts and approvals — separate from Instagram performance.</p></div>
      </div>
      {error && <p role="alert" style={{ color: "#a33d2e", fontSize: 12 }}>{error}</p>}
      {loading ? <p style={{ color: "#81796d", fontSize: 13 }}>Loading workflow…</p> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {workflow.map(([label, value]) => <article key={label} style={{ border: "1px solid #e8e3d9", borderRadius: 13, padding: 16, background: "#fcfbf8" }}><div style={{ fontSize: 11, color: "#766f63" }}>{label}</div><div style={{ fontFamily: "Georgia,serif", fontSize: 28, marginTop: 7 }}>{value}</div></article>)}
        </div>}
    </section>

    <section style={{ ...panel }}>
      <h2 style={{ fontFamily: "Georgia,serif", fontSize: 23, fontWeight: 500, margin: "0 0 7px" }}>Instagram content highlights</h2>
      <p style={{ fontSize: 12, color: "#766f63", lineHeight: 1.6, margin: "0 0 14px" }}>The report layout is ready for best-performing reels and recent post cards. Those sections will populate once the connected-account media and per-post insights endpoint is enabled; no draft is presented as a published Instagram post.</p>
      <div style={{ border: "1px dashed #d8cdbb", borderRadius: 13, padding: "24px 16px", textAlign: "center", color: "#81796d", fontSize: 12 }}>
        Published Instagram posts and their individual performance are not available from the current analytics response.
      </div>
    </section>
  </main>;
}
