export type ConversationStage =
  | "greeting"
  | "discovery"
  | "qualification"
  | "recommendation"
  | "objection"
  | "closing"
  | "follow_up"
  | "completed";

export type ConversationState = {
  stage: ConversationStage;
  language: "Telugu" | "Tenglish" | "English";
  destination?: string;
  travelDate?: string;
  travellers?: number;
  budget?: number;
  intent: "unknown" | "low" | "medium" | "high";
  objections: string[];
  nextAction?: string;
};

const destinationKeywords: Record<string, string[]> = {
  "Char Dham Yatra": ["char dham", "chardham", "char dham yatra"],
  Kedarnath: ["kedarnath", "kedar"],
  Badrinath: ["badrinath"],
  "Vaishno Devi": ["vaishno devi", "vaishnodevi"],
  Amarnath: ["amarnath"],
  Kashmir: ["kashmir", "srinagar"],
  "Manali & Kasol": ["manali", "kasol"],
  Ladakh: ["ladakh", "leh"],
  Kerala: ["kerala", "munnar", "alleppey"],
  Thailand: ["thailand", "bangkok", "pattaya"],
  "Puri Jagannath": ["puri", "jagannath"],
};

export function detectDestination(text: string): string | undefined {
  const normalized = text.toLowerCase();
  return Object.entries(destinationKeywords).find(([, words]) =>
    words.some((word) => normalized.includes(word)),
  )?.[0];
}

export function detectLanguage(text: string): ConversationState["language"] {
  const teluguSignals = ["నమస్కారం", "కావాలి", "ఎంత", "తెలుగు", "యాత్ర"];
  if (teluguSignals.some((word) => text.includes(word))) return "Telugu";

  const tenglishSignals = ["entha", "kavali", "meeru", "maku", "trip", "package"];
  const latinWords = text.toLowerCase().split(/\s+/);
  if (tenglishSignals.some((word) => latinWords.includes(word))) return "Tenglish";

  return "English";
}

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
  "ఒకరు": 1, "ఒక్కరు": 1, "ఇద్దరు": 2, "ముగ్గురు": 3, "నలుగురు": 4,
  "ఐదుగురు": 5, "ఆరుగురు": 6, "ఏడుగురు": 7, "ఎనిమిది మంది": 8,
  "తొమ్మిది మంది": 9, "పది మంది": 10,
};

function parseTravellerCount(text: string, expectingCount: boolean): number | undefined {
  const explicit = text.match(/\b(\d{1,2})\s*(?:people|persons|members|travellers|travelers|pax)\b/i);
  if (explicit) return Number(explicit[1]);
  const familyCount = text.match(/\b(\d{1,2})\s+adults?\b(?:\s+and\s+(\d{1,2})\s+(?:children?|kids?))?/i);
  if (familyCount) return Number(familyCount[1]) + Number(familyCount[2] ?? 0);
  if (!expectingCount) return undefined;

  const response = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  const numeric = response.match(/^(?:(?:we are|we're|there are|just|only)\s+)?(\d{1,2})(?:\s+(?:people|persons|members|travellers|travelers|pax|adults?|of us))?$/i);
  if (numeric) return Number(numeric[1]);
  const word = response.match(/^(?:(?:we are|we're|there are|just|only)\s+)?(a couple|couple|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|ఒకరు|ఒక్కరు|ఇద్దరు|ముగ్గురు|నలుగురు|ఐదుగురు|ఆరుగురు|ఏడుగురు|ఎనిమిది మంది|తొమ్మిది మంది|పది మంది)(?:\s+(?:people|persons|members|travellers|travelers|pax|adults?|of us))?$/i);
  if (!word) return undefined;
  return word[1] === "a couple" || word[1] === "couple" ? 2 : numberWords[word[1]];
}

function parseBudgetAmount(text: string, expectingBudget: boolean): number | undefined {
  const normalized = text.toLowerCase().replace(/,/g, "");
  const explicit = normalized.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crore|cr)?|\b(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crore|cr)\b/i);
  const bare = expectingBudget ? normalized.match(/^(?:around\s+|about\s+|approximately\s+)?(?:₹|rs\.?|inr\s*)?(\d+(?:\.\d+)?)\s*$/i) : null;
  const amount = explicit?.[1] ?? explicit?.[3] ?? bare?.[1];
  if (!amount) return undefined;
  const suffix = (explicit?.[2] ?? explicit?.[4] ?? "").toLowerCase();
  const multiplier = suffix === "k" || suffix === "thousand" ? 1_000
    : ["lakh", "lakhs", "lac", "lacs"].includes(suffix) ? 100_000
    : suffix === "crore" || suffix === "cr" ? 10_000_000
    : 1;
  return Math.round(Number(amount) * multiplier);
}

export function extractConversationState(text: string, previous?: ConversationState): ConversationState {
  const prior = previous && typeof previous === "object" && !Array.isArray(previous) ? previous : undefined;
  const state: ConversationState = prior
    ? { ...prior, objections: Array.isArray(prior.objections) ? prior.objections.filter((item): item is string => typeof item === "string") : [] }
    : { stage: "discovery", language: detectLanguage(text), intent: "unknown", objections: [] };

  const destination = detectDestination(text);
  if (destination) state.destination = destination;

  // Preserve the customer's date wording; the app only needs to know a date was supplied.
  const travelDate = text.match(
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b|\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{4})?\b|\b(?:next|this)\s+(?:month|week)\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i,
  );
  if (travelDate) state.travelDate = travelDate[0];

  const expectingCount = /how many people/i.test(prior?.nextAction ?? "");
  const travellers = parseTravellerCount(text, expectingCount);
  if (travellers !== undefined) state.travellers = travellers;

  const expectingBudget = /approximate budget|budget per person/i.test(prior?.nextAction ?? "");
  const budget = parseBudgetAmount(text, expectingBudget);
  if (budget !== undefined) state.budget = budget;

  if (/very interested|book|confirm|ready|advance|pay/i.test(text)) state.intent = "high";
  else if (/interested|planning|looking|package|price/i.test(text)) state.intent = "medium";
  else if (/just checking|maybe|not sure/i.test(text)) state.intent = "low";

  if (/expensive|high price|too much|budget issue/i.test(text)) state.objections.push("price");
  if (/family|wife|husband|parents|children|need to ask/i.test(text)) state.objections.push("decision_maker");
  if (/later|call later|busy|tomorrow/i.test(text)) state.objections.push("timing");

  if (state.destination && state.travelDate && state.travellers) state.stage = "recommendation";
  else if (state.destination || state.travelDate || state.travellers) state.stage = "qualification";
  else state.stage = "discovery";

  return state;
}

export function nextQuestion(state: ConversationState): string {
  if (!state.destination) return "Which destination are you planning to travel to?";
  if (!state.travelDate) return "When are you planning to travel?";
  if (!state.travellers) return "How many people will be travelling?";
  if (!state.budget) return "Do you have an approximate budget per person?";
  return "Would you like me to arrange the next step with our travel team?";
}
