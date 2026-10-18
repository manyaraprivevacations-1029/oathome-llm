import { NextRequest, NextResponse } from "next/server";
import knowledge from "../../../data/travel-knowledge.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PackageRecord = {
  name: string; destination?: string; duration?: string; price?: string;
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

function findPackage(s: string): PackageRecord | undefined {
  const q = normalize(s);
  return data.packages.find((p) => {
    const n = normalize(p.name);
    if (n.includes("char dham") && includesAny(q, ["char dham", "chardham", "char dham yatra", "chardham yatra"])) return true;
    return n.split(" ").some((w) => w.length > 4 && q.split(" ").includes(w));
  });
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
  const pkg = findPackage(question) || packageFromHistory(history) || data.packages[0];
  const charDham = !!pkg && normalize(pkg.name).includes("char dham");

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|namaskaram)$/.test(q)) {
    return "Hi andi! Nenu Radhika, On A Trip Holidays travel team nunchi matladuthunnanu. Meeru ye trip plan chesthunnaru?";
  }

  // Direct factual answers take priority over sales prompts.
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
  if (includesAny(q, ["upcoming batches", "upcoming batch", "next batch", "departure dates", "next departure", "seats available", "october batch", "november batch"])) return "Next batch date inka confirm kaaledu andi. Confirm ayina date vachaka exact ga cheptham.";
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

  if (includesAny(q, ["package", "tour", "trip", "travel", "holiday", "vacation", "destination"])) return "Okay andi, meeru ye destination ki vellali anukuntunnaru?";

  const faq = [...data.faqs].map((item) => {
    const terms = [item.question, ...(item.keywords || [])].flatMap((s) => normalize(s).split(" "));
    const overlap = new Set(normalize(question).split(" ").filter((token) => token.length > 2 && terms.includes(token))).size;
    return { item, overlap };
  }).sort((a, b) => b.overlap - a.overlap)[0];
  if (faq && faq.overlap >= 2) return faq.item.answer;
  return fallback;
}

/**
 * Optional self-hosted Ollama adapter.
 * When no private model runtime is configured, keep the existing deterministic
 * travel FAQ engine available during platform development.
 */
async function answerWithConfiguredLLM(question: string, history: ChatMessage[]): Promise<string | null> {
  const configuredUrl = process.env.OATHOME_LLM_BASE_URL?.trim().replace(/\/+$/, "");
  if (!configuredUrl) return null;

  const model = process.env.OATHOME_LLM_MODEL?.trim() || "qwen2.5:3b";
  const systemPrompt = [
    "You are Radhika, a friendly sales assistant for On A Trip Holidays.",
    "Reply naturally in the language used by the customer. Telugu-English mix is welcome.",
    "Use only the verified company knowledge supplied below for package prices, dates, inclusions, exclusions, policies and itinerary facts.",
    "Never invent prices, availability, booking confirmations, discounts or package details.",
    "If the supplied knowledge does not answer a question, say you will confirm with the travel team.",
    "Ask one useful qualifying question at a time. Do not claim to have booked anything or sent a WhatsApp message.",
    "Keep answers concise and customer-friendly.",
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

  try {
    const response = await fetch(`${configuredUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, stream: false }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") return null;
    const message = (payload as { message?: { content?: unknown } }).message;
    if (typeof message?.content !== "string" || !message.content.trim()) return null;
    return message.content.trim().slice(0, 6000);
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    models: [{ name: "OWN-Travel-Knowledge", details: { family: "rule-based", parameter_size: "local knowledge engine" } }],
    defaultModel: "OWN-Travel-Knowledge",
    runtime: "OWN deterministic travel knowledge engine",
    externalAI: false,
    apiKeysRequired: false,
    configuredLLM: Boolean(process.env.OATHOME_LLM_BASE_URL?.trim()),
    selectedLLM: process.env.OATHOME_LLM_MODEL?.trim() || "qwen2.5:3b"
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const payload = body as { messages?: unknown };
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
  const modelAnswer = await answerWithConfiguredLLM(latest.content, history);
  const answer = modelAnswer || answerQuestion(latest.content, history);
  const responseMode = modelAnswer ? "configured-llm" : "knowledge-fallback";
  const ndjson = JSON.stringify({ message: { role: "assistant", content: answer }, done: true }) + "\n";
  return new Response(ndjson, { status: 200, headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-OATHome-Response-Mode": responseMode } });
}
