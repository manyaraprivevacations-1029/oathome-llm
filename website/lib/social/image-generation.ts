"use client";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

async function authorization() {
  const { data } = await getSocialSupabase().auth.getSession();
  if (!data.session?.access_token) throw new Error("Your session expired. Please sign in again.");
  return { Authorization: `Bearer ${data.session.access_token}` };
}
export async function imageGenerationConfigured(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch("/api/social/image", { headers: await authorization(), cache: "no-store", signal });
  if (!response.ok) throw new Error("Could not check the image service. Refresh to retry.");
  const value = await response.json();
  return value.configured === true;
}
export async function generateSocialImage(prompt: string, format: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch("/api/social/image", {
    method: "POST", headers: { ...await authorization(), "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, format }), cache: "no-store", signal
  });
  const value = await response.json().catch(() => null);
  if (!response.ok || typeof value?.image !== "string" || !/^data:image\/(jpeg|png);base64,/.test(value.image)) {
    throw new Error(value?.error || "No image was generated. Please try again.");
  }
  // FLUX Schnell returns a square. Crop deliberately to the studio's selected ratio.
  return new Promise((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => {
      if (signal?.aborted) { reject(new Error("Image generation was cancelled.")); return; }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = format === "9:16" ? 1920 : format === "1:1" ? 1080 : 1350;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Image preview is unavailable on this device.");
        const scale = Math.max(canvas.width / picture.naturalWidth, canvas.height / picture.naturalHeight);
        const width = picture.naturalWidth * scale, height = picture.naturalHeight * scale;
        ctx.drawImage(picture, (canvas.width-width)/2, (canvas.height-height)/2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch { reject(new Error("Could not prepare the generated image. Try again.")); }
    };
    picture.onerror = () => reject(new Error("Could not read the generated image."));
    picture.src = value.image;
  });
}
