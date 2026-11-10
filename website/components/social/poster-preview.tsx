"use client";
import { useEffect, useState } from "react";
import { composePoster, type PosterStyle, type PosterText } from "@/lib/social/poster";
import { composeWithBrandLogo, type BrandLogo, type StudioLogoPlacement } from "@/lib/social/brand-logo";

export function PosterPreview({ source, ratio, text, enabled, style, logo, placement }: {
  source: string; ratio: string; text: PosterText; enabled: boolean; style: PosterStyle;
  logo: BrandLogo | null; placement: StudioLogoPlacement;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const { title, details, cta } = text;
  useEffect(() => {
    let active = true;
    setImage(""); setError("");
    composePoster(source, ratio, { title, details, cta }, enabled, style)
      .then(poster => composeWithBrandLogo(poster, logo, placement))
      .then(value => { if (active) setImage(value); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not preview poster."); });
    return () => { active = false; };
  }, [source, ratio, title, details, cta, enabled, style, logo, placement]);
  if (error) return <p role="alert" style={{ padding: 20, color: "#b42318" }}>{error}</p>;
  if (!image) return <p role="status" style={{ padding: 20 }}>Preparing poster preview…</p>;
  return <img src={image} alt={title ? `${title} destination poster` : "Travel artwork"} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />;
}
