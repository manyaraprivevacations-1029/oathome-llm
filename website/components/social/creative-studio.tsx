"use client";

import { useState } from "react";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";

type Slide = { title: string; body: string; image_prompt: string; image?: string };
type Result = { headline?: string; caption: string; hashtags?: string; visual_prompt?: string; slides?: Slide[] };

const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #ded5c6", borderRadius: 9, padding: "12px 13px", background: "#fff", color: "#30291f", fontSize: 13 };
const label: React.CSSProperties = { display: "grid", gap: 7, color: "#746957", fontSize: 10, letterSpacing: ".08em", fontWeight: 700 };
const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: "11px 16px", background: "#a8752d", color: "#fff", fontWeight: 700, cursor: "pointer" };
const panel: React.CSSProperties = { border: "1px solid #e7dfd1", borderRadius: 15, padding: 20, background: "#fffdf8" };

async function generateImage(prompt: string) {
  const sb = getSocialSupabase();
  let { data } = await sb.auth.getSession();
  if (!data.session) data = (await sb.auth.refreshSession()).data;
  let token = data.session?.access_token || "";
  if (!token) throw new Error("Your session expired. Please sign in again.");
  const send = (value: string) => fetch("/api/social/image", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${value}` }, body: JSON.stringify({ prompt }), cache: "no-store" });
  let response = await send(token);
  if (response.status === 401) {
    const refreshed = await sb.auth.refreshSession();
    token = refreshed.data.session?.access_token || "";
    if (token) response = await send(token);
  }
  const payload = await response.json().catch(() => ({})) as { image?: string; error?: string };
  if (!response.ok || !payload.image) throw new Error(payload.error || "Image generation failed.");
  return payload.image;
}

export default function CreativeStudio({ mode }: { mode: "post" | "carousel" }) {
  const carousel = mode === "carousel";
  const [topic, setTopic] = useState("");
  const [destination, setDestination] = useState("");
  const [facts, setFacts] = useState("");
  const [tone, setTone] = useState("Premium, inspiring and trustworthy");
  const [format, setFormat] = useState(carousel ? "4:5" : "4:5");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(-1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function create() {
    if (!topic.trim()) { setError("Enter a topic or campaign idea first."); return; }
    setBusy(true); setError(""); setNotice(""); setResult(null);
    const shape = carousel
      ? '{"caption":"Instagram caption","hashtags":"hashtags","slides":[{"title":"short slide headline","body":"supporting slide copy","image_prompt":"detailed image prompt for this slide"}]}'
      : '{"headline":"post headline","caption":"Instagram caption","hashtags":"hashtags","visual_prompt":"detailed image prompt for the post"}';
    const prompt = "Create " + (carousel ? "a 5 to 7 slide Instagram carousel" : "one Instagram single-image post") + " for On A Trip Holidays. Return ONLY valid JSON in this exact shape: " + shape + ". Topic: " + topic + ". Destination: " + (destination || "not specified") + ". Confirmed facts: " + (facts || "No package facts supplied. Do not invent prices, dates, availability or inclusions.") + ". Tone: " + tone + ". Design ratio: " + format + ". Use concise, polished, mobile-readable copy. Visual prompts should request premium realistic travel photography, authentic locations, no fake logos, no gibberish text in the image, and leave clean negative space for later typography. Do not claim generated images are real photographs. Make slide 1 a strong hook and the final slide a clear enquiry CTA. Keep each slide focused on one idea.";
    try {
      const raw = await generateSocialDraft(prompt);
      const clean = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
      const parsed = JSON.parse(clean) as Result;
      if (!parsed.caption || (carousel ? !Array.isArray(parsed.slides) || !parsed.slides.length : !parsed.visual_prompt)) throw new Error("OWN returned incomplete content. Please generate again.");
      setResult(parsed);
      setNotice("Draft created with Cloudflare AI. Review every fact and visual before publishing.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create this draft.");
    } finally { setBusy(false); }
  }

  async function makeImage(index = -1) {
    if (!result) return;
    const prompt = carousel ? result.slides?.[index]?.image_prompt : result.visual_prompt;
    if (!prompt) return;
    setImageBusy(index); setError("");
    try {
      const image = await generateImage(prompt + ". Instagram " + format + " composition. Premium travel campaign art direction for On A Trip Holidays.");
      if (carousel) setResult(prev => prev ? { ...prev, slides: prev.slides?.map((slide, i) => i === index ? { ...slide, image } : slide) } : prev);
      else setResult(prev => prev ? { ...prev, visual_prompt: prev.visual_prompt, headline: prev.headline, caption: prev.caption, hashtags: prev.hashtags, slides: undefined, } : prev), setSingleImage(image);
      setNotice("Image generated. Review it before using it in a post.");
    } catch (e) { setError(e instanceof Error ? e.message : "Image generation failed."); }
    finally { setImageBusy(-1); }
  }
  const [singleImage, setSingleImage] = useState("");
  function download(data: string, name: string) { const a = document.createElement("a"); a.href = data; a.download = name + ".jpg"; a.click(); }
  async function copy(text: string) { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }

  return <main className="social-theme" style={{ minHeight: "100vh", padding: "34px clamp(18px,5vw,64px)", background: "#f6f2e9", color: "#30291f" }}>
    <header style={{ marginBottom: 22 }}><span style={{ color: "#a8752d", fontSize: 10, letterSpacing: ".12em", fontWeight: 800 }}>OAT SOCIAL AI · CREATE</span><h1 style={{ fontSize: 34, letterSpacing: "-.04em", margin: "10px 0 5px" }}>{carousel ? "Carousel Creation Studio" : "Instagram Post Studio"}</h1><p style={{ color: "#60738d", fontSize: 13, margin: 0 }}>{carousel ? "Plan a swipe-worthy story, one clear slide at a time." : "Create a polished single-image Instagram post with AI-written copy and artwork."}</p></header>
    <section style={{ ...panel, marginBottom: 16, background: "#f2e7d2" }}><strong style={{ color: "#8a5d20", fontSize: 13 }}>AI creation workspace</strong><p style={{ color: "#746957", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>OWN uses Cloudflare Workers AI for copy and image generation. Image generation uses your Cloudflare daily allowance. Generated visuals are AI-created artwork, not verified destination photography. Check all package details and brand assets before publishing.</p></section>
    <section style={{ ...panel, display: "grid", gap: 14 }}>
      <h2 style={{ fontSize: 17, margin: 0 }}>1. Creative brief</h2>
      <label style={label}>TOPIC / CAMPAIGN IDEA<input style={input} value={topic} onChange={e => setTopic(e.target.value)} placeholder={carousel ? "Example: 5 reasons to visit Kashmir" : "Example: Kashmir winter escape"} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <label style={label}>DESTINATION (OPTIONAL)<input style={input} value={destination} onChange={e => setDestination(e.target.value)} placeholder="Kashmir" /></label>
        <label style={label}>FORMAT<select style={input} value={format} onChange={e => setFormat(e.target.value)}><option>4:5</option><option>1:1</option><option>9:16</option></select></label>
        <label style={label}>TONE<select style={input} value={tone} onChange={e => setTone(e.target.value)}><option>Premium, inspiring and trustworthy</option><option>Energetic and youthful</option><option>Warm and emotional</option><option>Informative and practical</option><option>Promotional and direct</option></select></label>
      </div>
      <label style={label}>CONFIRMED PACKAGE FACTS (OPTIONAL)<textarea style={{ ...input, minHeight: 92, resize: "vertical" }} value={facts} onChange={e => setFacts(e.target.value)} placeholder="Add verified price, dates, inclusions and conditions. Leave blank if not confirmed." /></label>
      <div><button style={button} disabled={busy} onClick={() => void create()}>{busy ? "Creating with OWN…" : carousel ? "Generate carousel content" : "Generate post content"}</button></div>
    </section>
    {result && <section style={{ ...panel, marginTop: 16, display: "grid", gap: 15 }}>
      <div><h2 style={{ fontSize: 17, margin: "0 0 8px" }}>2. Review your content</h2><p style={{ fontSize: 12, color: "#60738d", margin: 0 }}>Edit and verify the copy before using it.</p></div>
      {!carousel && <label style={label}>HEADLINE<input style={input} value={result.headline || ""} onChange={e => setResult(p => p ? { ...p, headline: e.target.value } : p)} /></label>}
      <label style={label}>INSTAGRAM CAPTION<textarea style={{ ...input, minHeight: 120, resize: "vertical" }} value={result.caption} onChange={e => setResult(p => p ? { ...p, caption: e.target.value } : p)} /></label>
      <label style={label}>HASHTAGS<textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={result.hashtags || ""} onChange={e => setResult(p => p ? { ...p, hashtags: e.target.value } : p)} /></label>
      {!carousel && <>
        <label style={label}>IMAGE PROMPT<textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={result.visual_prompt || ""} onChange={e => setResult(p => p ? { ...p, visual_prompt: e.target.value } : p)} /></label>
        <section aria-label="Generated image result" style={{ border: "1px dashed #cbb99e", borderRadius: 14, padding: 16, background: "#faf6ee", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div><strong style={{ display: "block", fontSize: 14 }}>3. Image result</strong><span style={{ color: "#746957", fontSize: 11 }}>{singleImage ? "Your generated artwork is ready to review." : "Your generated Instagram artwork will appear here."}</span></div>
            {singleImage && <button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => download(singleImage, "oat-social-post")}>Download image</button>}
          </div>
          <div style={{ minHeight: 250, maxWidth: 620, width: "100%", aspectRatio: format === "9:16" ? "9 / 16" : format === "1:1" ? "1 / 1" : "4 / 5", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 11, border: "1px solid #e7dfd1", background: "linear-gradient(135deg,#eee4d3,#f8f3e9)" }}>
            {singleImage ? <img src={singleImage} alt="AI-generated Instagram post artwork" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /> : <div style={{ padding: 24, textAlign: "center", color: "#88775f" }}><div style={{ fontSize: 34, marginBottom: 8 }}>✧</div><strong style={{ display: "block", fontSize: 13 }}>No image generated yet</strong><span style={{ fontSize: 11 }}>Generate artwork to preview it in this box.</span></div>}
          </div>
          <div><button style={button} disabled={imageBusy !== -1} onClick={() => void makeImage()}>{imageBusy === -1 ? singleImage ? "Regenerate image with FLUX" : "Generate image with FLUX" : "Generating image…"}</button></div>
        </section>
      </>}
      {carousel && <div style={{ display: "grid", gap: 12 }}>{result.slides?.map((slide, i) => <article key={i} style={{ border: "1px solid #e7dfd1", borderRadius: 12, padding: 14, background: "#faf6ee", display: "grid", gap: 10 }}><strong style={{ fontSize: 13 }}>Slide {i + 1}</strong><label style={label}>SLIDE TITLE<input style={input} value={slide.title} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, title: e.target.value } : s) } : p)} /></label><label style={label}>SLIDE COPY<textarea style={{ ...input, minHeight: 64, resize: "vertical" }} value={slide.body} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, body: e.target.value } : s) } : p)} /></label><label style={label}>IMAGE PROMPT<textarea style={{ ...input, minHeight: 65, resize: "vertical" }} value={slide.image_prompt} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, image_prompt: e.target.value } : s) } : p)} /></label><button style={{ ...button, justifySelf: "start" }} disabled={imageBusy !== -1} onClick={() => void makeImage(i)}>{imageBusy === i ? "Generating…" : slide.image ? "Regenerate slide image" : "Generate slide image"}</button>{slide.image && <><img src={slide.image} alt={"AI-generated carousel slide " + (i + 1)} style={{ width: "100%", maxWidth: 460, borderRadius: 10 }} /><button style={{ ...button, justifySelf: "start", background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => download(slide.image!, "oat-carousel-slide-" + (i + 1))}>Download slide image</button></>}</article>)}</div>}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button style={button} onClick={() => void copy([result.caption, result.hashtags || ""].filter(Boolean).join("\n\n"))}>Copy caption + hashtags</button><button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => download("data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(result, null, 2)))), carousel ? "oat-carousel-content" : "oat-post-content")}>Download content brief</button></div>
    </section>}
    {error && <p role="alert" style={{ color: "#b42318", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</p>}
    {notice && <p role="status" style={{ color: "#0878d8", fontSize: 12 }}>{notice}</p>}
  </main>;
}
