export type StudioLanguage = "Telugu-English" | "Telugu" | "English";
export type CreativeSlide = { title: string; body: string; image_prompt: string; image_prompts?: string[]; selected_prompt?: number; image?: string; poster_layout?: import("./poster").PosterLayout };
export type CreativeResult = { poster_title?: string; poster_details?: string; poster_cta?: string; headline?: string; caption: string; hashtags?: string; visual_prompt?: string; image_prompts?: string[]; selected_prompt?: number; slides?: CreativeSlide[] };
export type CreativeBrief = { topic: string; destination: string; facts: string; tone: string; format: string; language: StudioLanguage; carousel: boolean };

export function briefKey(brief: CreativeBrief) { return JSON.stringify(brief); }
export function isHimalayanCharDham(value: string) {
  return /char\s*dham|chardhma|చార్\s*ధామ్|చార్ధామ్/i.test(value) && !/dwarka|puri|rameswaram|rameshwaram|pan.india/i.test(value);
}
export function destinationContext(brief: Pick<CreativeBrief,"topic"|"destination">) {
  const value = `${brief.destination} ${brief.topic}`;
  if (isHimalayanCharDham(value)) return "Char Dham Yatra, Uttarakhand, India: Yamunotri, Gangotri, Kedarnath and Badrinath. These are the four pilgrimage destinations. Focus on the named temples and pilgrimage, not anonymous mountains or unrelated temples. Do not confuse with the pan-India Char Dham circuit. No opening dates, weather, accessibility, route safety or availability have been verified.";
  return brief.destination.trim() || brief.topic.trim();
}
export function languageInstruction(language: StudioLanguage) {
  if (language === "Telugu-English") return "Write every caption and each slide's visible copy in conversational Telugu SCRIPT mixed naturally with English travel words. Telugu must use actual Unicode Telugu characters, not only Romanized Telugu. Include both Telugu and English in the caption and each slide's title/body combined. For posts, poster details and CTA together must include Telugu and English too. Example style: 'మన కుటుంబంతో Char Dham యాత్రను plan చేద్దాం'. Do not return English-only content. Destination proper names and hashtags may stay in English. Image prompts must remain English for the image model.";
  if (language === "Telugu") return "Write the caption, poster details, CTA and every slide's visible copy in Telugu SCRIPT using Unicode Telugu characters. Destination proper names and hashtags may stay in English. Image prompts must remain English for the image model.";
  return "Write visible copy in English. Image prompts must be in English.";
}
export function creativePrompt(brief: CreativeBrief) {
  const schema = brief.carousel
    ? '{"caption":"caption","hashtags":"hashtags","poster_cta":"short CTA","slides":[{"title":"short specific title","body":"max 160 characters","image_prompts":["35-word scenic prompt","35-word landmark prompt","35-word human-interest prompt"]}]}'
    : '{"headline":"short headline","poster_title":"destination name","poster_details":"max 180 characters","poster_cta":"max 70 characters","caption":"caption","hashtags":"hashtags","image_prompts":["35-word scenic prompt","35-word landmark prompt","35-word human-interest prompt"]}';
  return [
    "Create " + (brief.carousel ? "5 to 7 connected Instagram carousel slides" : "one Instagram post") + " for On A Trip Holidays. Return ONLY valid JSON in this exact shape: " + schema,
    "CURRENT BRIEF (takes priority over previous examples, brand defaults and unrelated destinations): " + JSON.stringify(brief),
    "Destination grounding: " + destinationContext(brief),
    "Use only the confirmed package facts supplied in this brief. Never invent prices, dates, departures, inclusions or current conditions. If facts are empty, write destination inspiration with an enquiry CTA. Do not put internal confirmation notes into public copy.",
    languageInstruction(brief.language),
    "Every slide must explain a specific point from the CURRENT topic. Make the first slide a hook, subsequent slides distinct and relevant, and the final slide an enquiry CTA. No generic filler or recycling copy from another destination.",
    "For EVERY image provide exactly THREE DISTINCT image_prompts: 1 scenic setting featuring a named local landmark, 2 closer landmark/architecture view, 3 respectful human-interest view with the named landmark. Each prompt must explicitly name the destination AND a real relevant landmark, and describe how that subject relates to that slide. A mountain-only or generic landscape prompt is insufficient for a pilgrimage topic. Never substitute a different region's monument. Do not invent architectural details you cannot identify.",
    "Prompts are English, concise (about 35 words each, under 500 characters), realistic travel imagery, no text, no logo. Keep the main subject in the lower 60 percent and leave uncluttered upper space for editable typography. For a four-shrine overview, name the four shrines in a clearly separated editorial montage rather than merging them into a fictional temple. AI imagery is illustrative, not a verified photograph. Return no surrounding commentary."
  ].join("\n\n");
}
const telugu = /[\u0c00-\u0c7f]/;
function needsLanguage(copy: string, language: StudioLanguage) {
  return language !== "English" && (!telugu.test(copy) || (language === "Telugu-English" && !/[A-Za-z]/.test(copy)));
}
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function prompts(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Provide exactly three distinct image prompts per image.");
  const items = value.map(v=>text(v,1400)).filter(Boolean);
  if (items.length !== 3 || new Set(items.map(v=>v.toLowerCase())).size !== 3) throw new Error("Provide exactly three distinct image prompts per image.");
  return items;
}
export function normalizeCreativeResult(raw: string, brief: CreativeBrief): CreativeResult {
  const data = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as Record<string,unknown>;
  const caption = text(data.caption,5000);
  if (!caption) throw new Error("A complete caption is required.");
  if (needsLanguage(caption,brief.language)) throw new Error("The caption did not follow the selected language. Include actual Telugu script and English when requested.");
  const output: CreativeResult = {caption,hashtags:text(data.hashtags,2000),poster_cta:text(data.poster_cta,100)};
  if (brief.carousel) {
    if (!Array.isArray(data.slides) || data.slides.length < 5 || data.slides.length > 7) throw new Error("Return 5 to 7 complete slides.");
    output.slides=data.slides.map((item: unknown)=>{
      if (!item || typeof item !== "object") throw new Error("Incomplete slide.");
      const slide=item as Record<string,unknown>,title=text(slide.title,160),body=text(slide.body,240);
      if (!title || !body) throw new Error("Each slide needs a relevant title and copy.");
      if (needsLanguage(title+" "+body,brief.language)) throw new Error("Every slide must use the selected Telugu language, with English words when requested.");
      const options=prompts(slide.image_prompts);
      return {title,body,image_prompt:options[0],image_prompts:options,selected_prompt:0};
    });
  } else {
    output.headline=text(data.headline,180);output.poster_title=text(data.poster_title,100)||brief.destination||brief.topic;
    output.poster_details=text(data.poster_details,240);
    if (needsLanguage((output.poster_details||"")+" "+(output.poster_cta||""),brief.language)) throw new Error("Poster details must use the selected language too.");
    output.image_prompts=prompts(data.image_prompts);output.visual_prompt=output.image_prompts[0];output.selected_prompt=0;
  }
  // Char Dham prompts must be anchored to actual pilgrimage subjects, not mountains alone.
  if (isHimalayanCharDham(brief.destination+" "+brief.topic)) {
    const all=output.slides?.flatMap(slide=>slide.image_prompts||[]) || output.image_prompts || [];
    if (all.some(prompt=>!/(yamunotri|gangotri|kedarnath|badrinath)/i.test(prompt))) throw new Error("Every Char Dham image prompt must name an actual Char Dham shrine, not just the Himalayas.");
    const visible=[output.caption,output.poster_title,output.poster_details,...(output.slides||[]).map(s=>s.title+" "+s.body)].join(" ");
    if (!/(char\s*dham|chardham|కేదార్|బద్రీ|చార్|యమునోత్రి|గంగోత్రి|kedarnath|badrinath|yamunotri|gangotri)/i.test(visible)) throw new Error("The content must explicitly address Char Dham.");
  }
  // English-language destination names must also appear in each English image prompt.
  const namedDestination = brief.destination.trim();
  if (!isHimalayanCharDham(brief.destination+" "+brief.topic) && /^[a-z ,.-]+$/i.test(namedDestination)) {
    const anchors = namedDestination.toLowerCase().split(/[^a-z]+/).filter(word=>word.length>2 && !["india","trip","tour","yatra"].includes(word));
    const all=output.slides?.flatMap(slide=>slide.image_prompts||[]) || output.image_prompts || [];
    if(anchors.length && all.some(prompt=>!anchors.some(word=>prompt.toLowerCase().includes(word)))) throw new Error("Each image prompt must explicitly name the current destination, not a different place.");
  }
  return output;
}

export function selectedImagePrompt(result: CreativeResult, index=-1) {
  const slide=result.slides?.[index];
  const options=slide?.image_prompts || result.image_prompts;
  const selected=slide?.selected_prompt ?? result.selected_prompt ?? 0;
  return options?.[selected] || (slide ? slide.image_prompt : result.visual_prompt) || "";
}
export function anchoredImagePrompt(prompt: string, brief: CreativeBrief, title: string) {
  if (!prompt.trim()) throw new Error("Choose or enter an image prompt first.");
  if (isHimalayanCharDham(brief.destination+" "+brief.topic) && !/(yamunotri|gangotri|kedarnath|badrinath)/i.test(prompt)) throw new Error("Name the Char Dham shrine in this image prompt: Yamunotri, Gangotri, Kedarnath or Badrinath.");
  // Keep destination context in every provider request, even after a prompt is edited.
  const suffix = "\nSubject must match: " + destinationContext(brief) + ". Slide/topic: " + title.slice(0,160) + ". Keep the chosen named landmark as the primary subject; other circuit names are context only. No unrelated landmarks, no lettering or logo.";
  if (prompt.length + suffix.length > 1600) throw new Error("Shorten the prompt to leave room for destination context (about 900 characters). ");
  return prompt + suffix;
}
