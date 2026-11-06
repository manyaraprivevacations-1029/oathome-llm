"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";

type Creative = { headline: string; subheadline: string; caption: string; hashtags: string[]; visualDirection: string };
const shell: CSSProperties = { minHeight: "100vh", padding: "32px clamp(16px,4vw,54px) 56px", background: "#f5f2eb", color: "#30291f" };
const panel: CSSProperties = { background: "#fffdf8", border: "1px solid #e7dfd1", borderRadius: 16, padding: 20 };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #ded5c6", borderRadius: 9, padding: "12px 13px", color: "#30291f", background: "#fff", font: "inherit", fontSize: 13 };
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: "12px 17px", background: "#a8752d", color: "#fff", fontWeight: 700, cursor: "pointer" };
const secondary: CSSProperties = { border: "1px solid #ded5c6", borderRadius: 9, padding: "11px 15px", background: "#fff", color: "#57452d", fontWeight: 650, cursor: "pointer" };
const escapeXml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] || c);

function makePoster(creative: Creative, brand: string) {
  const headline = escapeXml(creative.headline);
  const subheadline = escapeXml(creative.subheadline);
  const brandText = escapeXml(brand);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#211b18"/><stop offset=".52" stop-color="#5a3020"/><stop offset="1" stop-color="#a66b32"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#ffd98a" stop-opacity=".65"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0bf"/><stop offset="1" stop-color="#d99b48"/></linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <circle cx="540" cy="510" r="390" fill="url(#glow)"/>
  <rect x="42" y="42" width="996" height="1266" rx="22" fill="none" stroke="#e9c17a" stroke-opacity=".65" stroke-width="2"/>
  <path d="M90 180 Q540 60 990 180 M90 1170 Q540 1290 990 1170" fill="none" stroke="#e9c17a" stroke-opacity=".4" stroke-width="2"/>
  <g fill="#f6d68d" opacity=".9"><circle cx="180" cy="300" r="5"/><circle cx="900" cy="270" r="5"/><circle cx="860" cy="880" r="4"/><circle cx="220" cy="940" r="4"/><circle cx="540" cy="220" r="4"/></g>
  <g transform="translate(540 570)">
    <ellipse cx="0" cy="95" rx="150" ry="24" fill="#201714" opacity=".35"/>
    <path d="M-142 30 Q-115 150 0 150 Q115 150 142 30 Q70 68 0 68 Q-70 68 -142 30Z" fill="url(#gold)" stroke="#ffe5a5" stroke-width="5"/>
    <path d="M-100 35 Q-65 65 0 65 Q65 65 100 35" fill="none" stroke="#9b5424" stroke-width="5"/>
    <path d="M0 35 C-72 -30 -25 -95 0 -165 C25 -95 72 -30 0 35Z" fill="#ffcf64"/>
    <path d="M0 18 C-35 -24 -9 -72 0 -102 C16 -61 33 -20 0 18Z" fill="#fff6c8"/>
    <path d="M0 -165 Q-24 -215 0 -250 Q25 -210 0 -165Z" fill="#ff9d3e"/>
    <path d="M-210 10 Q-250 -40 -225 -90 M210 10 Q250 -40 225 -90" stroke="#f8d58c" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>
  <text x="540" y="130" text-anchor="middle" fill="#f4d89f" font-family="Arial,sans-serif" font-size="25" letter-spacing="8">${brandText.toUpperCase()}</text>
  <text x="540" y="340" text-anchor="middle" fill="#fff4d8" font-family="Georgia,serif" font-size="76" font-weight="bold">${headline}</text>
  <text x="540" y="425" text-anchor="middle" fill="#f6dfb6" font-family="Arial,sans-serif" font-size="29">${subheadline}</text>
  <text x="540" y="1040" text-anchor="middle" fill="#fff0ce" font-family="Georgia,serif" font-size="36">Wishing you light, joy &amp; beautiful journeys</text>
  <text x="540" y="1190" text-anchor="middle" fill="#f4d89f" font-family="Arial,sans-serif" font-size="23" letter-spacing="4">ONATRIPHOLIDAYS.IN</text>
  </svg>`;
}

function parseCreative(raw: string): Creative {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const strings = (key: string, fallback: string) => typeof parsed[key] === "string" && String(parsed[key]).trim() ? String(parsed[key]).trim() : fallback;
  const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((x): x is string => typeof x === "string").slice(0, 15) : ["#OnATripHolidays", "#HappyDiwali", "#DiwaliWishes", "#TravelIndia"];
  return { headline: strings("headline", "Happy Diwali"), subheadline: strings("subheadline", "May your celebrations shine bright"), caption: strings("caption", "Wishing you and your family a bright, joyful and wonderful Diwali!\n\nWith warm wishes, On A Trip Holidays."), hashtags, visualDirection: strings("visualDirection", "Elegant festive gold and warm amber palette.") };
}

export default function AiSocialPublisherPage() {
  const router = useRouter();
  const [brief, setBrief] = useState("Create a premium Diwali wishes post for On A Trip Holidays. It should feel elegant, warm and festive, with a rich Indian gold and deep maroon palette. This is a greeting post, not a package advertisement.");
  const [format, setFormat] = useState("Instagram portrait post (4:5)");
  const [language, setLanguage] = useState("English");
  const [creative, setCreative] = useState<Creative | null>(null);
  const [svg, setSvg] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const poster = useMemo(() => svg ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg) : "", [svg]);

  async function generate() {
    setGenerating(true); setError(""); setNotice("");
    try {
      const prompt = [
        "Create a complete Instagram social post creative for On A Trip Holidays.",
        "Return valid JSON only with keys headline, subheadline, caption, hashtags (array of strings), visualDirection.",
        "Do not include markdown fences. Keep headline short enough for a premium 4:5 poster. Caption should sound natural and ready for Instagram. Hashtags must be relevant.",
        "Use Brand Brain and verified travel knowledge. Do not invent offers or package facts. This is a greeting creative unless the brief explicitly says otherwise.",
        "Requested format: " + format, "Language: " + language, "Creative brief: " + brief,
      ].join("\n");
      const result = parseCreative(await generateSocialDraft(prompt));
      const nextSvg = makePoster(result, "On A Trip Holidays");
      setCreative(result); setSvg(nextSvg); setNotice("Your creative and caption are ready. Review them before saving.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OWN could not create this post.");
    } finally { setGenerating(false); }
  }

  async function saveDraft() {
    if (!creative || !svg) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const sb = getSocialSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) { router.replace("/social/login"); return; }
      const caption = creative.caption + "\n\n" + creative.hashtags.join(" ");
      const { error: writeError } = await sb.from("social_content_items").insert({
        user_id: auth.user.id,
        title: creative.headline + " — AI Social Publisher",
        content_type: "post",
        status: "draft",
        caption,
        script: "Visual direction: " + creative.visualDirection + "\nFormat: " + format + "\nLanguage: " + language,
        metadata: { source: "ai_social_publisher", creative_svg: svg, format, language, brief },
      });
      if (writeError) throw writeError;
      setNotice("Saved to your Content Planner as a draft. Publishing is not enabled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this draft.");
    } finally { setSaving(false); }
  }

  async function downloadPng() {
    if (!svg) return;
    try {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
        const context = canvas.getContext("2d");
        if (!context) { URL.revokeObjectURL(url); setError("Could not prepare the PNG download."); return; }
        context.drawImage(image, 0, 0, 1080, 1350);
        URL.revokeObjectURL(url);
        canvas.toBlob((png) => {
          if (!png) { setError("PNG export failed."); return; }
          const link = document.createElement("a"); const pngUrl = URL.createObjectURL(png);
          link.href = pngUrl; link.download = "on-a-trip-holidays-instagram-creative.png"; link.click();
          URL.revokeObjectURL(pngUrl);
        }, "image/png");
      };
      image.onerror = () => { URL.revokeObjectURL(url); setError("Could not render the creative for download."); };
      image.src = url;
    } catch { setError("PNG export failed in this browser."); }
  }

  return <main className="social-theme" style={shell}>
    <header style={{ marginBottom: 22 }}>
      <Link href="/social" style={{ color: "#9a6a2c", fontSize: 12, textDecoration: "none" }}>← Social AI workspace</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 15, flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 10, letterSpacing: 2, color: "#a8752d", fontWeight: 800, marginTop: 13 }}>CREATE · AI POWERED</div><h1 style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 500, margin: "8px 0 5px" }}>AI Social Publisher</h1><p style={{ color: "#786e60", fontSize: 13, margin: 0 }}>One brief in. A designed Instagram creative and caption out.</p></div>
        <span style={{ border: "1px solid #e4d7c2", background: "#fffaf0", borderRadius: 30, padding: "8px 12px", fontSize: 10, color: "#8b642e" }}>CREATE &amp; SAVE · PUBLISHING OFF</span>
      </div>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .85fr) minmax(320px, 1.15fr)", gap: 17, alignItems: "start" }}>
      <section style={panel}>
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 21, fontWeight: 500, margin: "0 0 14px" }}>Tell OWN what to create</h2>
        <label style={{ display: "grid", gap: 7, fontSize: 10, letterSpacing: 1, color: "#88765d", marginBottom: 13 }}>YOUR INSTRUCTION<textarea value={brief} onChange={e => setBrief(e.target.value)} rows={7} style={{ ...field, resize: "vertical", lineHeight: 1.6 }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 15 }}>
          <label style={{ display: "grid", gap: 7, fontSize: 10, color: "#88765d" }}>FORMAT<select value={format} onChange={e => setFormat(e.target.value)} style={field}><option>Instagram portrait post (4:5)</option><option>Instagram square post (1:1)</option><option>Instagram story (9:16)</option></select></label>
          <label style={{ display: "grid", gap: 7, fontSize: 10, color: "#88765d" }}>LANGUAGE<select value={language} onChange={e => setLanguage(e.target.value)} style={field}><option>English</option><option>Telugu-English</option><option>Telugu</option></select></label>
        </div>
        <button type="button" disabled={generating || !brief.trim()} onClick={() => void generate()} style={{ ...primary, width: "100%", opacity: generating || !brief.trim() ? .6 : 1 }}>{generating ? "OWN is creating your post…" : "✦ Generate Instagram post"}</button>
        <p style={{ fontSize: 10, color: "#8b8173", lineHeight: 1.6, margin: "12px 0 0" }}>OWN uses your saved Brand Brain for tone and guardrails. Review the result before saving it.</p>
      </section>
      <section style={{ display: "grid", gap: 14 }}>
        <div style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}><h2 style={{ fontFamily: "Georgia,serif", fontSize: 21, fontWeight: 500, margin: 0 }}>Creative preview</h2><span style={{ fontSize: 9, letterSpacing: 1, color: "#9a6a2c" }}>1080 × 1350</span></div>
          {poster ? <img src={poster} alt="Generated On A Trip Holidays Instagram post preview" style={{ display: "block", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: 9, boxShadow: "0 10px 28px rgba(48,35,20,.15)" }} /> : <div style={{ minHeight: 360, display: "grid", placeItems: "center", textAlign: "center", color: "#928675", background: "#f7f2e8", border: "1px dashed #ddcfb8", borderRadius: 12, padding: 20 }}><div><div style={{ fontSize: 38, marginBottom: 10 }}>✧</div><b style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 500 }}>Your design will appear here</b><p style={{ fontSize: 11 }}>Enter a brief and ask OWN to create your first post.</p></div></div>}
        </div>
        {creative && <div style={panel}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 500, margin: "0 0 10px" }}>Instagram caption</h2>
          <p style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#4f473b" }}>{creative.caption}</p>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: "#9a6a2c" }}>{creative.hashtags.join(" ")}</p>
          <p style={{ fontSize: 10, color: "#8b8173" }}>Visual direction: {creative.visualDirection}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 13 }}>
            <button type="button" onClick={() => void downloadPng()} style={secondary}>Download PNG</button>
            <button type="button" disabled={saving} onClick={() => void saveDraft()} style={{ ...primary, opacity: saving ? .6 : 1 }}>{saving ? "Saving…" : "Save to Content Planner"}</button>
          </div>
        </div>}
      </section>
    </div>
    {error && <p role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 9, background: "#fff0ed", color: "#a33d2e", fontSize: 12 }}>{error}</p>}
    {notice && <p role="status" style={{ marginTop: 14, padding: 12, borderRadius: 9, background: "#f5eddd", color: "#77521e", fontSize: 12 }}>{notice}</p>}
    <p style={{ marginTop: 18, fontSize: 10, color: "#8b8173", lineHeight: 1.6 }}>This first version creates and saves a visual draft only. Instagram publishing, scheduling and account write permissions are intentionally not called.</p>
  </main>;
}
