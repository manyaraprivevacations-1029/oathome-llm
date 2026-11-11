export type VoiceLanguage = "Natural Telugu-English" | "English" | "Telugu";

const languageInstructions: Record<VoiceLanguage, string> = {
  "Natural Telugu-English": "Write for Telugu speakers. Use Telugu script for the main spoken sentences, with natural English travel words mixed into those sentences. Include both languages throughout. Example of the language style only: ఈ weekend మన family తో ఒక short trip plan చేద్దామా?",
  Telugu: "Write the spoken sentences in Telugu script. English spelling is fine for proper names when needed.",
  English: "Write the spoken script in English.",
};

export function voiceScriptPrompt({ topic, duration, language, facts }: {
  topic: string; duration: string; language: VoiceLanguage; facts: string;
}) {
  const seconds = Number.parseInt(duration, 10);
  return [
    "Write a spoken travel voiceover for On A Trip Holidays.",
    `Topic: ${topic.trim()}. Target length: ${seconds} seconds, about ${Math.round(seconds * 2)} spoken words.`,
    `Selected language: ${language}. ${languageInstructions[language]}`,
    `Confirmed facts: ${facts.trim() || "None supplied. Use a general enquiry call to action."}`,
    "Use a short hook, a natural spoken rhythm, and a clear call to action. Omit unconfirmed prices, dates, inclusions or availability. Keep confirmation requests and production notes out of the script.",
    'Return only valid JSON with this shape: {"text":"the exact words the narrator will speak"}. No headings, stage directions, bracketed notes or markdown in text.',
  ].join("\n");
}

export function validateVoiceScript(raw: string, language: VoiceLanguage) {
  const script = raw.trim();
  if (!script || /\[[^\]]+\]|^\s*\([^\n]+\)\s*$/m.test(script)) {
    throw new Error("The result included production notes or no spoken script. Return only the spoken words.");
  }
  const words = script.match(/[\p{L}\p{M}]+/gu) || [];
  const telugu = words.filter(word => /\p{Script=Telugu}/u.test(word)).length;
  const english = words.filter(word => /[A-Za-z]/.test(word)).length;
  const minimumTelugu = Math.max(3, Math.ceil(words.length * (language === "Telugu" ? 0.65 : 0.35)));
  if (language !== "English" && (telugu < minimumTelugu || (language === "Natural Telugu-English" && english < 2))) {
    throw new Error(`The script did not follow ${language}. ${languageInstructions[language]}`);
  }
  if (language === "English" && (!english || telugu)) {
    throw new Error("The script did not follow English. Write the spoken script in English.");
  }
  return script;
}
