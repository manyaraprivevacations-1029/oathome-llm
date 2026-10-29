import { NextRequest, NextResponse } from "next/server";
import knowledge from "../../../data/travel-knowledge.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PackageRecord = {
  name: string; destination?: string; duration?: string; price?: string; departures?: string[];
  inclusions?: string[]; exclusions?: string[]; itinerary?: string[];
  thingsToCarry?: string[]; childPricing?: { under5?: string; age5to11?: string; age11plus?: string };
};
type FAQ = { question: string; answer: string; keywords?: string[] };
type Knowledge = { company: { name: string; website: string; greeting: string; fallback: string }; services: string[]; packages: PackageRecord[]; faqs: FAQ[] };
type ChatMessage = { role: string; content: string };
const data = knowledge as Knowledge;
const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const includesAny = (s: string, list: string[]) => list.some((v) => s.includes(normalize(v)));
const fallback = "Ee detail na daggara clear ga ledu andi. Nenu travel team tho confirm cheyinchi chepthanu.";

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}
function findPackage(s: string): PackageRecord | undefined {
  const q = normalize(s);
  const tokens = q.split(" ").filter(Boolean);
  // Never match tiny greetings/words (e.g. "hi") inside a destination such as "Shimla".
  if (tokens.length === 1 && tokens[0].length < 4) return undefined;
  const exact = data.packages.find((p) => {
    const aliases = (p as PackageRecord & { aliases?: string[] }).aliases || [];
    const searchable = [p.name, ...aliases].map(normalize).filter(Boolean);
    if (searchable.some((n) => q === n || (n.length >= 4 && q.includes(n)))) return true;
    if (searchable.some((n) => n.includes("char dham")) && includesAny(q, ["char dham", "chardham", "char dham yatra", "chardham yatra"])) return true;
    return searchable.some((n) => n.split(" ").some((w) => w.length >= 5 && tokens.includes(w)));
  });
  if (exact) return exact;
  // Tolerate common one-character typos in destination names (e.g. "shmila", "kerla").
  // Only fuzzy-match meaningful tokens and only if exactly one package is a close match.
  const candidates = data.packages.filter((p) => {
    const aliases = (p as PackageRecord & { aliases?: string[] }).aliases || [];
    const words = [p.name, ...aliases].map(normalize).flatMap((n) => n.split(" "));
    return tokens.some((token) => token.length >= 5 && words.some((word) =>
      word.length >= 5 && Math.abs(word.length - token.length) <= 1 && editDistance(token, word) <= 1
    ));
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}
function packageFromHistory(history: ChatMessage[]): PackageRecord | undefined {
  for (const m of [...history].reverse()) {
    const p = findPackage(m.content);
    if (p) return p;
  }
  return undefined;
}
function lastAssistant(history: ChatMessage[]): string {
  return normalize([...history].reverse().find((m) => m.role === "assistant")?.content || "");
}
function answerQuestion(question: string, history: ChatMessage[] = []): string {
  const q = normalize(question);
  const prevA = lastAssistant(history);
  const pkg = findPackage(question) || packageFromHistory(history);
  const charDham = !!pkg && normalize(pkg.name).includes("char dham");

  if (/^(hi|hii+|hlo|helo|hello|hey|heyy+|good morning|good afternoon|good evening|namaste|namaskaram)$/.test(q)) {
    return "Hi andi! Nenu Radhika, On A Trip Holidays travel team nunchi matladuthunnanu. Meeru ye trip plan chesthunnaru?";
  }

  // If the customer selects a destination/package by name, respond with that package's own details.
  const selectedPackage = findPackage(question);
  if (selectedPackage && q.split(" ").length <= 5 && !includesAny(q, ["itinerary", "included", "inclusions", "exclusions", "price", "cost", "how much", "days", "nights", "details"])) {
    return "**" + selectedPackage.name + "**\nDuration: " + (selectedPackage.duration || "Please confirm duration") + "\nPrice: " + (selectedPackage.price || "Please confirm current price") + "\n\nWould you like the itinerary or package inclusions?";
  }

  // Handle short confirmations in context instead of sending "yes"/"ok" to the fallback.
  const isYes = /^(yes|yeah|yep|ok|okay|sure|ha|haa|avunu|sare|alright|fine|cheppu|cheppandi)$/.test(q);
  if (isYes && pkg && (prevA.includes("would you like the itinerary or package inclusions") || prevA.includes("itinerary or package inclusions"))) {
    return "Sure andi! " + pkg.name + " ki day-wise itinerary kavala, leka package lo em include avuthayo cheppala?";
  }
  if (isYes && pkg && (prevA.includes("confirm") || prevA.includes("departure") || prevA.includes("batch"))) {
    return "Okay andi! " + pkg.name + " departure dates ippudu approved data lo confirm kaaledu. Wrong date cheppakunda travel team confirmation tarvatha share cheyyali. Inthalo itinerary or inclusions kavala?";
  }
  if (/^(ok|okay|alright|fine|sare|thanks|thank you|thankyou|got it|understood)$/.test(q)) {
    return pkg
      ? "Sure andi! " + pkg.name + " gurinchi inka em details kavali — itinerary, inclusions, price, leka departure dates?"
      : "Sure andi! Inka emaina help kavala? Package details, itinerary, price, inclusions gurinchi adagochu.";
  }

  // Common general-knowledge questions must never be answered by an unrelated travel FAQ.
  if (includesAny(q, [
    "what does llm stand for", "what is an llm", "what is llm",
    "llm meaning in artificial intelligence", "llm in artificial intelligence",
    "large language model", "what does ai stand for", "what is artificial intelligence"
  ])) {
    return "LLM stands for Large Language Model. It is an AI model trained on large amounts of text so it can understand and generate language, answer questions, summarize information, and help with writing. Examples include models used in chatbots.";
  }

  // Keep package discovery short and split domestic vs international.
  const domesticPackages = data.packages.filter((p) => /char dham|kullu manali|shimla|kerala|kashmir|gokarna|dandeli|spiti|himachal|jyotirlinga/i.test([p.name, p.destination || "", ...(((p as PackageRecord & { aliases?: string[] }).aliases) || [])].join(" ")));
  const internationalPackages = data.packages.filter((p) => /thailand|vietnam|dubai|bali|singapore|malaysia|international/i.test([p.name, p.destination || "", ...(((p as PackageRecord & { aliases?: string[] }).aliases) || [])].join(" ")));
  if (includesAny(q, ["domestic", "within india", "india packages", "indian packages", "domestic packages"])) {
    const lines = domesticPackages.map((p) => "- **" + p.name + "** — " + (p.duration || "duration to be confirmed") + " — " + (p.price || "price to be confirmed"));
    return lines.length ? "Our domestic packages:\n\n" + lines.join("\n") + "\n\nWhich package would you like details for?" : "Domestic package list needs confirmation.";
  }
  if (includesAny(q, ["international", "outside india", "abroad packages", "foreign packages", "international packages"])) {
    const lines = internationalPackages.map((p) => "- **" + p.name + "** — " + (p.duration || "duration to be confirmed") + " — " + (p.price || "price to be confirmed"));
    return lines.length ? "Our international packages:\n\n" + lines.join("\n") + "\n\nWhich package would you like details for?" : "Our international package list is being updated. Please ask our travel team to confirm current options.";
  }

  // For a general package question, offer the two categories first.
  if (includesAny(q, [
    "which packages do you have", "which package do you have", "what packages do you have", "what package do you have", "which packages are available", "what package do you offer",
    "what packages are available", "show me your packages", "list your packages",
    "what tours do you offer", "which tours do you have", "what trips do you offer",
    "mee packages enti", "em packages unnayi", "ye packages unnayi", "packages em unnayi",
    "package list", "available packages"
  ])) {
    const packageLines = data.packages.map((p) =>
      "- " + p.name + (p.duration ? " — " + p.duration : "") + (p.price ? " — " + p.price : "")
    );
    return packageLines.length
      ? "We have both domestic and international tour packages.\n\n- **Domestic packages** — tours within India\n- **International packages** — tours abroad\n\nWhich would you like to explore: domestic or international?"
      : "Our package list is being updated. Please ask our travel team to confirm current options.";
  }

  // Direct factual answers take priority over sales prompts.
  // Answer common package questions directly from the verified itinerary before generic FAQ matching.
  if (includesAny(q, ["kedarnath trek how many km", "kedarnath trek distance", "kedarnath trek kitna km", "kedarnath track how many km", "how many km kedarnath", "kedarnath trekking distance"])) {
    return "Kedarnath trek approximately 22 km andi. Package itinerary prakaram Day 7 early morning trek start chestharu; darshan tarvatha camp lo night stay untundi. Pony/doli charges extra.";
  }
  if (includesAny(q, ["when to reach yamunotri", "when do we reach yamunotri", "which day yamunotri", "yamunotri which day", "yamunotri day", "yamunotri eppudu", "when is yamunotri"])) {
    return "Package itinerary prakaram Day 3 Yamunotri darshan untundi andi. Lakhamandal nunchi Janki Chatti ki velli, akkadi nunchi trek chestharu. Exact timings road/weather conditions batti marachu.";
  }
  if (includesAny(q, ["where is your office", "where is you office located", "office location", "office address", "where are you located", "your office located"])) {
    return "On A Trip Holidays office Malakpet, Hyderabad, Telangana lo undi andi. Visit cheyyadaniki mundu phone lo confirm chesukondi.";
  }

  if (includesAny(q, ["things to carry", "what to carry", "packing list", "packing", "what should i take", "what to take", "items to carry", "required things", "things to bring", "what should i bring", "carry for this trip"])) {
    const items = pkg?.thingsToCarry || [];
    return "Char Dham trip ki ivvi carry cheyyandi andi: " + (items.length ? items.join(", ") : "ID proof, medicines, trekking shoes, warm clothes, raincoat, charger and water bottle") + ".";
  }
  if (includesAny(q, ["package price and gst total", "price with gst", "including gst", "total with gst", "gst total", "gst kalipi", "gst tho kalipi", "gst tho total", "gst add cheste", "gst add chesthe", "gst entha total", "package price gst", "gst kalipi entha", "total amount"]) ||
      (includesAny(q, ["antey yentha", "ante entha", "total entha", "how much then"]) && (prevA.includes("gst") || prevA.includes("price")))) {
    return "Package ₹23,499 + 5% GST (approx ₹1,175) andi. GST kalipi total approx ₹24,674 per person.";
  }
  if (includesAny(q, ["gst", "tax extra", "is tax compulsory", "tax compulsory", "gst compulsory", "gst included", "without gst"])) {
    return "Avunu andi, 5% GST extra. ₹23,499 package ki GST approx ₹1,175 per person.";
  }
  if (includesAny(q, ["below 5", "under 5", "under five", "below five", "below 5 years", "under 5 years", "child below 5", "child under 5", "less than 5"])) return "5 years kanna takkuva age kids ki free andi.";
  if (includesAny(q, ["5 to 11", "5-11", "age 5", "age 6", "age 7", "age 8", "age 9", "age 10", "age 11", "8 year", "8 years", "child price", "child cost", "kid price", "kids price"])) return "5–11 years kids ki ₹15,399 + 5% GST per child andi.";
  if (includesAny(q, ["11 above", "above 11", "over 11", "12 year", "12 years", "age 12"])) return "11 years paina age unte adult package price apply avuthundi andi.";
  if (includesAny(q, ["2 sharing", "two sharing", "double sharing", "couple room", "separate room", "private room", "twin sharing"])) return "2-sharing upgrade ₹3,000 extra per person for 8 nights andi. Kedarnath, Badrinath lo group sharing untundi.";
  if (includesAny(q, ["room sharing", "sharing room", "room type", "triple sharing", "four sharing", "3 sharing", "4 sharing", "group sharing", "accommodation", "room basis"])) return "Normal ga 3–4 sharing rooms untayi andi. Kedarnath camp lo common washrooms untayi; private room undadu.";
  if (includesAny(q, ["breakfast", "dinner", "lunch", "food", "meals", "vegetarian", "veg food"])) return includesAny(q, ["lunch"]) ? "10 breakfasts and 10 dinners include avuthayi andi. Lunch include kaaledu." : "10 breakfasts and 10 dinners include avuthayi andi.";
  if (includesAny(q, ["which vehicle", "what vehicle", "vehicle type", "which bus", "bus type", "tempo traveller", "transport included", "transport"])) return "Transport included andi. AC Delhi–Haridwar varake untundi; hills lo AC undadu. Vehicle group size batti untundi.";
  if (includesAny(q, ["pickup point", "where pickup", "pickup from", "starting city", "from hyderabad", "from bangalore", "from vijayawada", "from vizag", "where does the trip start", "start and end", "delhi to delhi"])) return "Ee Char Dham trip Delhi nunchi start ayi Delhi lone end avuthundi andi. Hyderabad nunchi Delhi varaku train booking assistance untundi.";
  if (includesAny(q, ["senior citizen", "old age", "elderly", "parents can travel", "can old people"])) return "Yamunotri, Kedarnath lo trekking and high-altitude travel untayi andi. Senior citizens doctor advice teesukoni plan cheyyandi.";
  if (includesAny(q, ["booking advance", "advance amount", "how much advance", "booking amount", "how to book", "book this package", "booking process", "reserve this"])) return "Booking ki ₹5,000 per person advance andi. Balance amount departure ki 7 days mundu pay cheyyali.";
  if (includesAny(q, ["cancellation policy", "cancel booking", "refund", "money back", "cancellation charges"])) return "Registration charges refund avvavu andi. Start date ki 15 days mundu cancel chesthe 50% charge; 7 days lopu cancel chesthe 100% charge.";
  if (includesAny(q, ["upcoming batches", "upcoming batch", "next batch", "departure dates", "next departure", "which dates", "what dates", "batch dates", "seats available", "october batch", "november batch"])) {
    const batchPackage = pkg || packageFromHistory(history);
    const name = batchPackage?.name || "Ee package";
    const departures = batchPackage?.departures || [];
    const publishedDates = departures.filter((d) => !/confirm|update|subject to confirmation|need updating/i.test(d));
    if (publishedDates.length) return name + " departure details: " + publishedDates.join("; ") + ". Seats and dates final cheyyadaniki booking mundu confirm cheskondi andi.";
    return name + " ki approved departure dates ippudu available data lo levu andi. Guess chesi wrong date cheppanu; travel team tho confirm cheyyali. Inthalo itinerary or inclusions cheppana?";
  }
  if (includesAny(q, ["whatsapp", "send details", "send brochure", "share brochure", "brochure share"])) return "Sure andi, WhatsApp lo details pampinchadaniki note chestha. Mee WhatsApp number share chesthara?";
  if (includesAny(q, ["price", "cost", "rate", "how much", "per person", "amount", "package rate"])) return charDham ? "Char Dham package ₹23,499 per person + 5% GST andi." : (pkg?.price ? pkg.name + " price " + pkg.price + " andi." : fallback);
  if (includesAny(q, ["how many days", "how long", "duration", "how many nights", "days is", "days trip", "nights"])) return pkg ? "Ee trip " + (pkg.duration || "duration details available levu") + " andi. " + (charDham ? "Delhi nunchi start ayi Delhi lone end avuthundi." : "") : fallback;

  if (includesAny(q, ["itinerary", "day wise", "day by day", "daily plan", "each day", "schedule", "day 1", "day one", "first day"])) {
    if (!pkg?.itinerary?.length) return fallback;
    const match = q.match(/day\s*(\d{1,2})/);
    if (match) return pkg.itinerary[Number(match[1]) - 1] || "Aa day details na daggara levu andi.";
    if (includesAny(q, ["day 1", "day one", "first day"])) return pkg.itinerary[0];
    return pkg.itinerary.join("\n");
  }
  if (includesAny(q, ["inclusions", "what is included", "what's included", "included in package", "include"])) {
    const items = (pkg?.inclusions || []).slice(0, 6);
    return items.length ? "Package lo main ga " + items.join("; ") + " include avuthayi andi." : fallback;
  }
  if (includesAny(q, ["exclusions", "what is excluded", "not included", "exclude"])) return "Extra ga personal expenses, pony/doli charges, tips, heater charges and package lo mention cheyyani items ki pay cheyyali andi.";

  if (includesAny(q, ["char dham", "chardham", "char dham yatra", "chardham yatra"])) {
    return "Okay andi! Mee group lo entha mandi untaru? Meeru ye city nunchi start avutharu?";
  }

  // Interpret numeric/city replies only when the previous assistant message asked for that information.
  const cityNames = ["hyderabad", "vijayawada", "visakhapatnam", "vizag", "bangalore", "bengaluru", "chennai", "mumbai", "pune", "delhi", "kolkata", "tirupati", "warangal", "guntur", "rajahmundry", "nellore", "kurnool", "anantapur"];
  const isCity = cityNames.some((city) => q.includes(city));
  const isCount = /^\d{1,2}(\s*(members?|people|persons?|pax))?$/.test(q) || includesAny(q, ["members", "people", "persons", "travellers", "travelers", "pax", "couple", "family", "only me", "just me"]);
  if (prevA.includes("entha mandi") && isCount) return "Okay andi! Meeru ye city nunchi start avutharu?";
  if ((prevA.includes("ye city") || prevA.includes("which city")) && isCity && packageFromHistory(history)) {
    return "Super andi! Char Dham trip Delhi nunchi start ayi Delhi lone end avuthundi. Total 10 nights, 11 days. Yamunotri, Gangotri, Kedarnath, Badrinath darshan cover avuthayi. Day-wise itinerary cheppana, leka price and inclusions kavala?";
  }

  // Avoid treating a negated or fictional mention of travel as a real travel enquiry.
  const negatedTravelMention = includesAny(q, [
    "do not discuss travel", "don't discuss travel", "do not discuss travel packages",
    "don't discuss travel packages", "not about travel", "unrelated to travel",
    "without discussing travel", "fictional planet", "invent a playful greeting"
  ]);
  if (!negatedTravelMention && includesAny(q, ["package", "tour", "trip", "travel", "holiday", "vacation", "destination"])) {
    return "Okay andi, meeru ye destination ki vellali anukuntunnaru?";
  }

  const faq = [...data.faqs].map((item) => {
    const terms = [item.question, ...(item.keywords || [])].flatMap((s) => normalize(s).split(" "));
    const overlap = new Set(normalize(question).split(" ").filter((token) => token.length > 2 && terms.includes(token))).size;
    return { item, overlap };
  }).sort((a, b) => b.overlap - a.overlap)[0];
  if (faq && faq.overlap >= 3) return faq.item.answer;
  // If the customer continues a package conversation, keep the sales flow helpful.
  if (pkg) {
    return "Andi, " + pkg.name + " gurinchi adugutunnara? Naa daggara verified ga unna details — duration " + (pkg.duration || "confirm cheyyali") + ", price " + (pkg.price || "confirm cheyyali") + ". Itinerary, inclusions, exclusions, leka departure dates lo edi kavalo cheppandi.";
  }
  return fallback;
}

/**
 * Optional self-hosted Ollama adapter.
 * When no private model runtime is configured, keep the existing deterministic
 * travel FAQ engine available during platform development.
 */
async function answerWithConfiguredLLM(question: string, history: ChatMessage[], requestedModel?: string): Promise<string | null> {
  let configuredUrl = process.env.OATHOME_LLM_BASE_URL?.trim() || "";
  // Match GET /api/chat and /api/runtime: in local development, use the standard Ollama endpoint by default.
  if (!configuredUrl && process.env.NODE_ENV !== "production") configuredUrl = "http://127.0.0.1:11434";
  while (configuredUrl.endsWith("/")) configuredUrl = configuredUrl.slice(0, -1);
  if (!configuredUrl) return null;

  const model = requestedModel?.trim() || process.env.OATHOME_LLM_MODEL?.trim() || "qwen2.5:3b";
  const systemPrompt = [
    "You are OWN, a helpful general-purpose AI assistant. You can answer ordinary educational, writing, reasoning, technology, and everyday questions, not only travel questions.",
    "For On A Trip Holidays travel/package questions, act as Radhika, a friendly sales assistant. Reply naturally in the customer's language; Telugu-English mix is welcome.",
    "Answer the question that was actually asked. Do not redirect a general knowledge question into a travel sales pitch.",
    "In artificial intelligence, LLM means Large Language Model. Do not interpret LLM as a law degree unless the user explicitly asks about law degrees.",
    "Use the verified company knowledge below as the source of truth for company details, package prices, dates, inclusions, exclusions, policies and itinerary facts.",
    "Never invent travel prices, availability, booking confirmations, discounts, or package details. If a travel-specific detail is missing from the supplied knowledge, clearly say it needs confirmation from the travel team.",
    "For general questions, answer using your general knowledge and explain uncertainty when appropriate. Do not claim certainty when unsure.",
    "Ask one useful qualifying question at a time only when needed. Do not claim to have booked anything or sent a WhatsApp message.",
    "Keep answers clear, relevant, and concise.",
    "VERIFIED COMPANY KNOWLEDGE:",
    JSON.stringify(data)
  ].join("\n");

  const priorMessages = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const messages = [
    { role: "system", content: systemPrompt },
    ...priorMessages,
    { role: "user", content: question }
  ];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const upstreamToken = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
  if (upstreamToken) headers.Authorization = `Bearer ${upstreamToken}`;

  const callOllama = async (path: string, body: unknown): Promise<Response> => fetch(`${configuredUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(90000)
  });

  try {
    // First try Ollama's chat endpoint.
    const response = await callOllama("/api/chat", { model, messages, stream: false });
    if (response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const message = payload && typeof payload === "object"
        ? (payload as { message?: { content?: unknown } }).message : undefined;
      if (typeof message?.content === "string" && message.content.trim()) {
        return message.content.trim().slice(0, 6000);
      }
      console.warn("[OWN chat] Ollama /api/chat returned no message content.");
    } else {
      const detail = (await response.text().catch(() => "")).slice(0, 1000);
      console.warn("[OWN chat] Ollama /api/chat returned HTTP", response.status, detail);
    }

    // Compatibility fallback for Ollama-compatible runtimes that expose
    // /api/generate reliably but not /api/chat.
    const prompt = [
      systemPrompt,
      ...priorMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${question}`,
      "ASSISTANT:"
    ].join("\n\n");
    const generateResponse = await callOllama("/api/generate", { model, prompt, stream: false });
    if (!generateResponse.ok) {
      const detail = (await generateResponse.text().catch(() => "")).slice(0, 1000);
      console.warn("[OWN chat] Ollama /api/generate returned HTTP", generateResponse.status, detail);
      return null;
    }
    const generated: unknown = await generateResponse.json().catch(() => null);
    const text = generated && typeof generated === "object"
      ? (generated as { response?: unknown }).response : undefined;
    if (typeof text === "string" && text.trim()) return text.trim().slice(0, 6000);
    console.warn("[OWN chat] Ollama /api/generate returned no response text.");
    return null;
  } catch (error) {
    console.warn("[OWN chat] Ollama inference request failed:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function GET() {
  // The chat UI expects this route to provide a model list for its selector.
  let configuredUrl = (process.env.OATHOME_LLM_BASE_URL?.trim() || "").replace(/\/+$/, "");
  if (!configuredUrl && process.env.NODE_ENV !== "production") configuredUrl = "http://127.0.0.1:11434";
  const selectedLLM = process.env.OATHOME_LLM_MODEL?.trim() || "qwen2.5:3b";

  if (!configuredUrl) {
    return NextResponse.json({
      service: "OATHome chat API", status: "knowledge_fallback_only",
      configuredLLM: false, selectedLLM, defaultModel: "", models: [],
      inferenceVerified: false, responseModes: ["knowledge-fallback"],
      message: "No cloud inference runtime is configured. The travel knowledge fallback is available, but this website is not itself an LLM.",
      apiKeysRequired: false
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(`${configuredUrl}/api/tags`, {
      cache: "no-store", signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error("Model list request failed");
    const payload: unknown = await response.json();
    const models = payload && typeof payload === "object" && Array.isArray((payload as { models?: unknown }).models)
      ? (payload as { models: Array<{ name?: unknown; size?: unknown; details?: unknown }> }).models
          .filter((item) => item && typeof item.name === "string")
          .map((item) => ({
            name: item.name as string,
            ...(typeof item.size === "number" ? { size: item.size } : {}),
            ...(item.details && typeof item.details === "object" ? { details: item.details } : {})
          }))
      : [];
    return NextResponse.json({
      service: "OATHome chat API",
      status: models.length ? "runtime_connected" : "runtime_connected_no_models",
      configuredLLM: true, selectedLLM,
      defaultModel: models.some((item) => item.name === selectedLLM) ? selectedLLM : (models[0]?.name || ""),
      models, inferenceVerified: false,
      responseModes: ["configured-llm", "knowledge-fallback"],
      message: models.length ? "Model runtime is reachable. A chat request is still required to verify inference." : "Ollama is reachable, but no models are installed.",
      apiKeysRequired: false
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      service: "OATHome chat API", status: "runtime_unreachable",
      configuredLLM: true, selectedLLM, defaultModel: "", models: [],
      inferenceVerified: false, responseModes: ["knowledge-fallback"],
      message: "The configured model runtime could not be reached from the website server.",
      apiKeysRequired: false
    }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const payload = body as { messages?: unknown; model?: unknown };
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) return NextResponse.json({ error: "Send a message to continue." }, { status: 400 });
  const messages = payload.messages.filter((item): item is ChatMessage =>
    !!item && typeof item === "object" &&
    typeof (item as { role?: unknown }).role === "string" &&
    typeof (item as { content?: unknown }).content === "string"
  );
  const latestIndex = messages.map((item) => item.role).lastIndexOf("user");
  const latest = messages[latestIndex];
  if (!latest || !latest.content.trim()) return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  if (latest.content.length > 4000) return NextResponse.json({ error: "Your message is too long." }, { status: 413 });
  const history = messages.slice(0, latestIndex).slice(-20);

  // Hard-stop greetings before package matching, FAQ scoring, or model fallback.
  const greetingText = latest.content.toLowerCase().trim().replace(/[!.?,]+$/g, "").replace(/\s+/g, " ");
  if (/^(hi|hii+|hlo|helo|hello|hey|heyy+|good morning|good afternoon|good evening|namaste|namaskaram)$/.test(greetingText)) {
    const greeting = "Hi andi! Nenu Radhika, On A Trip Holidays travel team nunchi matladuthunnanu. Meeru ye trip plan chesthunnaru?";
    const ndjson = JSON.stringify({ message: { role: "assistant", content: greeting }, done: true }) + "\n";
    return new Response(ndjson, { status: 200, headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-OATHome-Response-Mode": "greeting-rule" } });
  }

  // Prefer verified deterministic knowledge for factual travel questions.
  // Use the local LLM for open-ended conversation only when the knowledge
  // engine has no specific answer, preventing it from contradicting prices,
  // inclusions, dates, or policies already present in the approved data.
  const knowledgeAnswer = answerQuestion(latest.content, history);
  const hasVerifiedAnswer = knowledgeAnswer !== fallback;
  const requestedModel = typeof payload.model === "string" && /^[a-zA-Z0-9._:/-]{1,120}$/.test(payload.model) ? payload.model : undefined;
  const modelAnswer = hasVerifiedAnswer ? null : await answerWithConfiguredLLM(latest.content, history, requestedModel);
  const answer = hasVerifiedAnswer ? knowledgeAnswer : (modelAnswer || knowledgeAnswer);
  const responseMode = hasVerifiedAnswer ? "knowledge-fallback" : (modelAnswer ? "configured-llm" : "knowledge-fallback");
  const ndjson = JSON.stringify({ message: { role: "assistant", content: answer }, done: true }) + "\n";
  return new Response(ndjson, { status: 200, headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-OATHome-Response-Mode": responseMode } });
}
