export const runtime = "nodejs";

import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { listDatabaseKnowledge } from "@/lib/ai-bot/database-store";
import { knowledgeItems } from "@/lib/ai-bot/knowledge";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SARVAM_BASE_URL = "https://api.sarvam.ai";

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error?.message === "string" ? body.error.message : "Sarvam request failed.");
  }
  return body;
}

async function loadApprovedKnowledge(): Promise<string> {
  const bundledCharDham = knowledgeItems.find((item) => item.id === "kb-char-dham" && item.status === "approved");
  const bundledText = bundledCharDham
    ? `[${bundledCharDham.category}] ${bundledCharDham.title}: ${bundledCharDham.content}`
    : "";
  const fallback = bundledText || "No approved travel knowledge is available. Do not invent package details, prices, or availability.";

  if (!isSupabaseConfigured() || !getSupabaseWorkspaceId()) {
    return `${fallback}\nLive seat inventory and current offer validity are not connected.`.slice(0, 18000);
  }

  try {
    const items = await listDatabaseKnowledge();
    const approved = items
      .filter((item) => item.status === "approved" && !/char\s*dham/i.test(item.title))
      .slice(0, 19)
      .map((item) => `[${item.category}] ${item.title}: ${String(item.content).slice(0, 1800)}`);
    return [fallback, ...approved, "Live seat inventory and current offer validity are not connected."]
      .filter(Boolean)
      .join("\n")
      .slice(0, 18000);
  } catch {
    return `${fallback}\nThe live workspace knowledge service is temporarily unavailable. Live seat inventory is not connected.`.slice(0, 18000);
  }
}


const SMALL_NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS_NUMBER_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberToEnglishWords(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 999_999_999) return String(value);
  if (value < 20) return SMALL_NUMBER_WORDS[value];
  if (value < 100) {
    const tens = TENS_NUMBER_WORDS[Math.floor(value / 10)];
    const ones = value % 10;
    return ones ? `${tens}-${SMALL_NUMBER_WORDS[ones]}` : tens;
  }
  if (value < 1000) {
    const hundreds = `${SMALL_NUMBER_WORDS[Math.floor(value / 100)]} hundred`;
    const remainder = value % 100;
    return remainder ? `${hundreds} and ${numberToEnglishWords(remainder)}` : hundreds;
  }
  const scale = value >= 1_000_000 ? 1_000_000 : 1_000;
  const scaleName = scale === 1_000_000 ? "million" : "thousand";
  const leading = Math.floor(value / scale);
  const remainder = value % scale;
  return remainder
    ? `${numberToEnglishWords(leading)} ${scaleName} ${remainder < 100 ? "and " : ""}${numberToEnglishWords(remainder)}`
    : `${numberToEnglishWords(leading)} ${scaleName}`;
}

function numberTokenToEnglish(token: string): string {
  const normalized = token.replace(/,/g, "");
  if (normalized.includes(".")) {
    const [whole, fraction] = normalized.split(".");
    return `${numberToEnglishWords(Number(whole))} point ${fraction.split("").map((digit) => SMALL_NUMBER_WORDS[Number(digit)]).join(" ")}`;
  }
  return numberToEnglishWords(Number(normalized));
}

