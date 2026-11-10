"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStudioDraft } from "@/lib/social/studio-drafts";
import { StudioLogoControl } from "@/components/social/studio-logo-control";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialImage, imageGenerationConfigured } from "@/lib/social/image-generation";
import { generateSocialDraft } from "@/lib/social/generate";
import { saveCreation } from "@/lib/social/creations";
import { formatPublicPost, cleanPublicCaption } from "@/lib/social/caption-format";
import { composeWithBrandLogo, defaultStudioLogo, type StudioLogoPlacement, useBrandLogo } from "@/lib/social/brand-logo";

import { composePoster, type PosterStyle } from "@/lib/social/poster";
import { PosterPreview } from "@/components/social/poster-preview";

type Slide = { title: string; body: string; image_prompt: string; image?: string };
type Result = { poster_title?: string; poster_details?: string; poster_cta?: string; headline?: string; caption: string; hashtags?: string; visual_prompt?: string; slides?: Slide[] };

const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #ded5c6", borderRadius: 9, padding: "12px 13px", background: "#fff", color: "#30291f", fontSize: 13 };
const label: React.CSSProperties = { display: "grid", gap: 7, color: "#746957", fontSize: 10, letterSpacing: ".08em", fontWeight: 700 };
const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: "11px 16px", background: "#a8752d", color: "#fff", fontWeight: 700, cursor: "pointer" };
const panel: React.CSSProperties = { border: "1px solid #e7dfd1", borderRadius: 15, padding: 20, background: "#fffdf8" };

