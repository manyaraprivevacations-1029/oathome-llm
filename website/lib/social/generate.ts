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

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: fullPrompt }] }),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "OWN could not generate a draft. Please try again.");
  }

  const raw = await response.text();
  const lines = raw.split("\n").map(line => line.trim()).filter(Boolean);
  for (const line of lines.reverse()) {
    let item: { message?: { content?: unknown }; response?: unknown };
    try {
      item = JSON.parse(line) as { message?: { content?: unknown }; response?: unknown };
    } catch {
      // Ignore non-JSON stream fragments and inspect the next line.
      continue;
    }

    const content = item.message?.content ?? item.response;
    if (typeof content === "string" && content.trim()) {
      const answer = content.trim();
      if (/^ee detail na daggara clear ga ledu/i.test(answer)) {
        throw new Error("OWN is reachable, but its model returned a knowledge-only fallback instead of generating a creative response. Check the OWN model runtime and try again.");
      }
      return answer;
    }
  }

  throw new Error("OWN returned an empty response. Please try again.");
}
