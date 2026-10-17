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

function answerQuestion(question: string, conversationContext = ""): string {
  const q = normalize(question);
  const tokens = words(q);
  const context = normalize(conversationContext);

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|namaskaram)$/.test(q)) {
    return `Hello! Welcome to ${data.company.name}. 😊 I can help you with our available tour packages, prices, itineraries, inclusions, exclusions, and departure details. What destination are you interested in?`;
  }

  if (includesAny(q, ["contact", "phone number", "call you", "contact number", "whatsapp"])) {
    return "Please share your name and the best time to contact you, or visit " + data.company.website + ". Our travel team can confirm the correct contact details and help you further.";
  }

  // Match a named package before FAQs: questions such as "char dham trip how many days"
  // contain the word "trip", which must not accidentally trigger the generic booking FAQ.
  const matchedPackage = data.packages
    .map((pkg) => {
      const name = normalize(pkg.name);
      const destination = normalize(pkg.destination || "");
      const aliases = normalize(pkg.name + " " + (pkg.destination || "") + " char dham chardham yatra");
      const matched = tokens.filter((token) => aliases.split(" ").includes(token));
      return { pkg, score: new Set(matched).size };
    })
    .sort((a, b) => b.score - a.score)[0];

  const contextMatchedPackage = data.packages
    .map((pkg) => {
      const aliases = normalize(pkg.name + " " + (pkg.destination || "") + " char dham chardham yatra");
      const score = new Set(words(aliases).filter((token) => context.includes(token))).size;
      return { pkg, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  // Resolve short follow-ups against the package discussed earlier in this chat.
  const isShortFollowUp = q.split(" ").length <= 5;
  const contextPackage = contextMatchedPackage && contextMatchedPackage.score >= 2 ? contextMatchedPackage.pkg : undefined;
  if (isShortFollowUp && contextPackage) {
    if (includesAny(q, ["price", "cost", "rate", "how much", "per person"]) && contextPackage.price) {
      return "The **" + contextPackage.name + "** brochure price is **" + contextPackage.price + "**. The current price and availability must be reconfirmed with our travel team.";
    }
    if (includesAny(q, ["day", "days", "duration", "night", "nights", "how long"]) && contextPackage.duration) {
      return "The **" + contextPackage.name + "** is **" + contextPackage.duration + "**. It starts and ends in Delhi. Please confirm the latest batch with our travel team.";
    }
    if (includesAny(q, ["include", "inclusions", "included"]) && contextPackage.inclusions?.length) {
      return "**Inclusions for " + contextPackage.name + ":**\n" + contextPackage.inclusions.map((value) => "- " + value).join("\n") + "\nPlease reconfirm current inclusions before booking.";
    }
    if (includesAny(q, ["exclude", "exclusions", "not included"]) && contextPackage.exclusions?.length) {
      return "**Exclusions for " + contextPackage.name + ":**\n" + contextPackage.exclusions.map((value) => "- " + value).join("\n");
    }
  }

  const packageIntent = includesAny(q, [
    "package", "tour", "trip", "itinerary", "price", "cost", "rate", "per person",
    "inclusion", "inclusions", "exclusion", "exclusions", "hotel", "stay", "departure",
    "batch", "days", "nights", "booking", "destination", "places to visit"
  ]);

  if (matchedPackage && matchedPackage.score >= 1) {
    const pkg = matchedPackage.pkg;
    const durationQuestion = includesAny(q, ["how many days", "how long", "duration", "how many nights", "days is", "days trip", "trip how many days", "nights"]);
    if (durationQuestion && pkg.duration) {
      return `The ${pkg.name} is a **${pkg.duration}** trip. It starts and ends in Delhi. Please confirm the latest batch availability with our travel team.`;
    }
    const lines = [`**${pkg.name}**`];
    if (pkg.destination) lines.push(`Destination: ${pkg.destination}`);
    if (pkg.duration) lines.push(`Duration: ${pkg.duration}`);
    if (pkg.price) lines.push(`Package price: ${pkg.price}`);
    if (pkg.departures?.length) lines.push(`Departure dates: ${pkg.departures.join(", ")}`);
    if (includesAny(q, ["include", "inclusion", "inclusions", "included", "package include"]) && pkg.inclusions?.length) {
      lines.push("**Inclusions**", ...pkg.inclusions.map((value) => "- " + value));
    } else if (includesAny(q, ["exclude", "exclusion", "exclusions", "not included"]) && pkg.exclusions?.length) {
      lines.push("**Exclusions**", ...pkg.exclusions.map((value) => "- " + value));
    } else if (includesAny(q, ["itinerary", "day wise", "day by day", "schedule"]) && pkg.itinerary?.length) {
      lines.push("**Itinerary**", ...pkg.itinerary.map((value, i) => `${i + 1}. ${value}`));
    } else {
      if (pkg.inclusions?.length) lines.push("**Inclusions**", ...pkg.inclusions.map((value) => "- " + value));
      if (pkg.exclusions?.length) lines.push("**Exclusions**", ...pkg.exclusions.map((value) => "- " + value));
      if (pkg.notes) lines.push(pkg.notes);
    }
    lines.push("For any detail not listed here, our travel team will confirm it for you.");
    return lines.join("\n");
  }

  const faq = [...data.faqs]
    .map((item) => {
      const terms = [item.question, ...(item.keywords || [])].flatMap(words);
      const overlap = new Set(tokens.filter((token) => terms.includes(token))).size;
      return { item, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)[0];
  if (faq && faq.overlap >= 2) return faq.item.answer;

  if (packageIntent) {
    const available = data.packages.map((pkg) => pkg.name);
    if (available.length) {
      return "I can help with package details from our approved travel information. Which package are you asking about?\n\n" +
        available.map((name) => "- " + name).join("\n") +
        "\n\nIf your question is about a detail not listed, I’ll confirm with our travel team. A travel expert will let you know, sir.";
    }
    return "I can help with package prices, itineraries, inclusions, exclusions, and departure details once they are added to our approved package information. For this specific question, I’ll confirm with our travel team. A travel expert will let you know, sir.";
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
  const latest = [...payload.messages].reverse().find(
    (item): item is { role: string; content: string } =>
      !!item && typeof item === "object" &&
      (item as { role?: unknown }).role === "user" &&
      typeof (item as { content?: unknown }).content === "string"
  );
  if (!latest || latest.content.trim().length === 0) {
    return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  }
  if (latest.content.length > 4000) return NextResponse.json({ error: "Your message is too long." }, { status: 413 });

  const previousContext = payload.messages
    .filter((item): item is { role: string; content: string } =>
      !!item && typeof item === "object" &&
      typeof (item as { role?: unknown }).role === "string" &&
      typeof (item as { content?: unknown }).content === "string" &&
      item !== latest
    )
    .map((item) => item.content)
    .join(" ");
  const answer = answerQuestion(latest.content, previousContext);
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
