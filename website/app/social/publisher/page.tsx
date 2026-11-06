"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";

type Creative = { headline: string; subheadline: string; caption: string; hashtags: string[]; visualDirection: string; backgroundColor: string; accentColor: string; textColor: string };
const shell: CSSProperties = { minHeight: "100vh", padding: "32px clamp(16px,4vw,54px) 56px", background: "#f5f2eb", color: "#30291f" };
const panel: CSSProperties = { background: "#fffdf8", border: "1px solid #e7dfd1", borderRadius: 16, padding: 20 };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #ded5c6", borderRadius: 9, padding: "12px 13px", color: "#30291f", background: "#fff", font: "inherit", fontSize: 13 };
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: "12px 17px", background: "#a8752d", color: "#fff", fontWeight: 700, cursor: "pointer" };
const secondary: CSSProperties = { border: "1px solid #ded5c6", borderRadius: 9, padding: "11px 15px", background: "#fff", color: "#57452d", fontWeight: 650, cursor: "pointer" };
const escapeXml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] || c);
const safeColor = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const dimensionsFor = (format: string) => format.includes("square") ? { width: 1080, height: 1080 } : format.includes("story") ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 };

function makePoster(creative: Creative, brand: string, format: string) {
  const { width, height } = dimensionsFor(format);
  const cx = width / 2;
  const isDiwali = /diwali|deepavali|lamp|festival of lights/i.test(creative.headline + " " + creative.visualDirection);
  const headline = escapeXml(creative.headline);
  const subheadline = escapeXml(creative.subheadline);
  const brandText = escapeXml(brand.toUpperCase());
  const bg = safeColor(creative.backgroundColor, isDiwali ? "#321b24" : "#203c42");
  const accent = safeColor(creative.accentColor, isDiwali ? "#e8b85e" : "#d5a75b");
  const text = safeColor(creative.textColor, "#fff5df");
  const titleY = Math.round(height * .255);
  const subY = Math.round(height * .335);
  const artY = Math.round(height * .52);
  const footerY = Math.round(height * .88);
  const art = isDiwali
    ? `<g transform="translate(${cx} ${artY})">
      <circle r="${Math.round(width*.25)}" fill="url(#halo)"/>
      <ellipse cx="0" cy="86" rx="150" ry="22" fill="#120f12" opacity=".35"/>
      <path d="M-142 20 Q-115 145 0 145 Q115 145 142 20 Q70 62 0 62 Q-70 62 -142 20Z" fill="url(#metal)" stroke="${accent}" stroke-width="5"/>
      <path d="M-100 25 Q-65 60 0 60 Q65 60 100 25" fill="none" stroke="${bg}" stroke-width="5"/>
      <path d="M0 18 C-72 -35 -25 -100 0 -170 C25 -100 72 -35 0 18Z" fill="${accent}"/>
      <path d="M0 10 C-35 -25 -9 -75 0 -108 C16 -65 33 -22 0 10Z" fill="#fff5d5"/>
      <path d="M0 -170 Q-24 -220 0 -252 Q25 -210 0 -170Z" fill="#ff9d45"/>
      <path d="M-210 8 Q-250 -40 -225 -90 M210 8 Q250 -40 225 -90" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g fill="${accent}"><circle cx="-260" cy="-120" r="5"/><circle cx="260" cy="-120" r="5"/><circle cx="-220" cy="170" r="4"/><circle cx="220" cy="170" r="4"/></g>
    </g>`
    : `<g transform="translate(${cx} ${artY})" fill="none" stroke="${accent}" stroke-width="5" opacity=".95">
      <circle r="178" opacity=".24"/><circle r="142" opacity=".35"/><circle r="104" opacity=".5"/>
      <path d="M-220 65 Q-110 -40 0 65 T220 65" stroke-linecap="round"/>
      <path d="M-160 110 L-65 -20 L0 55 L85 -75 L175 110" stroke-linejoin="round"/>
      <path d="M-95 -150 L0 -220 L95 -150" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="0" cy="-20" r="18" fill="${accent}" stroke="none"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#171d25"/></linearGradient>
      <radialGradient id="halo"><stop stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0c4"/><stop offset="1" stop-color="${accent}"/></linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#background)"/>
    <circle cx="${cx}" cy="${Math.round(height*.49)}" r="${Math.round(width*.43)}" fill="url(#halo)"/>
    <rect x="38" y="38" width="${width-76}" height="${height-76}" rx="24" fill="none" stroke="${accent}" stroke-opacity=".6" stroke-width="2"/>
    <path d="M78 ${Math.round(height*.13)} Q${cx} ${Math.round(height*.08)} ${width-78} ${Math.round(height*.13)}" fill="none" stroke="${accent}" stroke-opacity=".55"/>
    <text x="${cx}" y="${Math.round(height*.13)}" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="22" letter-spacing="6">${brandText}</text>
    <text x="${cx}" y="${titleY}" text-anchor="middle" fill="${text}" font-family="Georgia,serif" font-size="${Math.round(width*.068)}" font-weight="bold">${headline}</text>
    <text x="${cx}" y="${subY}" text-anchor="middle" fill="${text}" opacity=".9" font-family="Arial,sans-serif" font-size="${Math.round(width*.027)}">${subheadline}</text>
    ${art}
    <text x="${cx}" y="${footerY}" text-anchor="middle" fill="${text}" font-family="Georgia,serif" font-size="${Math.round(width*.03)}">${isDiwali ? "Wishing you light, joy & beautiful journeys" : "Discover more. Travel beautifully."}</text>
    <text x="${cx}" y="${Math.round(height*.93)}" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="20" letter-spacing="4">ONATRIPHOLIDAYS.IN</text>
  </svg>`;
}

