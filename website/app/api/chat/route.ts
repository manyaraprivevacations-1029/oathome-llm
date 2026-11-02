import { NextRequest, NextResponse } from "next/server";
import knowledge from "../../../data/travel-knowledge.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PackageRecord = {
  name: string; destination?: string; duration?: string; price?: string; departures?: string[];
  inclusions?: string[]; exclusions?: string[]; itinerary?: string[];
  thingsToCarry?: string[]; notes?: string; doubleSharing?: string; childPricing?: { under5?: string; age5to11?: string; age11plus?: string };
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
  // Damerau-Levenshtein-style adjacent transposition support handles common
  // typing slips such as "shmila" for "shimla", not just insertions/deletions.
  let previousPrevious: number[] | undefined;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && previousPrevious &&
          a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j], previousPrevious[j - 2] + 1);
      }
    }
    previousPrevious = previous;
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
    // Fuzzy-match only explicit destination aliases, never generic words from
    // long package titles (e.g. "nights", "Delhi", or unrelated prose).
    const aliases = (p as PackageRecord & { aliases?: string[] }).aliases || [];
    const words = aliases.map(normalize).flatMap((n) => n.split(" "))
      .filter((word) => word.length >= 5);
    return tokens.some((token) => token.length >= 5 && words.some((word) => {
      if (Math.abs(word.length - token.length) > 1) return false;
      // Permit a single typo only; general questions should not trigger a trip.
      return editDistance(token, word) <= 1;
    }));
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
    return "**" + selectedPackage.name + "**\nDuration: " + (selectedPackage.duration || "Please confirm duration") + "\nPrice: " + (selectedPackage.price || "Please confirm current price") + "\n\nWhen are you planning to travel?";
  }

  // Identify the assistant when customers ask who they are talking to.
  if (/^(who|who are you|who r u|your name|what is your name|mee peru enti|evaru nuvvu|nuvvu evaru|meeru evaru)$/.test(q)) {
    return "Nenu Radhika andi 😊 On A Trip Holidays travel team nunchi. Mee trip plan cheyyadaniki help chesthanu. Ye destination gurinchi telusukovali?";
  }

  // Handle explicit rejection in context. Never repeat the same sales prompt after "no".
  const isNo = /^(no|nope|nah|not really|don't|dont| వద్దు|ledu|ledhu|kaadu|kadhu|oddu|vaddu|not now|no thanks|no thank you)$/.test(q);
  if (isNo) {
    if (prevA.includes("itinerary") || prevA.includes("inclusions") || prevA.includes("departure") || prevA.includes("dates")) {
      return "Parledhu andi 😊 Mee preference prakaram vere detail chepthanu. Price, itinerary, inclusions, booking process, leka vere destination gurinchi adagandi.";
    }
    if (prevA.includes("destination") || prevA.includes("trip plan")) {
      return "No problem andi. Inka destination decide cheyyakapoyina parledhu. Mee budget, travel month, leka trip type chepthe suitable options suggest chesthanu.";
    }
    return "Okay andi, no problem 😊 Meeku vere emaina telusukovala? Package details, price, itinerary, booking process, leka vere question adagandi.";
  }

  // A hesitation like "hm" should invite the customer to continue, not repeat the previous package pitch.
  if (/^(hm|hmm|hmmm|umm|um|acha|accha)$/.test(q)) {
    if (pkg) return "Take your time andi 😊 " + pkg.name + " gurinchi edaina doubt unte adagandi. Price, itinerary, inclusions, stay, transport, or booking process explain chesthanu.";
    return "Cheppandi andi 😊 Em doubt undi? Mee question ki answer chesthanu, lekapothe suitable trip options suggest chesthanu.";
  }

  // Handle short confirmations in context instead of sending "yes"/"ok" to the fallback.
  const isYes = /^(yes|yeah|yep|ok|okay|sure|ha|haa|avunu|sare|alright|fine|cheppu|cheppandi)$/.test(q);
  if (isYes && pkg && (prevA.includes("would you like the itinerary or package inclusions") || prevA.includes("itinerary or package inclusions"))) {
    if (pkg.itinerary?.length) {
      const overview = pkg.itinerary.slice(0, 3).join("\n");
      return "Sure andi! " + pkg.name + " itinerary overview:\n" + overview + "\n\nFull day-wise itinerary or inclusions kuda chepthanu. Edi kavali?";
    }
    const items = (pkg.inclusions || []).slice(0, 5);
    return items.length
      ? "Sure andi! " + pkg.name + " lo main inclusions: " + items.join("; ") + ". Full itinerary kuda cheppana?"
      : "Sure andi! " + pkg.name + " details kosam itinerary, inclusions, price, leka departure dates lo edi first kavalo cheppandi.";
  }
  if (isYes && pkg && (prevA.includes("confirm") || prevA.includes("departure") || prevA.includes("batch"))) {
    return "Okay andi! " + pkg.name + " departure dates ippudu approved data lo confirm kaaledu. Wrong date cheppakunda travel team confirmation tarvatha share cheyyali. Inthalo itinerary or inclusions kavala?";
  }
  // Keep Radhika's qualification flow conversational: ask one detail at a time.
  const dateReply = /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)(?:\s+20\d{2})?|(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*20\d{2})?|20\d{2}-\d{2}-\d{2}|this weekend|next weekend|next month|this month|in\s+\d+\s+weeks?)\b/i.test(q);
  const countReply = /^\d{1,2}(?:\s*(?:adults?|children?|kids?|members?|people|persons?|pax))?(?:\s*(?:and|,|\+)\s*\d{1,2}\s*(?:children?|kids?|adults?))?$/.test(q) ||
    includesAny(q, ["members", "people", "persons", "travellers", "travelers", "pax", "couple", "family", "only me", "just me"]);
  const cityReply = ["hyderabad", "vijayawada", "visakhapatnam", "vizag", "bangalore", "bengaluru", "chennai", "mumbai", "pune", "delhi", "kolkata", "tirupati", "warangal", "guntur", "rajahmundry", "nellore", "kurnool", "anantapur"].some((city) => q.includes(city));

  if (pkg && dateReply && (prevA.includes("when are you planning to travel") || prevA.includes("travel date"))) {
    return "Thanks andi! " + pkg.name + " kosam note chesanu. Mee trip lo entha mandi travel chestharu?";
  }
  if (pkg && countReply && (prevA.includes("how many people") || prevA.includes("entha mandi") || prevA.includes("number of travellers"))) {
    return "Okay andi! Mee group size note chesanu. Meeru ye city nunchi start avutharu?";
  }
  if (pkg && cityReply && (prevA.includes("which city") || prevA.includes("ye city") || prevA.includes("start avutharu"))) {
    return "Thank you andi! " + pkg.name + " details share chesthanu. Ee package starting point: " +
      (/delhi to delhi|from delhi|ex delhi/i.test(pkg.duration || "") || /delhi/i.test(pkg.name) ? "Delhi" :
       /hubli to hubli/i.test(pkg.duration || "") || /hubli to hubli/i.test(pkg.name) ? "Hubli" : "travel team confirmation needed") +
      ". Mee travel plan ki itinerary kavala, leka inclusions and exclusions first cheppana?";
  }

  if (/^(ok|okay|alright|fine|sare|thanks|thank you|thankyou|got it|understood|hmm|hmmm)$/.test(q)) {
    if (prevA.includes("which destination") || prevA.includes("ye destination") || prevA.includes("what trip plan")) {
      return "Sure andi! Meeru ye place ki vellali anukuntunnaru — Manali, Kashmir, Kerala, Char Dham, leka vere destination aa?";
    }
    if (prevA.includes("domestic or international")) {
      return "Okay andi! Domestic trips ante India lopala, international ante abroad. Mee preference edi?";
    }
    return pkg
      ? "Sure andi! " + pkg.name + " gurinchi continue cheddam. Itinerary, inclusions, price, leka departure dates — first edi cheppali?"
      : "Sure andi! Mee trip gurinchi help chestha. Destination cheppandi, lekapothe package price, itinerary, inclusions gurinchi direct ga adagachu.";
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
    const defaultItems = /char dham|kedarnath|badrinath/i.test(pkg?.name || "")
      ? "ID proof, medicines, trekking shoes, warm clothes, raincoat, charger and water bottle"
      : "valid ID, comfortable clothes and shoes, personal medicines, charger and weather-appropriate essentials";
    return (pkg ? pkg.name + " trip ki" : "Ee trip ki") + " ivvi carry cheyyandi andi: " + (items.length ? items.join(", ") : defaultItems) + ".";
  }
  if (includesAny(q, ["package price and gst total", "price with gst", "including gst", "total with gst", "gst total", "gst kalipi", "gst tho kalipi", "gst tho total", "gst add cheste", "gst add chesthe", "gst entha total", "package price gst", "gst kalipi entha", "total amount"]) ||
      (includesAny(q, ["antey yentha", "ante entha", "total entha", "how much then"]) && (prevA.includes("gst") || prevA.includes("price")))) {
    const priceMatch = (pkg?.price || "").match(/₹\s*([\d,]+)/);
    if (pkg && priceMatch && /5%\s*GST/i.test(pkg.price || "")) {
      const base = Number(priceMatch[1].replace(/,/g, ""));
      const gst = Math.round(base * 0.05);
      return pkg.name + " price " + pkg.price + ". GST approx ₹" + gst.toLocaleString("en-IN") + "; total approx ₹" + (base + gst).toLocaleString("en-IN") + " per person andi.";
    }
    return pkg ? pkg.name + " price details: " + (pkg.price || "travel team tho confirm cheyyali") + ". Final GST-inclusive total travel team tho confirm chesi cheptham andi." : fallback;
  }
  if (includesAny(q, ["gst", "tax extra", "is tax compulsory", "tax compulsory", "gst compulsory", "gst included", "without gst"])) {
    const priceMatch = (pkg?.price || "").match(/₹\s*([\d,]+)/);
    if (pkg && priceMatch && /5%\s*GST/i.test(pkg.price || "")) {
      const base = Number(priceMatch[1].replace(/,/g, ""));
      return "Avunu andi, " + pkg.name + " price " + pkg.price + ". 5% GST approx ₹" + Math.round(base * 0.05).toLocaleString("en-IN") + " extra per person.";
    }
    return pkg ? pkg.name + " price details: " + (pkg.price || "travel team tho confirm cheyyali") + ". GST treatment confirm chesi cheptham andi." : fallback;
  }
  if (includesAny(q, ["below 5", "under 5", "under five", "below five", "below 5 years", "under 5 years", "child below 5", "child under 5", "less than 5"])) {
    return pkg?.childPricing?.under5
      ? "Ee package lo 5 years kanna takkuva kids pricing: " + pkg.childPricing.under5 + " andi."
      : "Ee package ki under-5 child pricing approved data lo clear ga ledu andi. Travel team tho confirm cheyinchi chepthanu.";
  }
  if (includesAny(q, ["5 to 11", "5-11", "age 5", "age 6", "age 7", "age 8", "age 9", "age 10", "age 11", "8 year", "8 years", "child price", "child cost", "kid price", "kids price"])) {
    return pkg?.childPricing?.age5to11
      ? "Ee package lo 5–11 years child price: " + pkg.childPricing.age5to11 + " andi."
      : "Ee package ki child pricing approved data lo clear ga ledu andi. Travel team tho confirm cheyinchi chepthanu.";
  }
  if (includesAny(q, ["11 above", "above 11", "over 11", "12 year", "12 years", "age 12"])) {
    return pkg?.childPricing?.age11plus
      ? "Ee package lo 11 years paina: " + pkg.childPricing.age11plus + " andi."
      : "Ee package ki 11+ age pricing approved data lo clear ga ledu andi. Travel team tho confirm cheyinchi chepthanu.";
  }
  if (includesAny(q, ["2 sharing", "two sharing", "double sharing", "couple room", "separate room", "private room", "twin sharing"])) {
    const detail = (pkg as PackageRecord & { doubleSharing?: string } | undefined)?.doubleSharing;
    const evidence = [...(pkg?.inclusions || []), ...(pkg?.exclusions || [])].filter((item) => /sharing|private room|double occupancy|room upgrade/i.test(item));
    return detail || (evidence.length ? "Ee package room options: " + evidence.slice(0, 3).join("; ") : "Ee package ki double-sharing/private-room charges approved data lo clear ga levu andi. Travel team tho confirm cheyinchi chepthanu.");
  }
  if (includesAny(q, ["room sharing", "sharing room", "room type", "triple sharing", "four sharing", "3 sharing", "4 sharing", "group sharing", "accommodation", "room basis"])) {
    const evidence = [...(pkg?.inclusions || []), ...(pkg?.exclusions || [])].filter((item) => /sharing|room|accommodation|camp|hotel/i.test(item));
    return evidence.length ? "Ee package accommodation details: " + evidence.slice(0, 5).join("; ") : "Ee package room-sharing details approved data lo clear ga levu andi. Travel team tho confirm cheyinchi chepthanu.";
  }
  if (includesAny(q, ["breakfast", "dinner", "lunch", "food", "meals", "vegetarian", "veg food"])) {
    const meals = (pkg?.inclusions || []).filter((item) => /breakfast|dinner|lunch|meal|food/i.test(item));
    if (!meals.length) return "Ee package meals details approved data lo clear ga levu andi. Travel team tho confirm cheyinchi chepthanu.";
    if (includesAny(q, ["lunch"]) && !meals.some((item) => /lunch/i.test(item))) return "Approved package details lo lunch inclusion mention kaaledu andi. Booking mundu travel team tho confirm cheyyandi.";
    return "Ee package meal details: " + meals.slice(0, 5).join("; ") + ".";
  }
  if (includesAny(q, ["which vehicle", "what vehicle", "vehicle type", "which bus", "bus type", "tempo traveller", "transport included", "transport"])) {
    const transport = (pkg?.inclusions || []).filter((item) => /transport|vehicle|transfer|bus|coach|pickup|drop|AC/i.test(item));
    return transport.length ? "Ee package transport details: " + transport.slice(0, 5).join("; ") + "." : "Ee package transport/vehicle details approved data lo clear ga levu andi. Travel team tho confirm cheyinchi chepthanu.";
  }
  if (includesAny(q, ["pickup point", "where pickup", "pickup from", "starting city", "from hyderabad", "from bangalore", "from vijayawada", "from vizag", "where does the trip start", "start and end", "delhi to delhi"])) {
    const first = pkg?.itinerary?.[0];
    const last = pkg?.itinerary?.[pkg.itinerary.length - 1];
    return first && last ? "Ee package start details: " + first + "\nReturn details: " + last : "Ee package pickup and drop point approved data lo clear ga levu andi. Travel team tho confirm cheyinchi chepthanu.";
  }
  if (includesAny(q, ["senior citizen", "old age", "elderly", "parents can travel", "can old people"])) {
    const notes = pkg?.notes || "";
    const trekEvidence = [...(pkg?.itinerary || []), notes].filter((item) => /trek|high altitude|walking|stairs/i.test(item));
    return trekEvidence.length ? "Ee package lo physical activity gurinchi note: " + trekEvidence.slice(0, 2).join(" ") + " Senior citizens doctor advice teesukoni, fitness batti plan cheyyandi." : "Senior citizens travel suitability ee package data lo specifically confirm kaaledu andi. Health/fitness and route details travel team tho discuss chesi doctor advice tho plan cheyyandi.";
  }
  if (includesAny(q, ["booking advance", "advance amount", "how much advance", "booking amount", "how to book", "book this package", "booking process", "reserve this"])) {
    return "Booking interest ki thanks andi! Mee travel dates, travellers count share cheyyandi. Dates, seats, advance amount and payment schedule ni travel team confirm chesi booking steps share chestharu.";
  }
  if (includesAny(q, ["cancellation policy", "cancel booking", "refund", "money back", "cancellation charges"])) {
    const cancellation = data.faqs.find((item) => /cancel|refund/i.test(item.question + " " + item.answer));
    return cancellation?.answer || "Cancellation/refund terms package batti maruthayi andi. Mee package booking terms travel team tho confirm chesi chepthanu.";
  }
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
  if (includesAny(q, ["exclusions", "what is excluded", "not included", "exclude"])) {
    const items = (pkg?.exclusions || []).slice(0, 8);
    return items.length ? "Ee package exclusions: " + items.join("; ") + "." : "Ee package exclusions approved data lo clear ga levu andi. Travel team tho confirm cheyinchi chepthanu.";
  }

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
    // The local gateway is protected; use the same private bearer token as the
    // runtime diagnostics and inference requests.
    const upstreamToken = process.env.OATHOME_LLM_UPSTREAM_TOKEN?.trim();
    const headers: Record<string, string> = {};
    if (upstreamToken) headers.Authorization = `Bearer ${upstreamToken}`;
    const response = await fetch(`${configuredUrl}/api/tags`, {
      headers, cache: "no-store", signal: AbortSignal.timeout(8000)
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
