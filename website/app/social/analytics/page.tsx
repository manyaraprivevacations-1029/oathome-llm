"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

type Item = { id: string; status: string; content_type: string; created_at: string; approved_at: string | null };
type Insight = { name: string; title: string; value: number; period: string | null; endTime: string | null };
type InstagramInsights = { connected?: boolean; insightsAvailable?: boolean; username?: string | null; metrics?: Insight[]; error?: string; permissionHint?: string; fetchedAt?: string };

const shell: CSSProperties = { minHeight: "100vh", padding: "34px clamp(18px,5vw,64px)", background: "#f4f8fd", color: "#10264a" };
const panel: CSSProperties = { background: "#fff", border: "1px solid #dce8f5", borderRadius: 15, padding: 20 };
const metricNames: Record<string, string> = {
  reach: "Accounts reached",
  views: "Views",
  follower_count: "Followers",
  accounts_engaged: "Accounts engaged",
  total_interactions: "Interactions",
  profile_views: "Profile views",
};
const number = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

export default function SocialAnalyticsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [instagram, setInstagram] = useState<InstagramInsights | null>(null);
  const [instagramLoading, setInstagramLoading] = useState(true);
  const [instagramError, setInstagramError] = useState("");

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sb = getSocialSupabase();
        const { data: sessionData } = await sb.auth.getSession();
        if (!sessionData.session) { router.replace("/social/login"); return; }
        const response = await fetch("/api/social/analytics/instagram", {
          headers: { Authorization: "Bearer " + sessionData.session.access_token },
          cache: "no-store",
        });
        const data = await response.json() as InstagramInsights;
        if (!response.ok) throw new Error(data.error || "Could not load Instagram insights.");
        if (active) setInstagram(data);
      } catch (e) {
        if (active) setInstagramError(e instanceof Error ? e.message : "Instagram insights could not be loaded.");
      } finally { if (active) setInstagramLoading(false); }
    })();
    return () => { active = false; };
  }, [router]);

  const count = (status: string) => items.filter((x) => x.status === status).length;
  const recent = items.filter((x) => Date.now() - new Date(x.created_at).getTime() < 30 * 86400000).length;
  const workflow = [["Total drafts", items.length], ["In review", count("in_review")], ["Approved", count("approved")], ["Created in 30 days", recent]] as const;

  return <main style={shell}>
    <header style={{ marginBottom: 22 }}>
      <Link href="/social" style={{ color: "#0878d8", fontSize: 12, textDecoration: "none" }}>← Social AI workspace</Link>
      <h1 style={{ fontSize: 34, margin: "12px 0 5px" }}>Analytics</h1>
      <p style={{ fontSize: 13, color: "#62758e" }}>Instagram performance and your team's content workflow, in one place.</p>
    </header>

    <section style={{ ...panel, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div><h2 style={{ fontSize: 17, margin: "0 0 5px" }}>Instagram performance</h2><p style={{ fontSize: 11, color: "#62758e", margin: 0 }}>{instagram?.username ? "@" + instagram.username : "Live account insights from Meta"}</p></div>
        <Link href="/social/instagram" style={{ fontSize: 12, color: "#0878d8" }}>Manage connection →</Link>
      </div>
      {instagramLoading ? <p style={{ fontSize: 12, color: "#62758e" }}>Loading Instagram insights…</p> :
        instagramError ? <div role="alert" style={{ background: "#fff0ef", borderRadius: 9, padding: 13, color: "#a52a20", fontSize: 12 }}>{instagramError}</div> :
        instagram?.insightsAvailable && instagram.metrics?.length ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 12 }}>
          {instagram.metrics.map((metric) => <article key={metric.name} style={{ ...panel, padding: 16, background: "#fafdff" }}><div style={{ fontSize: 11, color: "#62758e" }}>{metricNames[metric.name] || metric.title}</div><div style={{ fontSize: 28, fontWeight: 800, color: "#075da8", marginTop: 8 }}>{number(metric.value)}</div><div style={{ fontSize: 10, color: "#8293a8", marginTop: 5 }}>{metric.period ? "Period: " + metric.period : "Latest available value"}</div></article>)}
        </div><p style={{ fontSize: 10, color: "#8293a8", margin: "12px 0 0" }}>Fetched {instagram.fetchedAt ? new Date(instagram.fetchedAt).toLocaleString() : "just now"}. Values and available metrics depend on Meta's account eligibility and API permissions.</p></> :
        <div style={{ background: "#fff9e9", border: "1px solid #f0dfb8", borderRadius: 10, padding: 14 }}>
          <strong style={{ fontSize: 12, color: "#805b12" }}>{instagram?.connected ? "Instagram is connected, but Insights data is unavailable" : "Instagram account is not connected"}</strong>
          <p style={{ fontSize: 11, color: "#725c35", lineHeight: 1.6, marginBottom: 4 }}>{instagram?.error || instagramError || "Connect a supported Instagram professional account to view performance data."}</p>
          {instagram?.permissionHint && <p style={{ fontSize: 11, color: "#725c35", lineHeight: 1.6, margin: "6px 0 0" }}>{instagram.permissionHint}</p>}
          <Link href="/social/instagram" style={{ fontSize: 12, color: "#0878d8" }}>Check Instagram connection →</Link>
        </div>}
    </section>

    <h2 style={{ fontSize: 18, margin: "22px 0 12px" }}>Content workflow</h2>
    {error && <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}
    {loading ? <p>Loading content analytics…</p> : <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 13 }}>
        {workflow.map(([name, value]) => <article key={name} style={panel}><div style={{ fontSize: 11, color: "#62758e" }}>{name}</div><div style={{ fontSize: 32, fontWeight: 800, color: "#075da8", marginTop: 8 }}>{value}</div></article>)}
      </section>
      <section style={{ ...panel, marginTop: 16 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Content by format</h2>
        {["reel", "post", "carousel", "story"].map((type) => {
          const n = items.filter((x) => x.content_type === type).length;
          return <div key={type} style={{ display: "grid", gridTemplateColumns: "90px 1fr 35px", alignItems: "center", gap: 10, margin: "13px 0" }}>
            <span style={{ fontSize: 12, color: "#45617f", textTransform: "capitalize" }}>{type}</span>
            <div style={{ height: 9, background: "#eaf2fa", borderRadius: 20, overflow: "hidden" }}><div style={{ height: "100%", width: items.length ? String(n / items.length * 100) + "%" : "0%", background: "linear-gradient(90deg,#0878d8,#56b9f5)", borderRadius: 20 }} /></div>
            <strong style={{ fontSize: 12, textAlign: "right" }}>{n}</strong>
          </div>;
        })}
      </section>
    </>}
  </main>;
}
