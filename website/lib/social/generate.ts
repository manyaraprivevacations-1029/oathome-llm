export async function generateSocialDraft(prompt: string): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "OWN could not generate a draft. Please try again.");
  }
  const raw = await response.text();
  const lines = raw.split("\n").map(line => line.trim()).filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      const item = JSON.parse(line) as { message?: { content?: unknown }; response?: unknown };
      const content = item.message?.content ?? item.response;
      if (typeof content === "string" && content.trim()) return content.trim();
    } catch { /* Ignore non-JSON stream fragments and inspect the next line. */ }
  }
  throw new Error("OWN returned an empty response. Please try again.");
}
