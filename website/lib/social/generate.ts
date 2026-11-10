import { getSocialSupabase } from "@/lib/social/supabase-browser";

function cleanGeneratedText(value: string): string {
  const trimmed = value.trim();
  // OWN is asked for JSON by the Ollama-compatible runtime. Unwrap common
  // response fields so the editor receives the actual caption, not JSON syntax.
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed.trim();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      // Keep structured post/carousel drafts intact for the editor JSON parser.
      if ("visual_prompt" in record || "slides" in record || "storyboard" in record || ("caption" in record && "hashtags" in record)) return trimmed;
      for (const key of ["caption", "content", "text", "response", "output"]) {
        if (typeof record[key] === "string" && record[key].trim()) {
          return (record[key] as string).trim();
        }
      }
    }
  } catch {
    // Plain-text model responses are valid too.
  }
  return trimmed.replace(/^\`{3}(?:json|text)?\\s*/i, "").replace(/\\s*\`{3}$/, "").trim();
}

export async function generateSocialDraft(prompt: string): Promise<string> {
  let brandContext = "";
  try {
    const supabase = getSocialSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: profile } = await supabase
        .from("social_brand_profiles")
        .select("brand_name,website_url,instagram_handle,brand_voice,audience_notes,content_rules")
        .eq("user_id", auth.user.id)
        .eq("brand_name", "On A Trip Holidays")
        .maybeSingle();
      if (profile) {
        brandContext = [
          "BRAND BRAIN — follow these saved brand settings:",
          "Brand: " + (profile.brand_name || "On A Trip Holidays"),
          "Website: " + (profile.website_url || ""),
          "Instagram: " + (profile.instagram_handle || ""),
          "Voice: " + (profile.brand_voice || ""),
          "Audience: " + (profile.audience_notes || ""),
          "Content rules: " + JSON.stringify(profile.content_rules || {})
        ].join("\n");
      }
    }
  } catch {
    // Drafting remains available if the optional profile lookup is unavailable.
  }

  const fullPrompt = [
    "You are the dedicated social-media strategist and creative assistant for On A Trip Holidays. Treat the saved Brand Brain as the authority for brand identity, voice, audience, content pillars and creative guardrails. The explicit destination, topic, facts and language in the CURRENT brief override brand examples and default language preferences. Never copy a destination from an earlier example into the current brief. Telugu-English means actual Telugu script mixed naturally with English words, unless the current brief explicitly requests Romanized Telugu. Treat the existing travel knowledge source as the authority for package facts only. Never confuse brand preferences with package facts. Never invent prices, dates, departures, availability, inclusions, hotel standards, customer testimonials, performance results or guarantees. If package information is missing, inconsistent, expired or uncertain, explicitly mark it for team confirmation and use a general enquiry CTA. Produce useful, platform-aware creative work rather than generic filler. Do not claim to have researched live trends or competitors unless research data is actually supplied.",
    brandContext,
    prompt
  ].filter(Boolean).join("\n\n");

  const { data: sessionData } = await getSocialSupabase().auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your Social AI session expired. Please sign in again.");

  const response = await fetch("/api/social/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ prompt: fullPrompt }),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error || "Gemini could not generate a draft. Please try again.");
  }

  const payload = await response.json().catch(() => null) as { content?: unknown; error?: unknown } | null;
  if (typeof payload?.content === "string" && payload.content.trim()) {
    return cleanGeneratedText(payload.content);
  }
  throw new Error(typeof payload?.error === "string" ? payload.error : "OWN returned an empty response. Please try again.");
}
