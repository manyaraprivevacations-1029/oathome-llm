import type { StudioLogoPlacement } from "./brand-logo";

const width = 1080;
const height = 1920;
const fps = 30;

const formats = [
  "video/mp4;codecs=avc1.420028,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function reelRecordingFormat() {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || !HTMLCanvasElement.prototype.captureStream) return undefined;
  return formats.find(format => MediaRecorder.isTypeSupported(format));
}

async function loadLogo(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Could not load the logo. Refresh the page or turn off the logo and try again.");
  return createImageBitmap(await response.blob());
}

export async function renderPhotoReel({ photos, audio, secondsPerPhoto, title, logo, signal, onProgress }: {
  photos: File[];
  audio?: File;
  secondsPerPhoto: number;
  title: string;
  logo?: { url: string; placement: StudioLogoPlacement };
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}): Promise<Blob> {
  signal.throwIfAborted();
  if (!photos.length || secondsPerPhoto <= 0) throw new Error("Add a photo and choose its duration before exporting.");
  const mimeType = reelRecordingFormat();
  if (!mimeType) throw new Error("This browser cannot record a reel. Open Reel Studio in a browser with canvas video recording support.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not start the reel canvas.");

  const audioContext = audio ? new AudioContext() : undefined;
  const bitmaps: ImageBitmap[] = [];
  let logoBitmap: ImageBitmap | undefined;
  let stream: MediaStream | undefined;
  let sound: AudioBufferSourceNode | undefined;
  try {
    if (audioContext) await audioContext.resume();
    // Downsample each image after decoding to limit memory use for large camera files.
    for (const photo of photos) {
      signal.throwIfAborted();
      const original = await createImageBitmap(photo).catch(() => {
        throw new Error(`Could not open ${photo.name}. Try a JPG, PNG or WebP photo.`);
      });
      try {
        const scale = Math.max(width / original.width, height / original.height);
        const sourceWidth = width / scale;
        const sourceHeight = height / scale;
        bitmaps.push(await createImageBitmap(original,
          (original.width - sourceWidth) / 2, (original.height - sourceHeight) / 2,
          Math.max(1, Math.floor(sourceWidth)), Math.max(1, Math.floor(sourceHeight)),
          { resizeWidth: width, resizeHeight: height, resizeQuality: "high" }));
      } finally {
        original.close();
      }
    }
    if (logo) logoBitmap = await loadLogo(logo.url, signal);
    if (audio && audioContext) {
      const track = audioContext.createMediaStreamDestination();
      const buffer = await audioContext.decodeAudioData(await audio.arrayBuffer()).catch(() => {
        throw new Error("Could not open the audio. Try an MP3, WAV or M4A file.");
      });
      sound = audioContext.createBufferSource();
      sound.buffer = buffer;
      sound.connect(track);
      stream = canvas.captureStream(fps);
      track.stream.getAudioTracks().forEach(audioTrack => stream?.addTrack(audioTrack));
    } else {
      stream = canvas.captureStream(fps);
    }
    signal.throwIfAborted();

    const duration = photos.length * secondsPerPhoto;
    const gradient = ctx.createLinearGradient(0, height * 0.58, 0, height);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "rgba(0,0,0,.72)");
    const draw = (elapsed: number) => {
      const index = Math.min(bitmaps.length - 1, Math.floor(elapsed / secondsPerPhoto));
      const zoom = 1 + 0.055 * ((elapsed % secondsPerPhoto) / secondsPerPhoto);
      const w = width * zoom;
      const h = height * zoom;
      ctx.drawImage(bitmaps[index], (width - w) / 2, (height - h) / 2, w, h);
      if (title) {
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height * 0.58, width, height * 0.42);
        ctx.font = "bold 72px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.fillText(title, width / 2, height * 0.77, width * 0.78);
      }
      if (logo && logoBitmap) {
        const scale = Math.min(width * logo.placement.size / 100 / logoBitmap.width, height * 0.25 / logoBitmap.height);
        const logoWidth = logoBitmap.width * scale;
        const logoHeight = logoBitmap.height * scale;
        const x = Math.max(0, Math.min(width - logoWidth, width * logo.placement.x / 100 - logoWidth / 2));
        const y = Math.max(0, Math.min(height - logoHeight, height * logo.placement.y / 100 - logoHeight / 2));
        ctx.drawImage(logoBitmap, x, y, logoWidth, logoHeight);
      }
    };

    draw(0);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 });
    return await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let frame = 0;
      let failure: unknown;
      const cleanup = () => {
        cancelAnimationFrame(frame);
        signal.removeEventListener("abort", cancel);
        document.removeEventListener("visibilitychange", checkVisibility);
      };
      const stop = (reason?: unknown) => {
        failure = reason;
        cleanup();
        if (recorder.state !== "inactive") recorder.stop();
        else if (reason) reject(reason);
      };
      const cancel = () => stop(signal.reason);
      const checkVisibility = () => {
        if (document.hidden) stop(new Error("Export stopped when the tab was hidden. Keep Reel Studio open while exporting."));
      };
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => stop(new Error("The browser could not encode the reel. Try fewer photos or a shorter duration."));
      recorder.onstop = () => {
        cleanup();
        if (failure) return reject(failure);
        const type = (chunks[0]?.type || recorder.mimeType || mimeType).split(";")[0];
        const output = new Blob(chunks, { type });
        if (!output.size) return reject(new Error("The browser produced an empty video. Try exporting again."));
        resolve(output);
      };
      try {
        recorder.start(1000);
        sound?.start();
        signal.addEventListener("abort", cancel, { once: true });
        document.addEventListener("visibilitychange", checkVisibility);
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = (now - start) / 1000;
          if (elapsed >= duration) return stop();
          try {
            draw(Math.max(0, elapsed));
            onProgress(Math.floor(100 * elapsed / duration));
            frame = requestAnimationFrame(tick);
          } catch (error) {
            stop(error);
          }
        };
        checkVisibility();
        if (recorder.state === "recording") frame = requestAnimationFrame(tick);
      } catch (error) {
        stop(error);
      }
    });
  } finally {
    stream?.getTracks().forEach(track => track.stop());
    bitmaps.forEach(image => image.close());
    logoBitmap?.close();
    if (audioContext) await audioContext.close().catch(() => {});
  }
}
