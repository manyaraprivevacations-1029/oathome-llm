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
  const datesKnown = hasTravelDates(priorText) || hasTravelDates(q);
  const travellersKnown = hasTravellerCount(priorText) || hasTravellerCount(q);
  const alreadyIntroduced = /radhika|రాధిక/.test(priorText.toLowerCase());
  if (!isPackageEnquiry(q) && !contextPackage) return undefined;
  if (!alreadyIntroduced && !contextPackage) {
    return destinationKnown
      ? "నమస్కారం అండి, నేను రాధిక — On A Trip Holidays ట్రావెల్ టీమ్ నుంచి మాట్లాడుతున్నాను. మీరు Char Dham package గురించి ఆసక్తి చూపించారు. ఏ తేదీల్లో లేదా ఏ నెలలో ప్రయాణించాలని అనుకుంటున్నారండి?"
      : "నమస్కారం అండి, నేను రాధిక — On A Trip Holidays ట్రావెల్ టీమ్ నుంచి మాట్లాడుతున్నాను. మీరు ట్రావెల్ ప్యాకేజ్ గురించి ఆసక్తి చూపించారు. ఎక్కడికి లేదా ఎలాంటి ట్రిప్‌కి వెళ్లాలని చూస్తున్నారండి?";
  }
  if (!destinationKnown) return "సరే అండి, మీకు ఏ destination లేదా ఏ టైపు trip కావాలో చెప్పండి. దాని ప్రకారం సరిపోయే package సూచిస్తాను.";
  if (!datesKnown) return "సరే అండి, ఆ ట్రిప్ కోసం ఏ తేదీల్లో లేదా ఏ నెలలో ప్రయాణించాలని అనుకుంటున్నారండి?";
  if (!travellersKnown) return "అలాగే అండి. మీతో కలిపి మొత్తం ఎంతమంది ప్రయాణిస్తారండి?";
  if (contextPackage) {
    const inclusions = (contextPackage.inclusions || []).slice(0, 3).join(", ");
    return `ధన్యవాదాలు అండి! మీకు **${contextPackage.name}** సరిపోవచ్చు. Duration: ${contextPackage.duration || "travel team will confirm"}. Brochure price: ${contextPackage.price || "travel team will confirm"}. Main inclusions: ${inclusions || "travel team will confirm the inclusions"}. Current price and availability మా travel team confirm చేస్తారు. పూర్తి details WhatsApp‌లో పంపించనా?`;
  }
  return "ధన్యవాదాలు అండి! మీ travel dates, travellers వివరాల ప్రకారం సరిపోయే package ఎంపిక చేసి చెప్తాను. పూర్తి details WhatsApp‌లో పంపించనా?";
}

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|namaskaram)$/.test(q)) {
    return `Hello! Welcome to ${data.company.name}. What destination or package are you interested in?`;
  }

  if (includesAny(q, ["contact", "phone number", "call you", "contact number", "whatsapp"])) {
    return "Please visit " + data.company.website + " or ask me about a package. Our travel team can confirm contact details.";
  }

  // Qualify broad enquiries one step at a time; specific questions still receive factual answers.
  const directDetailQuestion = includesAny(q, ["price", "cost", "rate", "how much", "per person", "amount", "how many days", "how long", "duration", "nights", "include", "inclusions", "included", "exclude", "exclusions", "not included", "itinerary", "day wise", "day by day", "schedule", "room sharing", "sharing room", "vehicle", "which bus", "departure", "batch", "dates"]);
  if (!directDetailQuestion) {
    const leadPrompt = salesQuestion(contextMessages, contextPackage, q);
    if (leadPrompt) return leadPrompt;
  }

  const isShortFollowUp = q.split(" ").length <= 10;
  if (isShortFollowUp && contextPackage) {
    // Explicit requests for a day-by-day schedule must be checked before the generic "day/days" duration rule.
    if (includesAny(q, ["itinerary", "day wise", "day by day", "schedule", "daily plan", "each day"])) {
      return (contextPackage.itinerary || []).length
        ? `**${contextPackage.name} — ${contextPackage.duration || ""}**\n` + (contextPackage.itinerary || []).join("\n")
        : data.company.fallback;
    }
    if (includesAny(q, ["room sharing", "sharing room", "room type", "room basis", "sharing basis", "how many sharing", "triple sharing", "four sharing", "3 sharing", "4 sharing", "group sharing", "accommodation", "stay arrangement", "two sharing", "2 sharing", "double sharing", "twin sharing", "private room", "private rooms", "double room"])) {
      return "The brochure says rooms are generally 3- or 4-sharing, based on group size and gender. Double-sharing is an upgrade costing an additional ₹3,000 per person for 8 nights only; Kedarnath and Badrinath remain group-sharing. Please confirm the current option with our travel team.";
    }
    if (includesAny(q, ["vehicle", "which bus", "type of bus", "transport vehicle", "tempo traveller", "traveller", "coach"])) {
      return "The brochure confirms transport for the trip, but it doesn’t specify the exact vehicle type. AC is available only from Delhi to Haridwar; AC does not operate on the hills. I’ll confirm the vehicle type with our travel team.";
    }
    if (includesAny(q, ["price", "cost", "rate", "how much", "per person", "amount"])) {
      return `The brochure price is **${contextPackage.price || "not listed"}**. Please confirm the current price and availability with our travel team.`;
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
    if (includesAny(q, ["departure", "batch", "dates", "when"])) {
      return `The brochure lists ${(contextPackage.departures || ["no dates"]).join("; ")} Please confirm the next available batch with our travel team.`;
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
      return `The brochure price is **${pkg.price || "not listed"}**. Please confirm the current price and availability with our travel team.`;
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
