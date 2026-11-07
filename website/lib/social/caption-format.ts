/**
 * Caption formatting shared by the editor and the Instagram publishing endpoint.
 * Keep human-readable words and Unicode hashtags; remove internal AI/team instructions.
 */
export function cleanPublicCaption(value: string): string {
  return String(value || "")
    .replace(/\[(?:Team|Internal|Note to (?:team|editor)|Editor|Staff)\s*:[^\]]*\]/gi, "")
    .replace(/^\s*(?:Team|Internal note|Editor note)\s*:\s*.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatPublicPost(captionInput: string, hashtagsInput: string) {
  const caption = cleanPublicCaption(captionInput);
  const found = caption.match(/#[^\s#.,!?;:()[\]{}]+/gu) || [];
  const present = new Set(found.map(tag => tag.toLocaleLowerCase()));
  const extras: string[] = [];
  for (const tag of (String(hashtagsInput || "").match(/#[^\s#.,!?;:()[\]{}]+/gu) || [])) {
    const lower = tag.toLocaleLowerCase();
    if (tag.length < 2 || present.has(lower)) continue;
    present.add(lower);
    extras.push(tag);
  }
  return { caption, hashtags: extras.join(" "), fullCaption: [caption, extras.join(" ")].filter(Boolean).join("\n\n") };
}
