"use client";

import { FormEvent, useEffect, useState } from "react";

type Model = { name: string; size?: number };
type Message = { role: "user" | "assistant"; content: string };

export default function LlmPlayground() {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("");
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Checking your OATHome runtime…");
  const [busy, setBusy] = useState(false);

  async function refreshModels() {
    try {
      const response = await fetch("/api/llm/health", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "OATHome runtime is not reachable.");
        return;
      }
      const found: Model[] = data.models ?? [];
      setModels(found);
      setModel((current) => current || found[0]?.name || "");
      setStatus(found.length ? `Connected · ${found.length} model(s) available` : "Runtime connected · no models installed yet");
    } catch {
      setStatus("Cannot reach the OATHome runtime. Start it locally or configure the cloud URL.");
    }
  }

  useEffect(() => { void refreshModels(); }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !model.trim() || busy) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ model: model.trim(), messages: next }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Chat request failed.");
      setMessages([...next, { role: "assistant", content: data.message }]);
      setStatus(`Ready · ${data.model}`);
    } catch (error) {
      setMessages([...next, {
        role: "assistant",
        content: error instanceof Error ? error.message : "Unable to get a response.",
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d10", color: "#edf0f5", padding: "32px 18px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <a href="/" style={{ color: "#a8b3c5", textDecoration: "none", fontSize: 14 }}>← Back to On A Trip Holidays</a>
        <header style={{ margin: "28px 0 22px" }}>
          <div style={{ color: "#f3a6c7", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>OATHOME LLM · PLAYGROUND</div>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", margin: "8px 0" }}>Your model. Your runtime.</h1>
          <p style={{ color: "#9ba5b5", margin: 0 }}>Chat through your OATHome inference server. No third-party LLM API is used by this playground.</p>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", background: "#14181e", border: "1px solid #29313c", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: status.startsWith("Connected") || status.startsWith("Ready") ? "#39d98a" : "#e6ad52" }} />
          <span style={{ flex: "1 1 240px", color: "#c0c8d4", fontSize: 14 }}>{status}</span>
          <button type="button" onClick={() => void refreshModels()} style={buttonStyle}>Refresh models</button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <label style={{ flex: "2 1 240px", color: "#9ba5b5", fontSize: 12 }}>MODEL
            <input list="oathome-models" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. qwen3:4b" style={inputStyle} />
            <datalist id="oathome-models">{models.map((item) => <option key={item.name} value={item.name} />)}</datalist>
          </label>
          <label style={{ flex: "1 1 220px", color: "#9ba5b5", fontSize: 12 }}>ACCESS TOKEN (CLOUD)
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Only if your deployment requires it" autoComplete="off" style={inputStyle} />
          </label>
        </div>

        <section aria-live="polite" style={{ minHeight: 340, maxHeight: "52vh", overflowY: "auto", background: "#11151a", border: "1px solid #29313c", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {!messages.length && <div style={{ margin: "auto", textAlign: "center", color: "#8994a5", maxWidth: 420 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>◈</div>
            <strong style={{ color: "#e7ebf1" }}>Start a conversation</strong>
            <p style={{ lineHeight: 1.6 }}>Choose an installed model, or type a model name after pulling it into your local runtime.</p>
          </div>}
          {messages.map((message, index) => <div key={index} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: message.role === "user" ? "#29394a" : "#1a2028", border: "1px solid #303946", borderRadius: 12, padding: "12px 14px", lineHeight: 1.6 }}>
            <div style={{ fontSize: 10, color: "#a8b3c5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{message.role === "user" ? "You" : "OATHome"}</div>
            {message.content}
          </div>)}
          {busy && <div style={{ color: "#a8b3c5", fontSize: 13 }}>Generating with your model…</div>}
        </section>

        <form onSubmit={sendMessage} style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message your model…" aria-label="Message your model" style={{ ...inputStyle, marginTop: 0, flex: 1 }} />
          <button type="submit" disabled={busy || !input.trim() || !model.trim()} style={{ ...buttonStyle, background: "#f3a6c7", color: "#17151a", borderColor: "#f3a6c7", opacity: busy || !input.trim() || !model.trim() ? 0.5 : 1 }}>{busy ? "Working…" : "Send"}</button>
        </form>

        <p style={{ color: "#788494", fontSize: 12, lineHeight: 1.6, marginTop: 18 }}>
          Local development: run the OATHome server on port 11434, then start this website. Production: set OATHOME_LLM_BASE_URL and OATHOME_LLM_ACCESS_TOKEN in the hosting environment, and protect the inference server from direct public access.
        </p>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", boxSizing: "border-box", width: "100%", marginTop: 6,
  border: "1px solid #343d49", borderRadius: 9, padding: "12px 13px",
  background: "#0d1014", color: "#f2f4f8", outline: "none", fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #343d49", borderRadius: 9, padding: "11px 14px",
  background: "#1b222b", color: "#e7ebf1", cursor: "pointer", fontSize: 13,
};
