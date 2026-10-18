import { NextRequest, NextResponse } from "next/server";
import knowledge from "../../../data/travel-knowledge.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PackageRecord = {
  name: string;
  destination?: string;
  duration?: string;
  price?: string;
  departures?: string[];
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: string[];
  notes?: string;
};
type FAQ = { question: string; answer: string; keywords?: string[] };
type Knowledge = {
  company: { name: string; website: string; greeting: string; fallback: string };
  services: string[];
  packages: PackageRecord[];
  faqs: FAQ[];
};

const data = knowledge as Knowledge;
const normalize = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const words = (value: string) => normalize(value).split(" ").filter((word) => word.length > 2);
const includesAny = (text: string, values: string[]) => values.some((value) => text.includes(normalize(value)));

function getPackageMentionedInContext(contextMessages: { role: string; content: string }[]): PackageRecord | undefined {
  // Search recent messages first so the most recently discussed package wins.
  for (const message of [...contextMessages].reverse()) {
    const text = normalize(message.content);
    const ranked = data.packages.map((pkg) => {
      const aliases = normalize(pkg.name + " " + (pkg.destination || "") + " char dham chardham");
      const aliasWords = [...new Set(words(aliases))];
      const score = aliasWords.filter((word) => text.split(" ").includes(word)).length;
      return { pkg, score };
    }).sort((a, b) => b.score - a.score);
    if (ranked[0]?.score && ranked[0].score >= 1) return ranked[0].pkg;
  }
  return undefined;
}