function prepareSpeechText(text: string): string {
  return text
    .replace(/\(([^()]*)\)/g, "$1")
    .replace(/\b([\d,]+)\s*km\s*\/\s*([\d,]+)\s*hours?\b/gi, "$1 kilometers, about $2 hours")
    .replace(/\b([\d,]+)\s*nights?\s*\/\s*([\d,]+)\s*days?\b/gi, "$1 nights and $2 days")
    .replace(/\s*\/\s*/g, " or ")
    .replace(/₹\s*([\d,]+(?:\.\d+)?)/g, (_match, amount: string) => `${numberTokenToEnglish(amount)} rupees`)
    .replace(/\b([\d,]+(?:\.\d+)?)\s*%/g, (_match, amount: string) => `${numberTokenToEnglish(amount)} percent`)
    .replace(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi, (_match, hour: string, minute: string, meridiem: string) => {
      const hourWords = numberTokenToEnglish(hour);
      const minuteWords = Number(minute) === 0 ? "" : ` ${numberTokenToEnglish(minute)}`;
      return `${hourWords}${minuteWords} ${meridiem}`;
    })
    .replace(/\b\d[\d,]*(?:\.\d+)?\b/g, (token) => numberTokenToEnglish(token))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestion(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function avoidRepeatedQuestion(reply: string, history: ChatMessage[]): string {
  const normalizedReply = normalizeQuestion(reply);
  const previouslyAsked = history
    .filter((message) => message.role === "assistant" && message.content.includes("?"))
    .map((message) => normalizeQuestion(message.content))
    .filter(Boolean);

  // Avoid repeating an assistant question verbatim even if the model ignores the conversation instructions.
  if (previouslyAsked.some((question) => normalizedReply.includes(question))) {
    return "Thanks, I’ve noted what you shared. I’ll use the details already in our conversation.";
  }
  return reply;
}

function getUpcomingCharDhamBatchDates(): string[] {
  const packageInfo = knowledgeItems.find((item) => item.id === "kb-char-dham" && item.status === "approved");
  const content = packageInfo?.content ?? "";
  const headingIndex = content.toLowerCase().indexOf("brochure departure dates from delhi");
  if (headingIndex < 0) return [];

  const nextSectionIndex = content.indexOf("These are dates printed", headingIndex);
  const sectionText = content.slice(headingIndex, nextSectionIndex < 0 ? undefined : nextSectionIndex);
  const yearMatch = sectionText.match(/(\d{4})/);
  if (!yearMatch) return [];
  const year = Number(yearMatch[1]);

  const todayParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayKey = Number(
    (todayParts.find((part) => part.type === "year")?.value ?? "0") +
    (todayParts.find((part) => part.type === "month")?.value ?? "0") +
    (todayParts.find((part) => part.type === "day")?.value ?? "0"),
  );

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const groupedDates = new Map<string, number[]>();
  const dateRows = sectionText.matchAll(/^\s*(January|February|March|April|May|June|July|August|September|October|November|December):\s*([\d, ]+)\.?\s*$/gim);
  for (const row of dateRows) {
    const monthName = row[1][0].toUpperCase() + row[1].slice(1).toLowerCase();
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex < 0) continue;

    for (const dayText of row[2].match(/\d{1,2}/g) ?? []) {
      const day = Number(dayText);
      const dateKey = year * 10000 + (monthIndex + 1) * 100 + day;
      if (dateKey <= todayKey) continue;
      const days = groupedDates.get(monthName) ?? [];
      days.push(day);
      groupedDates.set(monthName, days);
    }
  }

  return [...groupedDates].map(([monthName, days]) => monthName + " " + days.join(", ") + ", " + year);
}

export async function POST(request: Request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Sarvam is not configured. Add SARVAM_API_KEY to the server environment." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: "Record a short message first." }, { status: 400 });
    }
    if (audio.size > 20 * 1024 * 1024) {
      return Response.json({ error: "The recording is too large. Please record a shorter message." }, { status: 413 });
    }

    // MediaRecorder may include codec parameters (for example, audio/webm;codecs=opus)
    // that Sarvam rejects even though it accepts the underlying WebM audio container.
    const mimeType = audio.type.split(";")[0]?.trim().toLowerCase() || "audio/webm";
    const upload = new File([audio], audio.name || "customer.webm", { type: mimeType });
    const speechForm = new FormData();
    speechForm.append("file", upload, upload.name);
    speechForm.append("model", process.env.SARVAM_STT_MODEL || "saaras:v4");
    const sttResponse = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: speechForm,
      cache: "no-store",
    });
    const stt = await readJson(sttResponse);
    const transcript = typeof stt.transcript === "string" ? stt.transcript.trim() : "";
    const isTeluguInput = String(stt.language_code || "").toLowerCase().startsWith("te") || /[\u0C00-\u0C7F]/u.test(transcript);
    if (!transcript) {
      return Response.json({ error: "I couldn't make out the recording. Please try again in a quieter place." }, { status: 422 });
    }

    let history: ChatMessage[] = [];
    const historyRaw = form.get("history");
    if (typeof historyRaw === "string") {
      try {
        const parsed: unknown = JSON.parse(historyRaw);
        if (Array.isArray(parsed)) {
          history = parsed
            .filter((item): item is ChatMessage =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
            )
            .slice(-12)
            .map((item) => ({ role: item.role, content: item.content.slice(0, 1200) }));
        }
      } catch {
        // Ignore malformed optional history and start a fresh conversation.
      }
    }

    const conversationContext = [transcript, ...history.map((message) => message.content)].join(" ");
    const hasItineraryIntent = /\bitiner[a-z]*|itinary|itinery|day[\s-]*(?:by[\s-]*day|wise|fine)|all[\s-]*days|full[\s-]*(?:trip|tour|itinerary)|(?:trip|tour).{0,15}(?:full|total|complete)|(?:full|complete|total).{0,15}(?:trip|tour)|ఇటిన|రోజు.{0,4}వారీ|రోజువారీ|ప్రతి రోజు|రోజు రోజు|డే.{0,5}(?:వైజ్|ఫైన్)|ట్రిప్\s*మొత్తం|మొత్తం\s*ట్రిప్/i.test(conversationContext);
    const isCharDhamQuestion =
      /char[\s-]*dham|chardham|చార్\s*ధామ్|Kedarnath|Badrinath|Yamunotri|Gangotri|Lakhamandal|Sonprayag|Gaurikund/i.test(conversationContext) ||
      (/\bchart\b/i.test(conversationContext) && hasItineraryIntent);
    const customerAgreesToBook = /\b(?:yes|yeah|yep|okay|ok|sure|go ahead|proceed|please do|book it|i want to book|i would like to book|let us book|reserve it|confirm the booking)\b|అవును|సరే|తప్పకుండా|బుక్ చేయండి|బుకింగ్ చేయండి|బుక్ చేద్దాం/i.test(transcript);
    const explicitBookingIntent = /\b(?:book|booking|reserve|reservation)\b|బుక్|బుకింగ్|రిజర్వ్/i.test(transcript);
    const previousBookingPrompt = history.some((message) => message.role === "assistant" && /\b(?:book|booking|reserve|reservation)\b|బుక్|బుకింగ్|రిజర్వ్/i.test(message.content));
    const isBookingCommitment = customerAgreesToBook && (explicitBookingIntent || previousBookingPrompt);
    const isPriceQuestion = /price|cost|fare|rate|how[\s-]*much|amount|rupees|rs\.?|₹|ధర|ప్రైస్|ఎంత|entha|enta/i.test(transcript);
    const isCharDhamPriceQuestion = isCharDhamQuestion && isPriceQuestion;
    const isTotalWithGstQuestion =
      isCharDhamQuestion &&
      /total|including|included|incl\.?|with\s*gst|gst.*(?:kalipi|including|tho|to)|(?:kalipi|including|tho).*gst|tax[\s-]*included|మొత్తం|కలిపి|జీఎస్టీతో|జిఎస్టీతో/i.test(transcript);
    const isBookingAmountQuestion =
      isCharDhamQuestion &&
      /booking[\s-]*(?:amount|advance|fee|deposit)|advance|deposit|token[\s-]*(?:amount|money)|బుకింగ్.*(?:అడ్వాన్స్|మొత్తం)|అడ్వాన్స్/i.test(transcript);
    const isUpcomingBatchQuestion =
      isCharDhamQuestion &&
      /upcoming|next[\s-]*(?:batch|departure|trip)|batch(?:es)?|departure[\s-]*dates?|వచ్చే.*(?:బ్యాచ్|ట్రిప్|తేదీ)|బ్యాచ్|తదుపరి/i.test(transcript);
    const asksOrigin =
      /\b(?:where.*(?:start|begin|from)|(?:start|begin).*where|starting point|from which city|origin|pickup|starts? from)\b|ఎక్కడి నుంచి|ఎక్కడ నుంచి|ఎక్కడి నుండి|ఎక్కడ నుండి|స్టార్ట్ అవుత|ప్రారంభమవుత|మొదలవుత|ekkada nunchi|ekkada nundi|ekkada nunche|start avutundi|start avuthundi/i.test(transcript);
    const isCharDhamOriginQuestion = isCharDhamQuestion && asksOrigin;
    const asksPackageOverview =
      /\b(?:package|tour|trip|details)\b|ప్యాకేజీ|ప్యాకేజ్/i.test(transcript) &&
      !/\b(?:itinerary|day[\s-]*by[\s-]*day|departure|dates?|inclusions?|exclusions?|route|places|covers?)\b/i.test(transcript) &&
      !asksOrigin;
    const isCharDhamPackageOverview = isCharDhamQuestion && asksPackageOverview;
    const isCharDhamShortAnswer = (isCharDhamPriceQuestion && !isTotalWithGstQuestion) || isCharDhamPackageOverview || isCharDhamOriginQuestion;
    const isDetailedItineraryQuestion =
      /\b(?:itiner[a-z]*|itinary|itinery|day[\s-]*(?:by[\s-]*day|wise|fine)|all[\s-]*days|full[\s-]*(?:trip|tour|itinerary)|(?:trip|tour).{0,15}(?:full|total|complete)|(?:full|complete|total).{0,15}(?:trip|tour))\b|ఇటిన|రోజు.{0,4}వారీ|రోజువారీ|ప్రతి రోజు|రోజు రోజు|డే.{0,5}(?:వైజ్|ఫైన్)|ట్రిప్\s*మొత్తం|మొత్తం\s*ట్రిప్/i.test(transcript);
      /\b(?:itiner[a-z]*|itinary|itinery|day[\s-]*by[\s-]*day|day[\s-]*wise|all[\s-]*days|full[\s-]*(?:trip|tour|itinerary))\b|ఇటిన|రోజు.{0,4}వారీ|రోజువారీ|ప్రతి రోజు|రోజు రోజు|డే.{0,4}వైజ్/i.test(transcript);
    let reply: string;

    if (isBookingCommitment) {
      reply = isTeluguInput
        ? "Sir, మీ booking request note చేసుకున్నాను. Travel team తో confirm చేసి update ఇస్తాను."
        : "Sir, I’ve noted your booking request. I’ll confirm it with the travel team and update you.";
    } else if (isDetailedItineraryQuestion) {
      // Use a fixed, concise reply so all 11 days are always returned together.
      const teluguItinerary = [
        "Sir, 11-day itinerary:",
        "Day 1: Delhi నుంచి Haridwar వెళ్లి, Har Ki Pauri వద్ద Ganga Aarti చూస్తారు. Night stay Haridwar.",
        "Day 2: Haridwar నుంచి Lakhamandal వెళ్లి, Shiva Temple దర్శిస్తారు. Night stay Lakhamandal.",
        "Day 3: Lakhamandal నుంచి Janki Chatti వెళ్లి, Yamunotri darshan చేసి తిరిగి Lakhamandal వస్తారు.",
        "Day 4: Lakhamandal నుంచి Uttarkashi వెళ్లి, Kashi Vishwanath Temple దర్శిస్తారు. Night stay Uttarkashi.",
        "Day 5: Uttarkashi నుంచి Gangotri వెళ్లి తిరిగి Uttarkashi వస్తారు.",
        "Day 6: Uttarkashi నుంచి Sonprayag లేదా Sitapur వెళ్తారు. Night stay అక్కడే.",
        "Day 7: Sonprayag లేదా Sitapur నుంచి Gaurikund వెళ్లి, Kedarnath trek చేసి darshan చేస్తారు. Night stay Kedarnath camp.",
        "Day 8: Kedarnath darshan తర్వాత trek చేసి Sonprayag లేదా Sitapur తిరిగి వస్తారు.",
        "Day 9: Sonprayag లేదా Sitapur నుంచి Badrinath లేదా Joshimath వెళ్తారు. Night stay అక్కడే.",
        "Day 10: Badrinath darshan చేసి Mana Village సందర్శిస్తారు. Night stay Chamoli లేదా Haridwar.",
        "Day 11: Chamoli లేదా Haridwar నుంచి Delhi తిరిగి వస్తారు.",
      ];
      const englishItinerary = [
        "Sir, 11-day itinerary:",
        "Day 1: Delhi to Haridwar; visit Har Ki Pauri and attend Ganga Aarti. Overnight in Haridwar.",
        "Day 2: Haridwar to Lakhamandal; visit Shiva Temple. Overnight in Lakhamandal.",
        "Day 3: Lakhamandal to Janki Chatti; visit Yamunotri, then return to Lakhamandal.",
        "Day 4: Lakhamandal to Uttarkashi; visit Kashi Vishwanath Temple. Overnight in Uttarkashi.",
        "Day 5: Uttarkashi to Gangotri and back. Overnight in Uttarkashi.",
        "Day 6: Uttarkashi to Sonprayag or Sitapur. Overnight there.",
        "Day 7: Sonprayag or Sitapur to Gaurikund, then trek to Kedarnath for darshan. Overnight at the Kedarnath camp.",
        "Day 8: Kedarnath darshan, then trek back to Sonprayag or Sitapur.",
        "Day 9: Sonprayag or Sitapur to Badrinath or Joshimath. Overnight there.",
        "Day 10: Badrinath darshan and visit Mana Village. Overnight in Chamoli or Haridwar.",
        "Day 11: Chamoli or Haridwar to Delhi.",
      ];
      reply = (isTeluguInput ? teluguItinerary : englishItinerary).join(" ");
    } else if (isUpcomingBatchQuestion) {
      const formattedDates = getUpcomingCharDhamBatchDates();
      reply = formattedDates.length
        ? isTeluguInput
          ? `Sir, itinerary లో ఉన్న upcoming batch dates: ${formattedDates.join("; ")}.`
          : `Sir, upcoming batch dates from the itinerary are ${formattedDates.join("; ")}.`
        : isTeluguInput
          ? "Sir, brochure లోని next batch date ని confirm చేయలేకపోయాను. Latest dates కోసం travel team ని అడగండి."
          : "Sir, I can't confirm the next batch date from the brochure. Please ask the travel team for the latest dates.";
    } else if (isBookingAmountQuestion) {
      reply = isTeluguInput ? "Sir, package booking advance ₹5,000 ఉంటుంది." : "Sir, the booking advance is ₹5,000.";
    } else if (isTotalWithGstQuestion) {
      reply = isTeluguInput ? "Sir, 5% GST కలిపి మొత్తం ₹24,673.95 per person అవుతుంది." : "Sir, the total including 5% GST is ₹24,673.95 per person.";
    } else if (isCharDhamOriginQuestion) {
      reply = isTeluguInput ? "Sir, tour Delhi లో start అవుతుంది. Hyderabad నుంచి train-ticket booking assistance అందుబాటులో ఉంది." : "Sir, the tour starts in Delhi; train-ticket booking assistance is available from Hyderabad.";
    } else if (isCharDhamShortAnswer) {
      // Short, fixed reply prevents the model from adding unrelated brochure caveats or questions.
      reply = isTeluguInput ? "Sir, adult package ₹23,499 per person. దానికి అదనంగా 5% GST ఉంటుంది." : "Sir, the adult package is ₹23,499 per person plus 5% GST.";
    } else {
      const knowledge = await loadApprovedKnowledge();
      const chatResponse = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "api-subscription-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.SARVAM_CHAT_MODEL || "sarvam-105b-conversations",
          messages: [
            {
              role: "system",
              content: isTeluguInput
                ? "The customer spoke Telugu. Reply primarily in simple Telugu script. Keep familiar business phrases such as Sir, per person, GST, extra, dates, and night stay in English where natural. Do not answer entirely in English."
                : "Reply in the same language as the customer.",
            },
            {
              role: "system",
              content:
                "You are Ananya, On A Trip Holidays' travel assistant. Reply in the customer's language. For Telugu, use simple Telugu script. For Tenglish, mix natural Telugu with common English words written in English script (for example, Sir, per person, plus, GST, and extra). Be concise and sound like a helpful travel employee: when asked how to phrase a previous answer, give one short customer-facing example instead of repeating the same explanation: answer only what was asked, usually in one short sentence, with no greeting, brochure mention, repeated facts, or unsolicited follow-up question. For a price question, give only the per-person price and GST. For a requested day-by-day Char Dham itinerary, provide all 11 days, label Day 1 through Day 11, use one concise sentence per day, and never stop after a partial list. Keep the complete spoken reply under 2,400 characters. For other itinerary questions, give only the requested details; provide day-by-day details only if explicitly requested. Remember details already provided and never repeat a question. Never claim live seats or current offer validity because no live inventory is connected; mention that the travel team will confirm only when the customer explicitly asks about live availability or current offers. Do not add confirmation caveats to ordinary package answers. If the customer clearly agrees to book, say that you have noted the request and will confirm with the travel team and update them. Never claim the booking has already been placed.",
            },
            { role: "system", content: `Approved travel knowledge:\\n${knowledge}` },
            ...history,
            { role: "user", content: transcript },
          ],
          temperature: 0.1,
          max_tokens: isDetailedItineraryQuestion ? 650 : 70,
        }),
        cache: "no-store",
      });
      const chat = await readJson(chatResponse);
      const rawReply = chat.choices?.[0]?.message?.content;
      if (typeof rawReply !== "string" || !rawReply.trim()) {
        return Response.json({ error: "Sarvam did not return a reply. Please try again." }, { status: 502 });
      }
      reply = avoidRepeatedQuestion(rawReply.trim(), history);
    }

    const ttsResponse = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: { "api-subscription-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.SARVAM_TTS_MODEL || "bulbul:v4-flash",
        speaker: process.env.SARVAM_TTS_SPEAKER || "kavitha_te_conversation",
        text: prepareSpeechText(reply).slice(0, isDetailedItineraryQuestion ? 2400 : 600),
        target_language_code: "te-IN",
        pace: 1.2,
        speech_sample_rate: 22050,
        output_audio_codec: "wav",
      }),
      cache: "no-store",
    });
    const speech = await readJson(ttsResponse);
    const audioBase64 = speech.audios?.[0];
    if (typeof audioBase64 !== "string") {
      return Response.json({ error: "Sarvam returned text but no audio. Check the selected voice settings." }, { status: 502 });
    }

    return Response.json({ transcript, reply, audioBase64, languageCode: stt.language_code ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice request failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