export default function CreativeStudio({ mode }: { mode: "post" | "carousel" }) {
  const carousel = mode === "carousel";
  const [imageService, setImageService] = useState<"loading" | "ready" | "setup" | "error">("loading");
  const [imageBusy, setImageBusy] = useState<number | null>(null);
  const imageRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    imageGenerationConfigured(controller.signal).then(ready => setImageService(ready ? "ready" : "setup")).catch(() => { if (!controller.signal.aborted) setImageService("error"); });
    return () => { controller.abort(); imageRequest.current?.abort(); };
  }, []);
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

  const [posterEnabled, setPosterEnabled] = useState(true);
  const [posterStyle, setPosterStyle] = useState<PosterStyle>("light");
  function posterText(index = -1) {
    const slide = result?.slides?.[index];
    return { title: slide ? slide.title : result?.poster_title ?? (destination || result?.headline || ""),
      details: slide ? slide.body : result?.poster_details || "",
      cta: result?.poster_cta ?? (carousel ? "Swipe to explore" : "Plan your trip with us") };
  }
  async function finalImage(data: string, index = -1) {
    const poster = await composePoster(data, format, posterText(index), posterEnabled, posterStyle);
    return composeWithBrandLogo(poster, brandLogo, logoPlacement);
  }
  // A saved image must never be reused after its text, artwork or branding changes.
  useEffect(() => { setSavedId(""); setPublished(false); setPublishedUrl(""); }, [result, singleImage, posterEnabled, posterStyle, logoPlacement, brandLogo, format, destination]);

  const draftSnapshot=useMemo(()=>({topic,destination,facts,tone,format,result,singleImage,logoPlacement,musicHint,posterEnabled,posterStyle}),[topic,destination,facts,tone,format,result,singleImage,logoPlacement,musicHint,posterEnabled,posterStyle]);
  const draftState=useStudioDraft(carousel?"carousel":"post",draftSnapshot,saved=>{
   setPosterEnabled(saved.posterEnabled ?? true);setPosterStyle(saved.posterStyle || "light");
   setTopic(saved.topic||"");setDestination(saved.destination||"");setFacts(saved.facts||"");
   setTone(saved.tone||"Premium, inspiring and trustworthy");setFormat(saved.format||"4:5");
   setResult(saved.result||null);setSingleImage(saved.singleImage||"");
   setLogoPlacement(saved.logoPlacement||defaultStudioLogo);setMusicHint(saved.musicHint||"");
  });
  async function create() {
    if (!topic.trim()) { setError("Enter a topic or campaign idea first."); return; }
    setBusy(true); setError(""); setNotice(""); setResult(null); setSavedId(""); setSingleImage(""); setPublished(false); setPublishedUrl("");
    const shape = carousel
      ? '{"poster_cta":"Swipe to explore","caption":"Instagram caption","hashtags":"hashtags","slides":[{"title":"short slide headline","body":"short supporting copy, max 180 characters","image_prompt":"detailed image prompt for this slide"}]}'
      : '{"poster_title":"destination name","poster_details":"2 to 4 short destination highlights or confirmed package facts, max 180 characters","poster_cta":"short enquiry CTA, max 70 characters","headline":"post headline","caption":"Instagram caption","hashtags":"hashtags","visual_prompt":"detailed image prompt for the post"}';
    const prompt = "Create " + (carousel ? "a 5 to 7 slide Instagram carousel" : "one Instagram single-image post") + " for On A Trip Holidays. Return ONLY valid JSON in this exact shape: " + shape + ". Topic: " + topic + ". Destination: " + (destination || "not specified") + ". Confirmed facts: " + (facts || "No package facts supplied. Do not invent prices, dates, availability or inclusions.") + ". Tone: " + tone + ". Design ratio: " + format + ". Use concise, polished, mobile-readable copy. Visual prompts should request premium realistic travel photography, authentic locations, no fake logos, no gibberish text in the image, and leave clean negative space for later typography. For the travel poster, arrange authentic destination scenery and a tasteful blended collage of landmarks in the lower 60 percent; keep the upper area uncluttered for a large destination title. Generate scenery only, without lettering. Do not claim generated images are real photographs. Make slide 1 a strong hook and the final slide a clear enquiry CTA. Keep each slide focused on one idea.";
    try {
      const raw = await generateSocialDraft(prompt);
      const clean = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
      const parsed = JSON.parse(clean) as Result;
      if (!parsed.caption || (carousel ? !Array.isArray(parsed.slides) || !parsed.slides.length : !parsed.visual_prompt)) throw new Error("OWN returned incomplete content. Please generate again.");
      setResult({ ...parsed, poster_title: parsed.poster_title || destination || parsed.headline || topic, caption: cleanPublicCaption(parsed.caption) });
      setSavedId("");
      setNotice("Draft created with Google Gemini. Verify your package details before publishing.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create this draft.");
    } finally { setBusy(false); }
  }

  async function generateImage(index = -1) {
    if (!result || imageRequest.current || busy || saving || publishing) return;
    const prompt = carousel ? result.slides?.[index]?.image_prompt : result.visual_prompt;
    if (!prompt?.trim()) { setError("Add an image prompt first."); return; }
    if (prompt.length > 1600) { setError("Shorten the image prompt to 1,600 characters or fewer."); return; }
    const existing = carousel ? result.slides?.[index]?.image : singleImage;
    if (existing && !window.confirm("Generate a replacement image? Your current artwork will be replaced only after generation succeeds.")) return;
    const controller = new AbortController();
    imageRequest.current = controller;
    setImageBusy(index); setError(""); setNotice("");
    try {
      const image = await generateSocialImage(prompt, format, controller.signal);
      if (controller.signal.aborted) return;
      if (carousel) setResult(prev => prev ? { ...prev, slides: prev.slides?.map((slide, i) => i === index ? { ...slide, image } : slide) } : prev);
      else setSingleImage(image);
      setSavedId(""); setPublished(false); setPublishedUrl("");
      setNotice("AI artwork generated with Cloudflare and cropped to " + format + ". Review the composition and destination accuracy, then save to Creations. Your logo is applied using your current logo settings.");
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Image generation failed. Your current artwork is unchanged.");
    } finally {
      if (imageRequest.current === controller) { imageRequest.current = null; setImageBusy(null); }
    }
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
        const branded = await finalImage(singleImage);
        const jpeg = await jpegFromImage(branded, format);
        if (!jpeg.startsWith("data:image/jpeg;base64,") || jpeg.length > 16_000_000) throw new Error("The converted image is too large. Try a smaller photo.");
        const finalDraft = { ...result, poster_enabled: posterEnabled, poster_style: posterStyle, caption: parts.caption, hashtags: parts.hashtags };
        id = await saveCreation({topic,destination,format,tone,facts,draft:finalDraft,image:jpeg,type:"post"});
        setSavedId(id);

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
      const brandedSlides = result.slides ? await Promise.all(result.slides.map(async (slide, index) => ({...slide, image: slide.image ? await finalImage(slide.image, index) : undefined}))) : undefined;
      const id = await saveCreation({
        topic, destination, format, tone, facts,
        draft: { ...result, poster_enabled: posterEnabled, poster_style: posterStyle, caption: cleanPublicCaption(result.caption), slides: brandedSlides }, image: singleImage ? (carousel ? await finalImage(singleImage) : await jpegFromImage(await finalImage(singleImage), format)) : undefined, type: carousel ? "carousel" : "post"
      });
      setSavedId(id);
      setNotice("Saved successfully to Creations. You can view or delete it there.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this creation.");
    } finally { setSaving(false); }
  }
  async function downloadBranded(data: string, name: string, index = -1) {
    try { download(await finalImage(data, index), name); }
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
    <section style={{ ...panel, marginBottom: 16, background: "#f2e7d2" }}><strong style={{ color: "#8a5d20", fontSize: 13 }}>AI creation workspace</strong><p style={{ color: "#746957", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>Google Gemini writes your post and carousel text. Generate AI artwork from the image prompt with Cloudflare, or upload your own travel photo. Image generation uses a daily allowance; no paid fallback is enabled. AI artwork may not depict a destination accurately. Verify package facts and visuals before publishing.</p></section>
    <p role="status" style={{fontSize:12,color:"#746957"}}>{imageService === "loading" ? "Checking image generation…" : imageService === "ready" ? "Image generation available · Create your content first, then generate artwork below." : imageService === "setup" ? "Image service needs setup. You can still create text and upload your own images." : "Could not check the image service. Refresh this page to retry; uploads are still available."}</p>
    {draftState.message&&<p role="status" style={{fontSize:12,color:"#87601f"}}>{draftState.message}</p>}
    <section style={{ ...panel, display: "grid", gap: 14 }}>
      <h2 style={{ fontSize: 17, margin: 0 }}>1. Creative brief</h2>
      <label style={label}>TOPIC / CAMPAIGN IDEA<input style={input} value={topic} onChange={e => setTopic(e.target.value)} placeholder={carousel ? "Example: 5 reasons to visit Kashmir" : "Example: Kashmir winter escape"} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <label style={label}>DESTINATION (OPTIONAL)<input style={input} value={destination} onChange={e => setDestination(e.target.value)} placeholder="Kashmir" /></label>
        <label style={label}>FORMAT<select style={input} value={format} disabled={imageBusy !== null} onChange={e => setFormat(e.target.value)}><option>4:5</option><option>1:1</option><option>9:16</option></select></label>
        <label style={label}>TONE<select style={input} value={tone} onChange={e => setTone(e.target.value)}><option>Premium, inspiring and trustworthy</option><option>Energetic and youthful</option><option>Warm and emotional</option><option>Informative and practical</option><option>Promotional and direct</option></select></label>
      </div>
      <StudioLogoControl logo={brandLogo} placement={logoPlacement} onChange={setLogoPlacement} label={carousel ? "Add logo to carousel" : "Add logo to post"} />
      <label style={label}>CONFIRMED PACKAGE FACTS (OPTIONAL)<textarea style={{ ...input, minHeight: 92, resize: "vertical" }} value={facts} onChange={e => setFacts(e.target.value)} placeholder="Add verified price, dates, inclusions and conditions. Leave blank if not confirmed." /></label>
      <div><button style={button} disabled={busy || imageBusy !== null} onClick={() => void create()}>{busy ? "Creating with Gemini…" : carousel ? "Generate carousel content" : "Generate post content"}</button></div>
    </section>
    {result && <section style={{ ...panel, marginTop: 16, display: "grid", gap: 15 }}>
      <div><h2 style={{ fontSize: 17, margin: "0 0 8px" }}>2. Review your content</h2><p style={{ fontSize: 12, color: "#60738d", margin: 0 }}>Edit and verify the copy before using it.</p></div>
      <fieldset disabled={saving || publishing || imageBusy !== null} style={{border:"1px solid #ded5c6",borderRadius:12,padding:16,display:"grid",gap:12}}>
        <legend style={{fontWeight:700,fontSize:14}}>Destination poster design</legend>
        <label style={{fontSize:13}}><input type="checkbox" checked={posterEnabled} onChange={e=>setPosterEnabled(e.target.checked)} /> Add text directly onto the image</label>
        <p style={{fontSize:12,color:"#746957",margin:0}}>Large destination title, readable details and a call to action, like a travel poster. Your saved, downloaded and published images include this design. Edit prices and dates only when confirmed.</p>
        <label style={label}>POSTER STYLE<select style={input} value={posterStyle} onChange={e=>setPosterStyle(e.target.value as PosterStyle)}><option value="light">Light editorial · green title</option><option value="dark">Dark cinematic · white title</option></select></label>
        {!carousel && <><label style={label}>DESTINATION TITLE<input style={input} maxLength={100} value={result.poster_title ?? (destination || result.headline || "")} onChange={e=>setResult(p=>p?{...p,poster_title:e.target.value}:p)} /></label>
        <label style={label}>DETAILS ON IMAGE<textarea style={{...input,minHeight:72}} maxLength={240} value={result.poster_details || ""} placeholder="Backwaters • Tea gardens • Beaches • Wildlife" onChange={e=>setResult(p=>p?{...p,poster_details:e.target.value}:p)} /></label></>}
        {carousel && <p style={{fontSize:12,margin:0}}>Each slide uses its editable slide title and slide copy below.</p>}
        <label style={label}>CALL TO ACTION<input style={input} maxLength={100} value={result.poster_cta ?? (carousel?"Swipe to explore":"Plan your trip with us")} onChange={e=>setResult(p=>p?{...p,poster_cta:e.target.value}:p)} /></label>
      </fieldset>
      {!carousel && <label style={label}>HEADLINE<input style={input} value={result.headline || ""} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, headline: e.target.value } : p); }} /></label>}
      <label style={label}>INSTAGRAM CAPTION<textarea style={{ ...input, minHeight: 120, resize: "vertical" }} value={result.caption} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, caption: e.target.value } : p); }} /></label>
      <label style={label}>HASHTAGS<textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={result.hashtags || ""} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, hashtags: e.target.value } : p); }} /></label>
      {!carousel && <>
        <label style={label}>IMAGE PROMPT<textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={result.visual_prompt || ""} disabled={imageBusy !== null} maxLength={1600} onChange={e => { setSavedId(""); setPublished(false); setResult(p => p ? { ...p, visual_prompt: e.target.value } : p); }} /></label>
        <section aria-label="Generated image result" style={{ border: "1px dashed #cbb99e", borderRadius: 14, padding: 16, background: "#faf6ee", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div><strong style={{ display: "block", fontSize: 14 }}>3. Image result</strong><span style={{ color: "#746957", fontSize: 11 }}>{singleImage ? "Your selected artwork is ready to review." : "Generate an AI image or upload a travel photo to preview it here."}</span></div>
            {singleImage && <button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => void downloadBranded(singleImage, "oat-social-post")}>Download image</button>}
          </div>
          <div style={{ minHeight: 250, maxWidth: 620, width: "100%", aspectRatio: format === "9:16" ? "9 / 16" : format === "1:1" ? "1 / 1" : "4 / 5", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 11, border: "1px solid #e7dfd1", background: "linear-gradient(135deg,#eee4d3,#f8f3e9)" }}>
            {singleImage ? <PosterPreview source={singleImage} ratio={format} text={posterText()} enabled={posterEnabled} style={posterStyle} logo={brandLogo} placement={logoPlacement} /> : <div style={{ padding: 24, textAlign: "center", color: "#88775f" }}><div style={{ fontSize: 34, marginBottom: 8 }}>✧</div><strong style={{ display: "block", fontSize: 13 }}>No image selected yet</strong><span style={{ fontSize: 11 }}>Generate an image above or upload one below.</span></div>}
          </div>
          <div><button type="button" style={{...button,opacity:imageBusy !== null ? 0.65 : 1}} disabled={imageService !== "ready" || imageBusy !== null || busy || saving || publishing} onClick={() => void generateImage()}>{imageBusy === -1 ? "Generating image…" : singleImage ? "Regenerate AI image" : "Generate AI image"}</button><p style={{fontSize:11,color:"#746957",lineHeight:1.6}}>Uses the image prompt above. Generated artwork is cropped to {format}; review before downloading or publishing.</p></div>
          <label style={{ ...label, display: "block" }}>UPLOAD IMAGE (FREE — FROM YOUR DEVICE)<input type="file" accept="image/*" disabled={imageBusy !== null} onChange={e => uploadImage(e.target.files?.[0])} style={{ ...input, marginTop: 8 }} /></label>
        </section>
      </>}
      {!carousel && <section aria-label="Instagram post preview" style={{ border: "1px solid #e7dfd1", borderRadius: 15, padding: 18, background: "#f9f5ed", display: "grid", gap: 12 }}>
        <div><h2 style={{ margin: "0 0 5px", fontSize: 17 }}>4. Instagram preview</h2><p style={{ fontSize: 12, color: "#746957", margin: 0 }}>Live preview of your selected artwork, caption and hashtags. Instagram may display it differently.</p></div>
        <div style={{ width: "100%", maxWidth: 470, margin: "0 auto", background: "#fff", border: "1px solid #e5e1db", borderRadius: 13, overflow: "hidden", boxShadow: "0 8px 25px #4a311311" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px" }}>
            <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: "#ae7c35", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>OAT</div>
            <div style={{ display: "grid", gap: 2 }}><strong style={{ fontSize: 12 }}>ON A TRIP HOLIDAYS</strong><span style={{ fontSize: 10, color: "#817566" }}>Instagram post preview</span></div>
            <span aria-hidden="true" style={{ marginLeft: "auto", fontSize: 20, color: "#5c5145" }}>···</span>
          </div>
          <div style={{ width: "100%", aspectRatio: format === "9:16" ? "9 / 16" : format === "1:1" ? "1 / 1" : "4 / 5", maxHeight: 550, background: "#eee5d7", display: "grid", placeItems: "center", overflow: "hidden" }}>
            {singleImage ? <PosterPreview source={singleImage} ratio={format} text={posterText()} enabled={posterEnabled} style={posterStyle} logo={brandLogo} placement={logoPlacement} /> : <div style={{ textAlign: "center", padding: 25, color: "#8b7b64" }}>Generate or upload an image above to see your post preview</div>}
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
      {carousel && <div style={{ display: "grid", gap: 12 }}>{result.slides?.map((slide, i) => <article key={i} style={{ border: "1px solid #e7dfd1", borderRadius: 12, padding: 14, background: "#faf6ee", display: "grid", gap: 10 }}><strong style={{ fontSize: 13 }}>Slide {i + 1}</strong><label style={label}>SLIDE TITLE<input style={input} value={slide.title} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, title: e.target.value } : s) } : p)} /></label><label style={label}>SLIDE COPY<textarea style={{ ...input, minHeight: 64, resize: "vertical" }} value={slide.body} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, body: e.target.value } : s) } : p)} /></label><label style={label}>IMAGE PROMPT<textarea style={{ ...input, minHeight: 65, resize: "vertical" }} value={slide.image_prompt} disabled={imageBusy !== null} maxLength={1600} onChange={e => setResult(p => p ? { ...p, slides: p.slides?.map((s, n) => n === i ? { ...s, image_prompt: e.target.value } : s) } : p)} /></label><button type="button" style={{...button,justifySelf:"start"}} disabled={imageService !== "ready" || imageBusy !== null || busy || saving || publishing} onClick={() => void generateImage(i)}>{imageBusy === i ? "Generating slide image…" : slide.image ? "Regenerate slide image" : "Generate slide image"}</button><label style={{ ...label, display: "block" }}>UPLOAD SLIDE IMAGE<input type="file" accept="image/*" disabled={imageBusy !== null} onChange={e => uploadImage(e.target.files?.[0], i)} style={{ ...input, marginTop: 8 }} /></label>{slide.image && <><div style={{maxWidth:460,aspectRatio:format.replace(":"," / ")}}><PosterPreview source={slide.image} ratio={format} text={posterText(i)} enabled={posterEnabled} style={posterStyle} logo={brandLogo} placement={logoPlacement} /></div><button style={{ ...button, justifySelf: "start", background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => void downloadBranded(slide.image!, "oat-carousel-slide-" + (i + 1), i)}>Download slide image</button></>}</article>)}</div>}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button style={button} disabled={saving || imageBusy !== null} onClick={() => void save()}>{saving ? "Saving…" : savedId ? "Save another copy" : "Save to Creations"}</button><button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => window.location.assign("/social/creations")}>View Creations</button><button style={button} onClick={() => void copy(formatPublicPost(result.caption, result.hashtags || "").fullCaption)}>Copy caption + hashtags</button><button style={{ ...button, background: "#fff", color: "#8a5d20", border: "1px solid #d7c7ae" }} onClick={() => download("data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify({ ...result, caption: cleanPublicCaption(result.caption) }, null, 2)))), carousel ? "oat-carousel-content" : "oat-post-content")}>Download content brief</button>{!carousel && <>
      <button type="button" style={{ ...button, background: published ? "#398357" : "#a8752d", opacity: publishing ? 0.65 : 1 }} disabled={publishing || published || imageBusy !== null || instagram === "loading"} onClick={() => void publish()}>{published ? "Published to Instagram" : publishing ? "Publishing…" : "Publish to Instagram"}</button>

      {published && <button type="button" style={{...button,background:"#fff",color:"#a12c20",border:"1px solid #d7a59e"}} onClick={()=>{ if (!window.confirm("Open Instagram to delete this published post manually? Deleting a saved draft does NOT remove Instagram media.")) return; window.open(publishedUrl || "https://www.instagram.com/", "_blank", "noopener,noreferrer"); }}>Delete on Instagram</button>}
      {instagram === "disconnected" && <a href="/social/instagram" style={{ alignSelf: "center", color: "#8a5d20", fontSize: 12, fontWeight: 700 }}>Connect Instagram first</a>}
      </>}</div>
    </section>}
    {error && <p role="alert" style={{ color: "#b42318", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</p>}
    {notice && <p role="status" style={{ color: "#23764d", fontSize: 12 }}>{notice}</p>}
  </main>;
}
