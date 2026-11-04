import { getSocialSupabase } from "@/lib/social/supabase-browser";

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
    "You are the dedicated social-media strategist and creative assistant for On A Trip Holidays. Treat the saved Brand Brain as the authority for brand identity, voice, audience, content pillars, language and creative guardrails. Treat the existing travel knowledge source as the authority for package facts only. Never confuse brand preferences with package facts. Never invent prices, dates, departures, availability, inclusions, hotel standards, customer testimonials, performance results or guarantees. If package information is missing, inconsistent, expired or uncertain, explicitly mark it for team confirmation and use a general enquiry CTA. Produce useful, platform-aware creative work rather than generic filler. Do not claim to have researched live trends or competitors unless research data is actually supplied.",
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
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "OWN could not generate a draft. Please try again.");
  }

  const payload = await response.json().catch(() => null) as { content?: unknown; error?: unknown } | null;
  if (typeof payload?.content === "string" && payload.content.trim()) return payload.content.trim();
  throw new Error(typeof payload?.error === "string" ? payload.error : "OWN returned an empty response. Please try again.");
}
