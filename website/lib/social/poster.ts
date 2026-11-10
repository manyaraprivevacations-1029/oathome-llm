"use client";

export type PosterText = { title: string; details: string; cta: string };
export type PosterStyle = "light" | "dark";

// Fit by measured pixels, including unbroken words and Telugu text. Never clip copy.
export function fitPosterText(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, maxSize: number, family: string) {
  const paragraphs = text.trim().split(/\n/);
  for (let size = maxSize; size >= 10; size -= 1) {
    ctx.font = `${size}px ${family}`;
    const lines: string[] = [];
    for (const paragraph of paragraphs) {
      let line = "";
      for (const char of Array.from(paragraph)) {
        if (line && ctx.measureText(line + char).width > width) {
          // Prefer a word boundary; split a single long word only if necessary.
          const space = line.lastIndexOf(" ");
          if (space > 0) { lines.push(line.slice(0, space)); line = line.slice(space + 1) + char; }
          else { lines.push(line); line = char; }
        } else line += char;
      }
      if (line) lines.push(line.trim());
    }
    if (lines.length * size * 1.2 <= height && lines.every(line => ctx.measureText(line).width <= width)) return { lines, size };
  }
  throw new Error("Poster text is too long. Shorten it before exporting.");
}

export async function composePoster(source: string, ratio: string, text: PosterText, enabled: boolean, style: PosterStyle): Promise<string> {
  if (!enabled) return source;
  await document.fonts?.ready;
  const photo = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare the poster image."));
    image.src = source;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = ratio === "9:16" ? 1920 : ratio === "1:1" ? 1080 : 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Poster export is unavailable on this device.");
  const w = canvas.width, h = canvas.height;
  const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
  ctx.drawImage(photo, (w - photo.naturalWidth * scale) / 2, (h - photo.naturalHeight * scale) / 2, photo.naturalWidth * scale, photo.naturalHeight * scale);
  const light = style === "light";
  const top = ctx.createLinearGradient(0, 0, 0, h * .55);
  top.addColorStop(0, light ? "rgba(255,255,250,1)" : "rgba(6,28,24,.98)");
  top.addColorStop(.65, light ? "rgba(255,255,250,.94)" : "rgba(6,28,24,.90)");
  top.addColorStop(1, light ? "rgba(255,255,250,0)" : "rgba(6,28,24,0)");
  ctx.fillStyle = top; ctx.fillRect(0, 0, w, h * .55);
  const bottom = ctx.createLinearGradient(0, h * .78, 0, h);
  bottom.addColorStop(0, "rgba(3,25,18,0)"); bottom.addColorStop(1, "rgba(3,25,18,.9)");
  ctx.fillStyle = bottom; ctx.fillRect(0, h * .78, w, h * .22);
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  function draw(value: string, y: number, height: number, size: number, family: string, color: string) {
    if (!value.trim()) return;
    const fitted = fitPosterText(ctx!, value, w * .86, height, size, family);
    ctx!.font = `${fitted.size}px ${family}`; ctx!.fillStyle = color;
    fitted.lines.forEach((line, index) => ctx!.fillText(line, w / 2, y + index * fitted.size * 1.2));
  }
  draw(text.title, h * .11, h * .19, 158, 'Georgia, "Times New Roman", serif', light ? "#173c21" : "#fffbed");
  draw(text.details, h * .315, h * .125, 36, 'Arial, sans-serif', light ? "#173c21" : "#fffbed");
  draw(text.cta, h * .89, h * .075, 40, 'Georgia, serif', "#ffffff");
  return canvas.toDataURL("image/jpeg", .93);
}