function answerQuestion(question: string, contextMessages: { role: string; content: string }[] = []): string {
  const q = normalize(question);
  const tokens = words(q);
  const contextPackage = getPackageMentionedInContext(contextMessages);

  const pkg = contextPackage || data.packages.find((item) => normalize(item.name + " " + (item.destination || "")).includes("char dham"));
  // Answer common customer FAQs directly and briefly; never repeat generic brochure disclaimers.
  if (includesAny(q, ["upcoming batches", "upcoming batch", "next batch", "departure dates", "next departure", "seats available"])) {
    return "Andi, next batch ki exact date approved package data lo confirm avvaledu. Date guess cheyyakunda travel team tho confirm cheyinchali.";
  }
  if (includesAny(q, ["below 5", "under 5", "under five", "below five", "below 5 years", "under 5 years", "child below 5", "child under 5"])) {
    return "5 years kanna takkuva age kids ki free andi.";
  }
  if (includesAny(q, ["5 to 11", "5-11", "5 to 11 years", "age 5", "age 6", "age 7", "age 8", "age 9", "age 10", "age 11", "8 year", "8 years", "child price", "child cost", "kid price", "kids price"])) {
    return "5–11 years kids ki ₹15,399 + 5% GST per child andi.";
  }
  if (includesAny(q, ["11 above", "above 11", "over 11", "12 year", "12 years", "age 12"])) {
    return "11 years paina age unte adult package price apply avuthundi andi.";
  }
  if (includesAny(q, ["2 sharing", "two sharing", "double sharing", "couple room", "separate room", "private room"])) {
    return "2-sharing upgrade ₹3,000 extra per person for 8 nights andi. Kedarnath, Badrinath lo group sharing untundi.";
  }
  if (includesAny(q, ["room sharing", "sharing room", "room type", "triple sharing", "four sharing", "3 sharing", "4 sharing", "group sharing", "accommodation"])) {
    return "Normal ga 3–4 sharing rooms untayi andi. Kedarnath camp lo common washrooms untayi; private room undadu.";
  }
  if (includesAny(q, ["breakfast", "dinner", "lunch", "food", "meals", "vegetarian", "veg food"])) {
    if (includesAny(q, ["lunch"])) return "Package lo 10 breakfasts and 10 dinners include ayyayi andi. Lunch package inclusions lo mention cheyyaledu.";
    return "Package lo 10 breakfasts and 10 dinners include ayyayi andi. Lunch include ani listed ledu.";
  }
  if (includesAny(q, ["pickup point", "where pickup", "pickup from", "start from", "starting city", "from hyderabad", "from bangalore", "from vijayawada", "from vizag"])) {
    return "Ee Char Dham trip Delhi nunchi start ayi Delhi lone end avuthundi andi. Train booking details mee boarding city batti travel team tho confirm cheyyandi.";
  }
  if (includesAny(q, ["which vehicle", "what vehicle", "vehicle type", "which bus", "bus type", "tempo traveller", "transport included", "transport"])) {
    return "Transport arrange chestham andi. AC Delhi–Haridwar varake untundi; hills lo AC undadu. Vehicle type group size batti untundi.";
  }
  if (includesAny(q, ["senior citizen", "old age", "elderly", "parents can travel", "can old people"])) {
    return "Char Dham lo trekking and high-altitude travel untayi andi, especially Yamunotri and Kedarnath. Senior citizens health and walking ability batti doctor advice teesukoni, travel team tho suitability confirm cheskondi.";
  }
  if (includesAny(q, ["booking advance", "advance amount", "how much advance", "booking amount", "how to book", "book this package", "booking process", "reserve this"])) {
    return "Booking ki ₹5,000 per person advance andi. Balance amount departure ki 7 days mundu pay cheyyali.";
  }
  if (includesAny(q, ["cancellation policy", "cancel booking", "refund", "money back", "cancellation charges"])) {
    return "Registration amount refund avvadu andi. Trip start avvadaniki 15 days mundu cancel chesthe 50% charge; 7 days lopu cancel chesthe 100% charge.";
  }
  if (includesAny(q, ["whatsapp", "send details", "send brochure", "share brochure", "brochure share"])) {
    return "Sure andi, WhatsApp lo details kavala? Mee WhatsApp number share cheyyandi; travel team ki details pampinchadaniki note chestha.";
  }
  if (includesAny(q, ["how many days", "how long", "duration", "how many nights", "days is", "days trip", "nights"])) {
    if (pkg) return `Ee Char Dham trip ${pkg.duration || "10 nights / 11 days"} andi. Delhi nunchi start ayi Delhi lone end avuthundi.`;
  }

  // Handle packing questions before sales qualification so they never return a generic package pitch.
  if (includesAny(q, ["things to carry", "what to carry", "packing list", "packing", "what should i take", "what to take", "items to carry", "required things", "things to bring", "what should i bring"])) {
    const pkg = contextPackage || data.packages.find((item) => normalize(item.name + " " + (item.destination || "")).includes("char dham"));
    const items = (pkg as (PackageRecord & { thingsToCarry?: string[] }) | undefined)?.thingsToCarry || [];
    if (items.length) return "Char Dham trip ki carry cheyyalsina items:\\n" + items.map((item) => "- " + item).join("\\n") + "\\n\\nID proof, Yatra Parchi printout and medicines marchipokandi.";
  }

function hasTravelDates(text: string): boolean {
  const q = normalize(text);
  return includesAny(q, ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "next week", "next month", "this weekend", "weekend", "tomorrow"])
    || q.includes(" to ") || q.includes(" - ") || q.includes("/");
}
function hasTravellerCount(text: string): boolean {
  const q = normalize(text);
  const numericReply = q.split(" ").some((token) => token.length > 0 && token.split("").every((ch) => "0123456789".includes(ch)));
  return numericReply
    || includesAny(q, ["people", "persons", "person", "travellers", "travelers", "adults", "members", "pax", "couple", "family", "solo trip", "just me", "we are", "only five", "only four", "only three", "only two"])
    || ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"].some((number) => q.split(" ").includes(number));
}
function hasOriginCity(text: string): boolean {
  return includesAny(normalize(text), ["hyderabad", "vijayawada", "visakhapatnam", "vizag", "bangalore", "bengaluru", "chennai", "mumbai", "pune", "delhi", "kolkata", "tirupati", "warangal", "karimnagar", "nizamabad", "khammam", "guntur", "rajahmundry", "nellore", "kurnool", "anantapur"]);
}
function isPackageEnquiry(q: string): boolean {
  return includesAny(q, ["package", "tour", "trip", "travel", "char dham", "chardham", "yatra", "holiday", "vacation", "itinerary", "price", "cost", "inclusions", "hotel", "destination"]);
}
function salesQuestion(contextMessages: { role: string; content: string }[], contextPackage: PackageRecord | undefined, q: string): string | undefined {
  const priorText = contextMessages.map((m) => m.content).join(" ");
  const userMessages = contextMessages.filter((m) => m.role === "user").map((m) => m.content);
  const destinationKnown = !!contextPackage || [...userMessages, q].some((m) => {
    const n = normalize(m);
    return data.packages.some((pkg) => normalize(pkg.name + " " + (pkg.destination || "") + " char dham chardham").split(" ").some((w) => w.length > 3 && n.split(" ").includes(w)));
  });
  const travellersKnown = userMessages.some(hasTravellerCount) || hasTravellerCount(q);
  const originKnown = userMessages.some(hasOriginCity) || hasOriginCity(q);
  const alreadyIntroduced = /radhika|రాధిక/.test(priorText.toLowerCase());
  if (!isPackageEnquiry(q) && !contextPackage) return undefined;
  if (!alreadyIntroduced) {
    const packageLabel = contextPackage?.name || "travel package";
    return destinationKnown
      ? `Hi andi! Nenu Radhika, On A Trip Holidays travel team nunchi matladuthunnanu. Meeru ${packageLabel} gurinchi enquiry chesaru kada. Mee group lo entha mandi untaru? Meeru ye city nunchi start avutharu?`
      : "Hi andi! Nenu Radhika, On A Trip Holidays travel team nunchi matladuthunnanu. Meeru ye trip plan chesthunnaru?";
  }
  if (!destinationKnown) return "Okay andi, meeru ye destination ki vellali anukuntunnaru?";
  if (!travellersKnown) return "Okay andi, mee group lo entha mandi untaru? Meeru Hyderabad nunchi start avuthara, leka vere city nunchi?";
  if (!originKnown) return "Super andi, total members note chesukunnanu. Meeru ye city nunchi start avutharu?";
  if (contextPackage) {
    return "Super andi! Char Dham trip Delhi nunchi start ayi Delhi lone end avuthundi. Total 10 nights / 11 days journey. Yamunotri, Gangotri, Kedarnath, Badrinath darshan cover avuthayi. Day-wise itinerary cheppana, leka package price and inclusions kavala?";
  }
  return "ధన్యవాదాలు అండి! మీ travel dates, travellers వివరాల ప్రకారం సరిపోయే package ఎంపిక చేసి చెప్తాను. పూర్తి details WhatsApp‌లో పంపించనా?";
}

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|namaskaram)$/.test(q)) {
    return "Hi andi! Nenu Radhika, On A Trip Holidays travel team nunchi matladuthunnanu. Meeru ye trip plan chesthunnaru?";
  }

  if (includesAny(q, ["contact", "phone number", "call you", "contact number", "whatsapp"])) {
    return "Please visit " + data.company.website + " or ask me about a package. Our travel team can confirm contact details.";
  }

  // Qualify broad enquiries one step at a time; specific questions still receive factual answers.
  const directDetailQuestion = includesAny(q, ["price", "cost", "rate", "how much", "per person", "amount", "how many days", "how long", "duration", "nights", "include", "inclusions", "included", "exclude", "exclusions", "not included", "itinerary", "day wise", "day by day", "schedule", "room sharing", "sharing room", "vehicle", "which bus", "departure", "batch", "dates", "things to carry", "what to carry", "packing list", "packing", "what should i take", "what to take", "items to carry", "required things", "things to bring", "what should i bring"]);
  if (!directDetailQuestion) {
    const leadPrompt = salesQuestion(contextMessages, contextPackage, q);
    if (leadPrompt) return leadPrompt;
  }

  const isShortFollowUp = q.split(" ").length <= 10;
  if (isShortFollowUp && contextPackage) {
    if (includesAny(q, ["things to carry", "what to carry", "packing list", "packing", "what should i take", "what to take", "items to carry", "required things", "things to bring", "what should i bring"])) {
      const items = (contextPackage as PackageRecord & { thingsToCarry?: string[] }).thingsToCarry || [];
      return items.length
        ? "**Things to carry for the Char Dham Yatra:**\\n" + items.map((item) => "- " + item).join("\\n") + "\\n\\nKeep your ID and Yatra Parchi printouts handy. Please check the latest travel instructions before departure."
        : data.company.fallback;
    }
    // Explicit requests for a day-by-day schedule must be checked before the generic "day/days" duration rule.
    if (includesAny(q, ["itinerary", "day wise", "day by day", "schedule", "daily plan", "each day"])) {
      return (contextPackage.itinerary || []).length
        ? `**${contextPackage.name} — ${contextPackage.duration || ""}**\n` + (contextPackage.itinerary || []).join("\n")
        : data.company.fallback;
    }
    if (includesAny(q, ["room sharing", "sharing room", "room type", "room basis", "sharing basis", "how many sharing", "triple sharing", "four sharing", "3 sharing", "4 sharing", "group sharing", "accommodation", "stay arrangement", "two sharing", "2 sharing", "double sharing", "twin sharing", "private room", "private rooms", "double room"])) {
      return "2-sharing kavali ante ₹3,000 extra per person for 8 nights. Kedarnath and Badrinath lo group sharing untundi.";
    }
    if (includesAny(q, ["vehicle", "which bus", "type of bus", "transport vehicle", "tempo traveller", "traveller", "coach"])) {
      return "Transport arrange chestham andi. AC Delhi–Haridwar varake untundi; hills lo AC undadu. Exact vehicle type group size batti untundi.";
    }
    if (includesAny(q, ["under 5", "below 5", "under five", "below five", "child below", "child under", "below 5 years", "under 5 years"])) {
      return "5 years kanna takkuva age kids ki free andi.";
    }
    if (includesAny(q, ["5 to 11", "5-11", "age 5", "age 6", "age 7", "age 8", "age 9", "age 10", "age 11", "child", "children", "kid", "kids"])) {
      return "5–11 years kids ki ₹15,399 per child + 5% GST.";
    }
    if (includesAny(q, ["price", "cost", "rate", "how much", "per person", "amount"])) {
      return `Char Dham package price **₹23,499 per person + 5% GST**.`;
    }
    if (includesAny(q, ["day", "days", "duration", "night", "nights", "how long"])) {
      return `It’s **${contextPackage.duration || "not listed"}**.`;
    }
    if (includesAny(q, ["include", "inclusions", "included"])) {
      const shortList = (contextPackage.inclusions || []).slice(0, 5);
      return shortList.length
        ? `**Main inclusions:** ${shortList.join("; ")}. Ask if you want the full list.`
        : data.company.fallback;
    }
    if (includesAny(q, ["exclude", "exclusions", "not included"])) {
      const shortList = (contextPackage.exclusions || []).slice(0, 4);
      return shortList.length
        ? `**Main exclusions:** ${shortList.join("; ")}. Ask if you want the full list.`
        : data.company.fallback;
    }
    if (includesAny(q, ["upcoming batch", "upcoming batches", "next batch", "next available batch", "batch", "departure", "dates", "when"])) {
      return "Andi, next batch date inka confirm kaaledu. Confirm ayina date vachaka exact ga cheptham.";
    }
    if (includesAny(q, ["where", "destination", "places", "which places"])) {
      return contextPackage.destination || data.company.fallback;
    }
  }

  const matchedPackage = data.packages.map((pkg) => {
    const aliases = normalize(pkg.name + " " + (pkg.destination || "") + " char dham chardham yatra");
    const score = new Set(tokens.filter((token) => aliases.split(" ").includes(token))).size;
    return { pkg, score };
  }).sort((a, b) => b.score - a.score)[0];

  if (matchedPackage && matchedPackage.score >= 1) {
    const pkg = matchedPackage.pkg;
    if (includesAny(q, ["how many days", "how long", "duration", "how many nights", "days is", "days trip", "nights"])) {
      return `It’s **${pkg.duration || "not listed"}**.`;
    }
    if (includesAny(q, ["price", "cost", "rate", "how much", "per person", "amount"])) {
      return `Char Dham package price **₹23,499 per person + 5% GST** andi.`;
    }
    if (includesAny(q, ["include", "inclusions", "included"])) {
      return (pkg.inclusions || []).length
        ? `**Main inclusions:** ${(pkg.inclusions || []).slice(0, 5).join("; ")}. Ask if you want the full list.`
        : data.company.fallback;
    }
    if (includesAny(q, ["exclude", "exclusions", "not included"])) {
      return (pkg.exclusions || []).length
        ? `**Main exclusions:** ${(pkg.exclusions || []).slice(0, 4).join("; ")}. Ask if you want the full list.`
        : data.company.fallback;
    }
    if (includesAny(q, ["itinerary", "day wise", "day by day", "schedule"])) {
      return (pkg.itinerary || []).length
        ? `**${pkg.name} — ${pkg.duration || ""}**\n` + (pkg.itinerary || []).join("\n")
        : data.company.fallback;
    }
    // A package name or general package question gets a short overview, never the whole brochure.
    return `**${pkg.name}** is a ${pkg.duration || "tour package"} covering ${pkg.destination || "the listed destinations"}. Would you like to know the price, duration, inclusions, or itinerary?`;
  }

  const faq = [...data.faqs].map((item) => {
    const terms = [item.question, ...(item.keywords || [])].flatMap(words);
    const overlap = new Set(tokens.filter((token) => terms.includes(token))).size;
    return { item, overlap };
  }).sort((a, b) => b.overlap - a.overlap)[0];
  if (faq && faq.overlap >= 2) return faq.item.answer;

  const packageIntent = includesAny(q, [
    "package", "tour", "trip", "itinerary", "price", "cost", "rate", "per person",
    "inclusion", "inclusions", "exclusion", "exclusions", "hotel", "stay", "departure",
    "batch", "days", "nights", "booking", "destination", "places to visit"
  ]);
  if (packageIntent) {
    const available = data.packages.map((pkg) => pkg.name);
    if (available.length) return "Which package do you mean?\n" + available.map((name) => "- " + name).join("\n");
    return data.company.fallback;
  }
  return data.company.fallback;
}

export async function GET() {
  return NextResponse.json({
    models: [{ name: "OWN-Travel-Knowledge", details: { family: "rule-based", parameter_size: "local knowledge engine" } }],
    defaultModel: "OWN-Travel-Knowledge",
    runtime: "OWN deterministic travel knowledge engine",
    externalAI: false,
    apiKeysRequired: false,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }

  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const payload = body as { messages?: unknown };
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return NextResponse.json({ error: "Send a message to continue." }, { status: 400 });
  }
  const messages = payload.messages.filter((item): item is { role: string; content: string } =>
    !!item && typeof item === "object" &&
    typeof (item as { role?: unknown }).role === "string" &&
    typeof (item as { content?: unknown }).content === "string"
  );
  const latestIndex = messages.map((item) => item.role).lastIndexOf("user");
  const latest = messages[latestIndex];
  if (!latest || !latest.content.trim()) return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  if (latest.content.length > 4000) return NextResponse.json({ error: "Your message is too long." }, { status: 413 });

  const contextMessages = messages.slice(0, latestIndex).slice(-20);
  const answer = answerQuestion(latest.content, contextMessages);
  const ndjson = JSON.stringify({ message: { role: "assistant", content: answer }, done: true }) + "\n";
  return new Response(ndjson, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
