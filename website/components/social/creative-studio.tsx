"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudioDraft } from "@/lib/social/studio-drafts";
import { StudioLogoControl } from "@/components/social/studio-logo-control";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";
import { saveCreation } from "@/lib/social/creations";
import { formatPublicPost, cleanPublicCaption } from "@/lib/social/caption-format";
import { composeWithBrandLogo, studioLogoCss, defaultStudioLogo, type StudioLogoPlacement, useBrandLogo } from "@/lib/social/brand-logo";

type Slide = { title: string; body: string; image_prompt: string; image?: string };
type Result = { headline?: string; caption: string; hashtags?: string; visual_prompt?: string; slides?: Slide[] };

const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #ded5c6", borderRadius: 9, padding: "12px 13px", background: "#fff", color: "#30291f", fontSize: 13 };
const label: React.CSSProperties = { display: "grid", gap: 7, color: "#746957", fontSize: 10, letterSpacing: ".08em", fontWeight: 700 };
const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: "11px 16px", background: "#a8752d", color: "#fff", fontWeight: 700, cursor: "pointer" };
const panel: React.CSSProperties = { border: "1px solid #e7dfd1", borderRadius: 15, padding: 20, background: "#fffdf8" };

export default function CreativeStudio({ mode }: { mode: "post" | "carousel" }) {
  const carousel = mode === "carousel";
  const brandLogo = useBrandLogo();
  const [topic, setTopic] = useState("");
  const [destination, setDestination] = useState("");
  const [facts, setFacts] = useState("");
  const [tone, setTone] = useState("Premium, inspiring and trustworthy");
  const [format, setFormat] = useState(carousel ? "4:5" : "4:5");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [musicHint, setMusicHint] = useState("");
  const [singleImage, setSingleImage] = useState("");
  const [instagram, setInstagram] = useState<"loading" | "connected" | "disconnected">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoPlacement,setLogoPlacement]=useState<StudioLogoPlacement>(defaultStudioLogo);

  const draftSnapshot=useMemo(()=>({topic,destination,facts,tone,format,result,singleImage,logoPlacement,musicHint}),[topic,destination,facts,tone,format,result,singleImage,logoPlacement,musicHint]);
  const draftState=useStudioDraft(carousel?"carousel":"post",draftSnapshot,saved=>{
   setTopic(saved.topic||"");setDestination(saved.destination||"");setFacts(saved.facts||"");
   setTone(saved.tone||"Premium, inspiring and trustworthy");setFormat(saved.format||"4:5");
   setResult(saved.result||null);setSingleImage(saved.singleImage||"");
   setLogoPlacement(saved.logoPlacement||defaultStudioLogo);setMusicHint(saved.musicHint||"");
  });
  async function create() {
    if (!topic.trim()) { setError("Enter a topic or campaign idea first."); return; }
    setBusy(true); setError(""); setNotice(""); setResult(null); setSavedId(""); setSingleImage(""); setPublished(false); setPublishedUrl("");
    const shape = carousel
      ? '{"caption":"Instagram caption","hashtags":"hashtags","slides":[{"title":"short slide headline","body":"supporting slide copy","image_prompt":"detailed image prompt for this slide"}]}'
      : '{"headline":"post headline","caption":"Instagram caption","hashtags":"hashtags","visual_prompt":"detailed image prompt for the post"}';
    const prompt = "Create " + (carousel ? "a 5 to 7 slide Instagram carousel" : "one Instagram single-image post") + " for On A Trip Holidays. Return ONLY valid JSON in this exact shape: " + shape + ". Topic: " + topic + ". Destination: " + (destination || "not specified") + ". Confirmed facts: " + (facts || "No package facts supplied. Do not invent prices, dates, availability or inclusions.") + ". Tone: " + tone + ". Design ratio: " + format + ". Use concise, polished, mobile-readable copy. Visual prompts should request premium realistic travel photography, authentic locations, no fake logos, no gibberish text in the image, and leave clean negative space for later typography. Do not claim generated images are real photographs. Make slide 1 a strong hook and the final slide a clear enquiry CTA. Keep each slide focused on one idea.";
    try {
      const raw = await generateSocialDraft(prompt);
      const clean = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
      const parsed = JSON.parse(clean) as Result;
      if (!parsed.caption || (carousel ? !Array.isArray(parsed.slides) || !parsed.slides.length : !parsed.visual_prompt)) throw new Error("OWN returned incomplete content. Please generate again.");
      setResult({ ...parsed, caption: cleanPublicCaption(parsed.caption) });
      setSavedId("");
      setNotice("Draft created with Google Gemini. Verify your package details before publishing.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create this draft.");
    } finally { setBusy(false); }
  }

  function uploadImage(file: File | undefined, index = -1) {
    if (!file || !file.type.startsWith("image/")) { setError("Select an image file."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("Image must be 12 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : "";
      if (!image) { setError("Could not read this image."); return; }
      if (carousel) setResult(prev => prev ? { ...prev, slides: prev.slides?.map((slide, i) => i === index ? { ...slide, image } : slide) } : prev);
      else setSingleImage(image);
      setError(""); setSavedId(""); setPublished(false); setPublishedUrl("");
      setNotice("Image loaded from your device. Review rights and quality before publishing.");
    };
    reader.onerror = () => setError("Could not read the image file.");
    reader.readAsDataURL(file);
  }
  useEffect(() => {
    if (carousel) return;
    let active = true;
    (async () => {
      try {
        const sb = getSocialSupabase();
        const { data: session } = await sb.auth.getSession();
        if (!session.session?.access_token) throw new Error("Not authenticated");
        const response = await fetch("/api/social/instagram/status", {
          headers: { Authorization: "Bearer " + session.session.access_token },
          cache: "no-store"
        });
        const value = await response.json() as { connected?: boolean };
        if (active) setInstagram(response.ok && value.connected ? "connected" : "disconnected");
      } catch { if (active) setInstagram("disconnected"); }
    })();
    return () => { active = false; };
  }, [carousel]);

  function jpegFromImage(dataUrl: string, ratio: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => {
        try {
          const targetRatio = ratio === "1:1" ? 1 : 4 / 5; // Feed publishing accepts 4:5 or square; 9:16 is padded to 4:5.
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = Math.round(canvas.width / targetRatio);
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Could not prepare the image on this device.")); return; }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / picture.naturalWidth, canvas.height / picture.naturalHeight);
          const width = picture.naturalWidth * scale, height = picture.naturalHeight * scale;
          ctx.drawImage(picture, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        } catch { reject(new Error("Could not convert this image to JPEG.")); }
      };
      picture.onerror = () => reject(new Error("Could not read this image. Upload a different JPG, PNG or WebP."));
      picture.src = dataUrl;
    });
  }
  async function publish() {
    if (!result || publishing || published || carousel) return;
    setError(""); setNotice("");
    if (instagram !== "connected") {
      setError("Connect your Instagram Business or Creator account in Accounts before publishing.");
      return;
    }
    if (!singleImage) { setError("Upload a photo to preview and publish."); return; }
    const parts = formatPublicPost(result.caption, result.hashtags || "");
    const message = parts.fullCaption;
    if (!message.trim()) { setError("Add an Instagram caption before publishing."); return; }
    if (!window.confirm("Publish this photo and caption to your connected Instagram account now? This will be visible to your followers.")) return;
    setPublishing(true);
    try {
      const sb = getSocialSupabase();
      const { data: session } = await sb.auth.getSession();
      if (!session.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      // Reuse the same saved creation and media container when an earlier request
      // was still processing. Creating a fresh container could duplicate a live post.
      let id = savedId;
      if (!id) {
        const branded = await composeWithBrandLogo(singleImage, brandLogo, logoPlacement);
        const jpeg = await jpegFromImage(branded, format);
        if (!jpeg.startsWith("data:image/jpeg;base64,") || jpeg.length > 16_000_000) throw new Error("The converted image is too large. Try a smaller photo.");
        const finalDraft = { ...result, caption: parts.caption, hashtags: parts.hashtags };
        id = await saveCreation({topic,destination,format,tone,facts,draft:finalDraft,image:jpeg,type:"post"});
        setSavedId(id);
        setSingleImage(jpeg);
      }
      const response = await fetch("/api/social/instagram/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.session.access_token
        },
        body: JSON.stringify({ creationId: id }),
        cache: "no-store"
      });
      const value = await response.json() as { published?: boolean; mediaId?: string; permalink?: string; error?: string; warning?: string };
      if (!response.ok || !value.published) throw new Error(value.error || "Instagram did not confirm publication.");
      setPublished(true);
      setPublishedUrl(typeof value.permalink === "string" ? value.permalink : "");
      setNotice("Instagram confirmed publication. " + (value.warning || "Your post is live and saved in Creations."));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to publish to Instagram.");
    } finally { setPublishing(false); }
  }
  async function save() {
    if (!result || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const brandedSlides = result.slides ? await Promise.all(result.slides.map(async slide => ({...slide, image: slide.image ? await composeWithBrandLogo(slide.image, brandLogo, logoPlacement) : undefined}))) : undefined;
      const id = await saveCreation({
        topic, destination, format, tone, facts,
        draft: { ...result, caption: cleanPublicCaption(result.caption), slides: brandedSlides }, image: singleImage ? (carousel ? await composeWithBrandLogo(singleImage, brandLogo, logoPlacement) : await jpegFromImage(await composeWithBrandLogo(singleImage, brandLogo, logoPlacement), format)) : undefined, type: carousel ? "carousel" : "post"
      });
      setSavedId(id);
      setNotice("Saved successfully to Creations. You can view or delete it there.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this creation.");
    } finally { setSaving(false); }
  }
  async function downloadBranded(data: string, name: string) {
    try { download(await composeWithBrandLogo(data, brandLogo, logoPlacement), name); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not export image with logo."); }
  }
  function download(data: string, name: string) {
    const mime = /^data:([^;,]+)/i.exec(data)?.[1]?.toLowerCase() || "";
    const extension = mime === "application/json" ? "json"
      : mime === "image/png" ? "png"
      : mime === "image/webp" ? "webp"
      : "jpg";
    const a = document.createElement("a");
    a.href = data;
    a.download = name + "." + extension;
    a.click();
  }
  async function copy(text: string) { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }

  return <main className="social-theme" style={{ minHeight: "100vh", padding: "34px clamp(18px,5vw,64px)", background: "#f6f2e9", color: "#30291f" }}>
    <header style={{ marginBottom: 22 }}><span style={{ color: "#a8752d", fontSize: 10, letterSpacing: ".12em", fontWeight: 800 }}>OAT SOCIAL AI · CREATE</span><h1 style={{ fontSize: 34, letterSpacing: "-.04em", margin: "10px 0 5px" }}>{carousel ? "Carousel Creation Studio" : "Instagram Post Studio"}</h1><p style={{ color: "#60738d", fontSize: 13, margin: 0 }}>{carousel ? "Plan a swipe-worthy story, one clear slide at a time." : "Create a polished single-image Instagram post with AI-written copy and artwork."}</p></header>
    <section style={{ ...panel, marginBottom: 16, background: "#f2e7d2" }}><strong style={{ color: "#8a5d20", fontSize: 13 }}>AI creation workspace</strong><p style={{ color: "#746957", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>Google Gemini powers post and carousel text on its eligible free API tier. Automated AI image generation is not included in the free tier. Upload your own authorized travel photograph or artwork for each post or slide. Check package facts and image rights before publishing.</p></section>
    {draftState.message&&<p role="status" style={{fontSize:12,color:"#87601f"}}>{draftState.message}</p>}
    <section style={{ ...panel, display: "grid", gap: 14 }}>
      <h2 style={{ fontSize: 17, margin: 0 }}>1. Creative brief</h2>
      <label style={label}>TOPIC / CAMPAIGN IDEA<input style={input} value={topic} onChange={e => setTopic(e.target.value)} placeholder={carousel ? "Example: 5 reasons to visit Kashmir" : "Example: Kashmir winter escape"} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <label style={label}>DESTINATION (OPTIONAL)<input style={input} value={destination} onChange={e => setDestination(e.target.value)} placeholder="Kashmir" /></label>
        <label style={label}>FORMAT<select style={input} value={format} onChange={e => setFormat(e.target.value)}><option>4:5</option><option>1:1</option><option>9:16</option></select></label>
        <label style={label}>TONE<select style={input} value={tone} onChange={e => setTone(e.target.value)}><option>Premium, inspiring and trustworthy</option><option>Energetic and youthful</option><option>Warm and emotional</option><option>Informative and practical</option><option>Promotional and direct</option></select></label>
      </div>
      <StudioLogoControl logo={brandLogo} placement={logoPlacement} onChange={setLogoPlacement} label={carousel ? "Add logo to carousel" : "Add logo to post"} />
      <label style={label}>CONFIRMED PACKAGE FACTS (OPTIONAL)<textarea style={{ ...input, minHeight: 92, resize: "vertical" }} value={facts} onChange={e => setFacts(e.target.value)} placeholder="Add verified price, dates, inclusions and conditions. Leave blank if not confirmed." /></label>
      <div><button style={button} disabled={busy} onClick={() => void create()}>{busy ? "Creating with Gemini…" : carousel ? "Generate carousel content" : "Generate post content"}</button></div>
    </section>
    {result && <section style={{ ...panel, marginTop: 16, display: "grid", gap: 15 }}>
      <div><h2 style={{ fontSize: 17, margin: "0 0 8px" }}>2. Review your content</h2><p style={{ fontSize: 12, color: "#60738d", margin: 0 }}>Edit and verify the copy before using it.</p></div>
      {!carousel && <label style={label}>HEADLINE<input style={input} value={result.headline || ""} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, headline: e.target.value } : p); }} /></label>}
      <label style={label}>INSTAGRAM CAPTION<textarea style={{ ...input, minHeight: 120, resize: "vertical" }} value={result.caption} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, caption: e.target.value } : p); }} /></label>
      <label style={label}>HASHTAGS<textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={result.hashtags || ""} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, hashtags: e.target.value } : p); }} /></label>
      {!carousel && <>
        <label style={label}>IMAGE PROMPT<textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={result.visual_prompt || ""} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, visual_prompt: e.target.value } : p); }} /></label>
        <section aria-label="Generated image result" style={{ border: "1px dashed #cbb99e", borderRadius: 14, padding: 16, background: "#faf6ee", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div><strong style={{ display: "block", fontSize: 14 }}>3. Image result</strong><span style={{ color: "#746957", fontSize: 11 }}>{singleImage ? "Your selected artwork is ready to review." : "Upload a travel photo or artwork to preview it here."}</span></div>
            {singleImage && <button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => void downloadBranded(singleImage, "oat-social-post")}>Download image</button>}
          </div>
          <div style={{ minHeight: 250, maxWidth: 620, width: "100%", aspectRatio: format === "9:16" ? "9 / 16" : format === "1:1" ? "1 / 1" : "4 / 5", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 11, border: "1px solid #e7dfd1", background: "linear-gradient(135deg,#eee4d3,#f8f3e9)" }}>
            {singleImage ? <div style={{position:"relative",width:"100%",height:"100%"}}><img src={singleImage} alt="Selected Instagram post image" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />{brandLogo?.url && logoPlacement.enabled && <img src={brandLogo.url} alt="Brand logo overlay" style={studioLogoCss(logoPlacement)} />}</div> : <div style={{ padding: 24, textAlign: "center", color: "#88775f" }}><div style={{ fontSize: 34, marginBottom: 8 }}>✧</div><strong style={{ display: "block", fontSize: 13 }}>No image selected yet</strong><span style={{ fontSize: 11 }}>Upload an image to preview it in this box.</span></div>}
          </div>
          <label style={{ ...label, display: "block" }}>UPLOAD IMAGE (FREE — FROM YOUR DEVICE)<input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0])} style={{ ...input, marginTop: 8 }} /></label>
        </section>
      </>}
      {!carousel && <section aria-label="Instagram post preview" style={{ border: "1px solid #e7dfd1", borderRadius: 15, padding: 18, background: "#f9f5ed", display: "grid", gap: 12 }}>
        <div><h2 style={{ margin: "0 0 5px", fontSize: 17 }}>4. Instagram preview</h2><p style={{ fontSize: 12, color: "#746957", margin: 0 }}>Live preview of the uploaded photo, caption and hashtags. Instagram may display it differently.</p></div>
        <div style={{ width: "100%", maxWidth: 470, margin: "0 auto", background: "#fff", border: "1px solid #e5e1db", borderRadius: 13, overflow: "hidden", boxShadow: "0 8px 25px #4a311311" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px" }}>
            <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: "#ae7c35", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>OAT</div>
            <div style={{ display: "grid", gap: 2 }}><strong style={{ fontSize: 12 }}>ON A TRIP HOLIDAYS</strong><span style={{ fontSize: 10, color: "#817566" }}>Instagram post preview</span></div>
            <span aria-hidden="true" style={{ marginLeft: "auto", fontSize: 20, color: "#5c5145" }}>···</span>
          </div>
          <div style={{ width: "100%", aspectRatio: format === "9:16" ? "9 / 16" : format === "1:1" ? "1 / 1" : "4 / 5", maxHeight: 550, background: "#eee5d7", display: "grid", placeItems: "center", overflow: "hidden" }}>
            {singleImage ? <div style={{position:"relative",width:"100%",height:"100%"}}><img src={singleImage} alt="Your selected Instagram post photograph" style={{ width: "100%", height: "100%", objectFit: "contain" }} />{brandLogo?.url && logoPlacement.enabled && <img src={brandLogo.url} alt="Brand logo overlay" style={studioLogoCss(logoPlacement)} />}</div> : <div style={{ textAlign: "center", padding: 25, color: "#8b7b64" }}>Upload an image above to see your post preview</div>}
          </div>
          <div style={{ padding: "11px 14px 17px" }}>
            <div aria-hidden="true" style={{ display: "flex", gap: 14, fontSize: 22, marginBottom: 10, color: "#292929" }}><span>♡</span><span>♧</span><span>➤</span><span style={{ marginLeft: "auto" }}>♧</span></div>
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.6, color: "#2e2b26" }}><strong>ON A TRIP HOLIDAYS</strong>{" "}{cleanPublicCaption(result.caption) || "Your caption appears here."}</div>
            {!!formatPublicPost(result.caption, result.hashtags || "").hashtags && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.65, color: "#215a88", margin: "8px 0 0" }}>{formatPublicPost(result.caption, result.hashtags || "").hashtags}</p>}
            <div style={{ color: "#998b79", fontSize: 10, marginTop: 12 }}>{published ? "Published to Instagram" : "Preview only · Not published"}</div>
          </div>
        </div>
      </section>}

      {!carousel && <section aria-label="Instagram music idea" style={{padding:14,background:"#fffaf1",border:"1px solid #e7dfd1",borderRadius:12}}>
        <strong style={{fontSize:13}}>Music suggestion for this post</strong>
        <p style={{fontSize:12,color:"#746957",lineHeight:1.6,margin:"6px 0"}}>Suggested vibe: {musicHint || (/dubai/i.test(destination+" "+topic)?"Cinematic Arabian-inspired instrumental":/kerala|alleppey|backwater/i.test(destination+" "+topic)?"Calm tropical acoustic and flute":/manali|kashmir|himachal/i.test(destination+" "+topic)?"Uplifting mountain-travel instrumental":"Warm cinematic travel instrumental")}.</p>
        <label style={label}>YOUR MUSIC NOTES<input style={input} value={musicHint} onChange={e=>setMusicHint(e.target.value)} placeholder="Example: peaceful sunset instrumental" /></label>
        <p style={{fontSize:11,color:"#8a7b68",lineHeight:1.5}}>Instagram's licensed music library cannot be attached to an API-published photo. Open Instagram to choose a permitted song manually. Suggestions are not embedded or published as audio.</p>
      </section>}
      {carousel && <div style={{ display: "grid", gap: 12 }}>{result.slides?.map((slide, i) => <article key={i} style={{ border: "1px solid #e7dfd1", borderRadius: 12, padding: 14, background: "#faf6ee", display: "grid", gap: 10 }}><strong style={{ fontSize: 13 }}>Slide {i + 1}</strong><label style={label}>SLIDE TITLE<input style={input} value={slide.title} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, title: e.target.value } : s) } : p)} /></label><label style={label}>SLIDE COPY<textarea style={{ ...input, minHeight: 64, resize: "vertical" }} value={slide.body} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, body: e.target.value } : s) } : p)} /></label><label style={label}>IMAGE PROMPT<textarea style={{ ...input, minHeight: 65, resize: "vertical" }} value={slide.image_prompt} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, image_prompt: e.target.value } : s) } : p)} /></label><label style={{ ...label, display: "block" }}>UPLOAD SLIDE IMAGE<input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0], i)} style={{ ...input, marginTop: 8 }} /></label>{slide.image && <><div style={{position:"relative",width:"100%",maxWidth:460}}><img src={slide.image} alt={"Uploaded carousel slide " + (i + 1)} style={{ width: "100%", borderRadius: 10 }} />{brandLogo?.url && logoPlacement.enabled && <img src={brandLogo.url} alt="Brand logo overlay" style={studioLogoCss(logoPlacement)} />}</div><button style={{ ...button, justifySelf: "start", background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => void downloadBranded(slide.image!, "oat-carousel-slide-" + (i + 1))}>Download slide image</button></>}</article>)}</div>}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button style={button} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : savedId ? "Save another copy" : "Save to Creations"}</button><button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => window.location.assign("/social/creations")}>View Creations</button><button style={button} onClick={() => void copy(formatPublicPost(result.caption, result.hashtags || "").fullCaption)}>Copy caption + hashtags</button><button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => download("data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify({ ...result, caption: cleanPublicCaption(result.caption) }, null, 2)))), carousel ? "oat-carousel-content" : "oat-post-content")}>Download content brief</button>{!carousel && <>
      <button type="button" style={{ ...button, background: published ? "#398357" : "#a8752d", opacity: publishing ? 0.65 : 1 }} disabled={publishing || published || instagram === "loading"} onClick={() => void publish()}>{published ? "Published to Instagram" : publishing ? "Publishing…" : "Publish to Instagram"}</button>

      {published && <button type="button" style={{...button,background:"#fff",color:"#a12c20",border:"1px solid #d7a59e"}} onClick={()=>{ if (!window.confirm("Open Instagram to delete this published post manually? Deleting a saved draft does NOT remove Instagram media.")) return; window.open(publishedUrl || "https://www.instagram.com/", "_blank", "noopener,noreferrer"); }}>Delete on Instagram</button>}
      {instagram === "disconnected" && <a href="/social/instagram" style={{ alignSelf: "center", color: "#8a5d20", fontSize: 12, fontWeight: 700 }}>Connect Instagram first</a>}
      </>}</div>
    </section>}
    {error && <p role="alert" style={{ color: "#b42318", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</p>}
    {notice && <p role="status" style={{ color: "#23764d", fontSize: 12 }}>{notice}</p>}
  </main>;
}
