"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { StudioLogoPlacement } from "@/lib/social/brand-logo";
import { reelRecordingFormat, renderPhotoReel } from "@/lib/social/render-photo-reel";

const button: CSSProperties = {
  padding: "8px 12px", border: "1px solid #ded5c6", borderRadius: 8,
  background: "#fffaf0", color: "#8a5d20", fontWeight: 600,
};
const input: CSSProperties = { display: "block", marginTop: 6, maxWidth: "100%" };

export function PhotoReelMaker({ title, logo, onMp4 }: {
  title: string;
  logo?: { url: string; placement: StudioLogoPlacement };
  onMp4: (file: File) => void;
}) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [audio, setAudio] = useState<File>();
  const [seconds, setSeconds] = useState(3);
  const [showTitle, setShowTitle] = useState(true);
  const [format, setFormat] = useState<string>();
  const [progress, setProgress] = useState<number>();
  const [output, setOutput] = useState<{ file: File; url: string }>();
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const outputUrl = useRef("");
  const exporting = progress !== undefined;

  useEffect(() => {
    setFormat(reelRecordingFormat());
    return () => {
      request.current?.abort();
      if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
    };
  }, []);

  function addPhotos(files: FileList | null) {
    const added = Array.from(files || []);
    if (!added.length) return;
    if (photos.length + added.length > 12 || added.some(file => file.size > 15 * 1024 * 1024)) {
      setMessage("Choose up to 12 photos, each 15 MB or smaller.");
      return;
    }
    setPhotos(current => [...current, ...added]);
    setMessage("");
  }

  function movePhoto(index: number, direction: number) {
    setPhotos(current => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function exportReel() {
    if (request.current || !photos.length) return;
    const controller = new AbortController();
    request.current = controller;
    setProgress(0);
    setMessage("");
    try {
      const blob = await renderPhotoReel({ photos, audio, secondsPerPhoto: seconds,
        title: showTitle ? title.trim().slice(0, 80) : "", logo, signal: controller.signal, onProgress: setProgress });
      if (controller.signal.aborted) return;
      const extension = blob.type === "video/mp4" ? "mp4" : "webm";
      const basename = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "oat-photo-reel";
      const file = new File([blob], `${basename}.${extension}`, { type: blob.type });
      if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
      outputUrl.current = URL.createObjectURL(file);
      setOutput({ file, url: outputUrl.current });
      if (extension === "mp4") onMp4(file);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not export the reel.");
    } finally {
      request.current = null;
      setProgress(undefined);
    }
  }

  return <section id="photo-reel-maker" style={{ border: "1px solid #e7dfd1", borderRadius: 15, padding: 21, background: "#fffdf8", marginBottom: 16 }}>
    <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Photo Reel Maker</h2>
    <p style={{ fontSize: 13, color: "#746957", margin: "0 0 14px" }}>Create a 1080 × 1920 reel from your travel photos. Photos are cropped to fill the vertical frame.</p>
    <fieldset disabled={exporting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Travel photos
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" style={input}
          onChange={event => { addPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </label>
      {photos.length > 0 && <ol style={{ paddingLeft: 22, fontSize: 13 }}>
        {photos.map((photo, index) => <li key={`${photo.name}-${index}`} style={{ marginBottom: 6, overflowWrap: "anywhere" }}>
          <span style={{ marginRight: 8 }}>{photo.name}</span>
          <button type="button" style={button} aria-label={`Move photo ${index + 1} up`} disabled={index === 0} onClick={() => movePhoto(index, -1)}>↑</button>{" "}
          <button type="button" style={button} aria-label={`Move photo ${index + 1} down`} disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)}>↓</button>{" "}
          <button type="button" style={button} aria-label={`Remove photo ${index + 1}`} onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}>Remove</button>
        </li>)}
      </ol>}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 16, marginTop: 14, fontSize: 13 }}>
        <label>Seconds per photo<select value={seconds} style={input} onChange={event => setSeconds(Number(event.target.value))}>
          {[2, 3, 4, 5, 6].map(value => <option key={value} value={value}>{value} seconds</option>)}
        </select></label>
        <label>Optional music or recorded voiceover<input type="file" accept="audio/*,.m4a" style={input} onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          if (file && file.size > 15 * 1024 * 1024) {
            setMessage("Choose an audio file 15 MB or smaller.");
            return;
          }
          setAudio(file);
          setMessage("");
        }} /></label>
        {audio && <span>{audio.name} <button type="button" style={button} onClick={() => setAudio(undefined)}>Remove audio</button></span>}
        <label><input type="checkbox" checked={showTitle} onChange={event => setShowTitle(event.target.checked)} /> Add reel title</label>
      </div>
    </fieldset>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 16 }}>
      <button type="button" disabled={!format || !photos.length || exporting} onClick={() => void exportReel()}
        style={{ ...button, background: "#a8752d", color: "white" }}>
        {exporting ? "Exporting…" : `Make ${format?.includes("webm") ? "WebM" : "MP4"} reel`}
      </button>
      {photos.length > 0 && <span style={{ fontSize: 12 }}>{photos.length * seconds} seconds</span>}
      {exporting && <>
        <progress value={progress} max={100} aria-label="Reel export progress" />
        <button type="button" style={button} onClick={() => { request.current?.abort(); setMessage("Export cancelled."); }}>Cancel</button>
      </>}
      {output && <a href={output.url} download={output.file.name} style={{ ...button, textDecoration: "none" }}>Download {output.file.type === "video/mp4" ? "MP4" : "WebM"}</a>}
    </div>
    {exporting && <p role="status" style={{ fontSize: 12 }}>Keep Reel Studio open until the export finishes.</p>}
    {message && <p role="status" style={{ fontSize: 12 }}>{message}</p>}
    {!format && <p style={{ fontSize: 12 }}>Video export needs a browser with canvas recording support.</p>}
    {output?.file.type === "video/webm" && <div>
      <p style={{ fontSize: 12 }}>Your browser exported WebM. Creations accepts MP4.</p>
      <video src={output.url} controls playsInline style={{ display: "block", width: 200, maxWidth: "100%" }} />
    </div>}
    {output?.file.type === "video/mp4" && <p style={{ fontSize: 12 }}>Your MP4 is ready. <a href="#reel-preview">Preview it or save it to Creations</a>.</p>}
  </section>;
}
