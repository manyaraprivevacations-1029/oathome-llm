"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";

type Clip = { id: number; start: number; end: number; title: string };
type CaptureVideo = HTMLVideoElement & { captureStream?: () => MediaStream };

const panel: CSSProperties = { background: "#fffdfa", border: "1px solid #e6ddcf", borderRadius: 16, padding: 22, boxShadow: "0 4px 20px #4b39100a" };
const field: CSSProperties = { background: "#fff", border: "1px solid #dcd2c2", borderRadius: 8, padding: "10px 12px", width: "100%", color: "#31291e", boxSizing: "border-box" };
const button: CSSProperties = { border: 0, borderRadius: 9, padding: "11px 15px", background: "#a8752d", color: "#fff", cursor: "pointer", fontWeight: 700 };
const secondary: CSSProperties = { ...button, background: "#f4eee4", color: "#765423", border: "1px solid #e5d8c5" };

function stamp(s: number) { const n = Math.max(0, Math.floor(s)); return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0"); }
function durationNumber(value: number, fallback: number) { return Number.isFinite(value) ? value : fallback; }
function suggestedClips(duration: number, count: number, length: number): Clip[] {
  const safeLength = Math.min(length, duration);
  if (duration <= safeLength) return [{ id: 1, start: 0, end: duration, title: "Full video" }];
  return Array.from({ length: count }, (_, i) => {
    const start = Math.min(Math.max(0, duration - safeLength), (duration - safeLength) * (count === 1 ? 0.5 : i / (count - 1)));
    return { id: i + 1, start: Number(start.toFixed(2)), end: Number((start + safeLength).toFixed(2)), title: "Suggested clip " + (i + 1) };
  });
}

export default function AutoClipStudioPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const urlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [length, setLength] = useState(0);
  const [count, setCount] = useState(3);
  const [target, setTarget] = useState(30);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState(1);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloads, setDownloads] = useState<{ id: number; href: string; name: string }[]>([]);
  const clip = clips.find(x => x.id === selected) || clips[0];

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);
  useEffect(() => () => {
    for (const item of downloads) URL.revokeObjectURL(item.href);
  }, [downloads]);

  function selectFile(next: File | undefined) {
    if (!next) return;
    if (!(next.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(next.name))) { setStatus("Choose a supported video file (MP4, MOV or WebM)."); return; }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const nextUrl = URL.createObjectURL(next);
    urlRef.current = nextUrl;
    setFile(next); setUrl(nextUrl); setLength(0); setClips([]); setSelected(1);
    setDownloads([]); setStatus("Video loaded locally. Preparing preview…");
  }
  function metadata() {
    const duration = durationNumber(videoRef.current?.duration || 0, 0);
    if (!duration || !Number.isFinite(duration)) { setStatus("This browser could not read the video duration."); return; }
    setLength(duration);
    const next = suggestedClips(duration, count, target);
    setClips(next); setSelected(next[0].id); setStatus("Ready. Suggestions are evenly spaced, not AI-ranked highlights.");
  }
  function regenerate() {
    if (!length) return;
    const next = suggestedClips(length, count, target);
    setClips(next); setSelected(next[0].id); setStatus("Updated clip suggestions.");
  }
  function updateClip(id: number, key: "start" | "end" | "title", value: string) {
    setClips(previous => previous.map(item => {
      if (item.id !== id) return item;
      if (key === "title") return { ...item, title: value };
      const numeric = Number(value);
      return { ...item, [key]: Number.isFinite(numeric) ? Math.max(0, Math.min(length, numeric)) : 0 };
    }));
  }
  async function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = Math.max(0, Math.min(length, seconds));
    setStatus("Preview positioned at " + stamp(seconds) + ".");
  }
  async function exportClip(item: Clip) {
    const video = videoRef.current as CaptureVideo | null;
    if (!video || !file || exporting) return;
    if (item.end <= item.start || item.end > length + 0.2) { setStatus("Clip end must be after its start and inside the source video."); return; }
    if (!video.captureStream || typeof MediaRecorder === "undefined") {
      setStatus("Video export requires a browser supporting video.captureStream and MediaRecorder. Try the latest Chrome desktop.");
      return;
    }
    const types = ["video/mp4;codecs=avc1,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mimeType = types.find(x => MediaRecorder.isTypeSupported(x));
    if (!mimeType) { setStatus("No compatible recording format is available in this browser."); return; }
    setExporting(true); setProgress(0); setStatus("Recording the selected segment locally. Keep this tab open.");
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let watcher: (() => void) | null = null;
    try {
      video.pause();
      video.currentTime = item.start;
      await new Promise<void>((resolve, reject) => {
        if (Math.abs(video.currentTime - item.start) < 0.05 && video.readyState >= 2) { resolve(); return; }
        const ok = () => { cleanup(); resolve(); };
        const fail = () => { cleanup(); reject(new Error("Unable to seek video.")); };
        const cleanup = () => { video.removeEventListener("seeked", ok); video.removeEventListener("error", fail); };
        video.addEventListener("seeked", ok, { once: true });
        video.addEventListener("error", fail, { once: true });
        video.currentTime = Math.min(length, item.start + 0.001);
      });
      stream = video.captureStream();
      const chunks: BlobPart[] = [];
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
      const activeRecorder = recorder;
      const recorded = new Promise<Blob>((resolve, reject) => {
        activeRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        activeRecorder.onerror = () => reject(new Error("Browser video recording failed."));
        activeRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      watcher = () => {
        const percent = Math.min(100, Math.round(((video.currentTime - item.start) / (item.end - item.start)) * 100));
        setProgress(Math.max(0, percent));
        if (video.currentTime >= item.end - 0.08 && activeRecorder.state !== "inactive") activeRecorder.stop();
      };
      video.addEventListener("timeupdate", watcher);
      activeRecorder.start(250);
      await video.play();
      const blob = await recorded;
      if (!blob.size) throw new Error("Browser recorded an empty clip. Try another source format.");
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const name = (file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 35) || "video") + "-clip-" + item.id + "." + ext;
      const href = URL.createObjectURL(blob);
      setDownloads(prev => [...prev.filter(x => x.id !== item.id), { id: item.id, href, name }]);
      setProgress(100); setStatus("Clip " + item.id + " exported. Download it below.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to export this clip.");
    } finally {
      if (watcher) video.removeEventListener("timeupdate", watcher);
      video.pause();
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      setExporting(false);
    }
  }

  return <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gap: 18, color: "#332b20" }}>
    <section style={{ ...panel, background: "linear-gradient(115deg,#f0e5cf,#f8f4eb)" }}>
      <div style={{ color: "#96703c", fontSize: 10, letterSpacing: ".16em", fontWeight: 800 }}>OAT SOCIAL AI / CREATE</div>
      <h2 style={{ fontFamily: "Georgia,serif", fontSize: 32, margin: "9px 0" }}>AutoClip Studio</h2>
      <p style={{ maxWidth: 750, fontSize: 14, lineHeight: 1.65, color: "#65594b" }}>Create short video clips from your own footage, directly in your browser. Upload, generate evenly spaced starting points, adjust trim times, preview and export — no paid API or server upload required.</p>
      <p style={{ marginBottom: 0, fontSize: 12, color: "#775b35" }}><strong>Current version:</strong> Local clipping and export. AI highlight ranking, automatic Telugu transcription, subtitles and Instagram publishing are not yet connected.</p>
    </section>
    <section style={panel}>
      <h3 style={{ margin: "0 0 14px", fontSize: 18 }}>1. Import your video</h3>
      <label style={{ display: "block", background: "#faf6ee", border: "2px dashed #d3bd95", borderRadius: 13, textAlign: "center", padding: "25px 12px", cursor: "pointer" }}>
        <span style={{ display: "block", fontWeight: 700, marginBottom: 5 }}>Choose MP4, MOV or WebM footage</span>
        <span style={{ color: "#796d60", fontSize: 12 }}>Video stays on your computer. Large files may be slow to preview or export.</span>
        <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" style={{ display: "block", maxWidth: 300, margin: "14px auto 0" }} onChange={event => selectFile(event.target.files?.[0])} disabled={exporting} />
      </label>
      {url && <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <video ref={videoRef} src={url} controls playsInline preload="metadata" onLoadedMetadata={metadata} style={{ maxHeight: 450, width: "100%", background: "#171717", borderRadius: 12 }} />
        <div style={{ fontSize: 12, color: "#776d62" }}>{file?.name} {length ? "· " + stamp(length) + " duration" : ""}</div>
      </div>}
    </section>
    <section style={panel}>
      <h3 style={{ margin: "0 0 14px", fontSize: 18 }}>2. Clip suggestions</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12, minWidth: 140 }}>Number of clips<select style={field} value={count} onChange={e => setCount(Number(e.target.value))} disabled={exporting}><option value={3}>3 clips</option><option value={5}>5 clips</option><option value={10}>10 clips</option></select></label>
        <label style={{ display: "grid", gap: 6, fontSize: 12, minWidth: 140 }}>Length per clip<select style={field} value={target} onChange={e => setTarget(Number(e.target.value))} disabled={exporting}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label>
        <button type="button" style={button} disabled={!length || exporting} onClick={regenerate}>Suggest segments</button>
      </div>
      <p style={{ fontSize: 12, color: "#756857", lineHeight: 1.55 }}>Suggestions sample the timeline at evenly spaced positions. Review them and edit the start/end points to choose the best moments; this is not yet automatic AI highlight detection.</p>
      {clips.length > 0 && <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        {clips.map(item => <div key={item.id} style={{ border: "1px solid " + (selected === item.id ? "#bc925a" : "#e7dfd3"), borderRadius: 12, padding: 14, background: selected === item.id ? "#fdf8ef" : "#fff", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={{ ...secondary, padding: "7px 11px" }} onClick={() => { setSelected(item.id); void seekTo(item.start); }} disabled={exporting}>▶ Preview clip {item.id}</button>
            <span style={{ color: "#826e53", fontSize: 12 }}>{stamp(item.start)} – {stamp(item.end)} · {Math.max(0, Math.round(item.end - item.start))} sec</span>
          </div>
          <input aria-label={"Clip " + item.id + " title"} style={field} value={item.title} onChange={e => updateClip(item.id, "title", e.target.value)} disabled={exporting} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 120px", display: "grid", gap: 5, fontSize: 12 }}>Start (seconds)<input style={field} type="number" step="0.1" min={0} max={length} value={item.start} onChange={e => updateClip(item.id, "start", e.target.value)} disabled={exporting} /></label>
            <label style={{ flex: "1 1 120px", display: "grid", gap: 5, fontSize: 12 }}>End (seconds)<input style={field} type="number" step="0.1" min={0} max={length} value={item.end} onChange={e => updateClip(item.id, "end", e.target.value)} disabled={exporting} /></label>
          </div>
          <button type="button" style={{ ...button, justifySelf: "start" }} onClick={() => void exportClip(item)} disabled={exporting || item.end <= item.start || item.end > length + 0.2}>Export clip {item.id}</button>
          {downloads.filter(x => x.id === item.id).map(x => <a key={x.href} href={x.href} download={x.name} style={{ color: "#8c5c19", fontSize: 13, fontWeight: 700 }}>↓ Download {x.name}</a>)}
        </div>)}
      </div>}
    </section>
    {exporting && <section style={panel}><strong>Rendering on your computer… {progress}%</strong><progress max={100} value={progress} style={{ display: "block", width: "100%", marginTop: 8 }} /><p style={{ fontSize: 12 }}>Rendering occurs in real time. Keep this tab visible and do not change the source video.</p></section>}
    {status && <p role="status" aria-live="polite" style={{ fontSize: 13, color: "#735327", padding: "10px 14px", margin: 0, border: "1px solid #e9dfcf", borderRadius: 9 }}>{status}</p>}
    <section style={{ ...panel, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div><strong>Next: Create your reel</strong><div style={{ color: "#776d60", fontSize: 12, marginTop: 4 }}>Use your downloaded clips with Reel Studio. Publishing is a separate approval step.</div></div>
      <Link href="/social/reels" style={{ ...secondary, textDecoration: "none" }}>Open Reel Studio →</Link>
    </section>
  </div>;
}