function parseCreative(raw: string): Creative {
  const cleaned = raw.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const strings = (key: string, fallback: string) => typeof parsed[key] === "string" && String(parsed[key]).trim() ? String(parsed[key]).trim() : fallback;
  const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((x): x is string => typeof x === "string").slice(0, 15) : ["#OnATripHolidays", "#TravelIndia"];
  return {
    headline: strings("headline", "Happy Diwali"),
    subheadline: strings("subheadline", "May your celebrations shine bright"),
    caption: strings("caption", "Wishing you and your family a bright, joyful and wonderful Diwali!\\n\\nWith warm wishes, On A Trip Holidays."),
    hashtags,
    visualDirection: strings("visualDirection", "Premium editorial design with a restrained festive palette."),
    backgroundColor: safeColor(parsed.backgroundColor, "#321b24"),
    accentColor: safeColor(parsed.accentColor, "#e8b85e"),
    textColor: safeColor(parsed.textColor, "#fff5df")
  };
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
        "Return valid JSON only with keys headline, subheadline, caption, hashtags (array of strings), visualDirection, backgroundColor, accentColor, textColor.",
        "Choose a premium, readable palette that fits the brief. Colors must be six-digit hex values. Keep headline concise, avoid clutter, and make the visual direction specific enough for a designer.",
        "Do not include markdown fences. Keep headline short enough for a premium 4:5 poster. Caption should sound natural and ready for Instagram. Hashtags must be relevant.",
        "Use Brand Brain and verified travel knowledge. Do not invent offers or package facts. This is a greeting creative unless the brief explicitly says otherwise.",
        "Requested format: " + format, "Language: " + language, "Creative brief: " + brief,
      ].join("\n");
      const result = parseCreative(await generateSocialDraft(prompt));
      const nextSvg = makePoster(result, "On A Trip Holidays", format);
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
        metadata: { source: "ai_social_publisher", creative_svg: svg, format, dimensions, language, brief, colors: { background: creative.backgroundColor, accent: creative.accentColor, text: creative.textColor } },
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
        const dimensions = dimensionsFor(format);
        const canvas = document.createElement("canvas"); canvas.width = dimensions.width; canvas.height = dimensions.height;
        const context = canvas.getContext("2d");
        if (!context) { URL.revokeObjectURL(url); setError("Could not prepare the PNG download."); return; }
        context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
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
        <div><div style={{ fontSize: 10, letterSpacing: 2, color: "#a8752d", fontWeight: 800, marginTop: 13 }}>CREATE · AI POWERED</div><h1 style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 500, margin: "8px 0 5px" }}>AI Social Publisher</h1><p style={{ color: "#786e60", fontSize: 13, margin: 0 }}>One brief in. AI-written copy, a styled poster and a ready-to-use caption out.</p></div>
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
        <p style={{ fontSize: 10, color: "#8b8173", lineHeight: 1.6, margin: "12px 0 0" }}>Qwen creates the copy and design direction; OWN turns it into an editable vector-style poster. Review before saving.</p>
      </section>
      <section style={{ display: "grid", gap: 14 }}>
        <div style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}><h2 style={{ fontFamily: "Georgia,serif", fontSize: 21, fontWeight: 500, margin: 0 }}>Creative preview</h2><span style={{ fontSize: 9, letterSpacing: 1, color: "#9a6a2c" }}>{dimensionsFor(format).width} × {dimensionsFor(format).height}</span></div>
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
    <p style={{ marginTop: 18, fontSize: 10, color: "#8b8173", lineHeight: 1.6 }}>This version uses Qwen for text and design direction, then renders the artwork as a scalable SVG poster. It does not generate photorealistic AI images. Instagram publishing remains disabled.</p>
  </main>;
}
