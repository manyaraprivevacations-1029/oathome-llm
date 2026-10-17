"use client";

import { FormEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Model = { name: string; size?: number; details?: { parameter_size?: string; family?: string } };


function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s)]+)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    if (/^https?:\/\//i.test(token)) return <a key={index} href={token} target="_blank" rel="noreferrer noopener">{token}</a>;
    return token;
  });
}

function renderMarkdown(content: string): ReactNode {
  const blocks = content.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("```")) {
      const code = trimmed.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      return <pre className="markdown-code" key={index}><code>{code}</code></pre>;
    }
    const lines = trimmed.split("\n");
    if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
      return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^\s*[-*+]\s+/, ""))}</li>)}</ul>;
    }
    if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
      return <ol key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}</ol>;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const children = renderInline(heading[2]);
      if (heading[1].length === 1) return <h3 key={index}>{children}</h3>;
      if (heading[1].length === 2) return <h4 key={index}>{children}</h4>;
      return <h5 key={index}>{children}</h5>;
    }
    return <p key={index}>{renderInline(lines.join(" "))}</p>;
  });
}

const starters = [
  { title: "Explain something", prompt: "Explain how large language models work in simple terms." },
  { title: "Help me build", prompt: "Help me plan and build a useful software project step by step." },
  { title: "Write with me", prompt: "Help me write a clear, engaging piece of content. Ask what it is for first." },
  { title: "Explore an idea", prompt: "Help me evaluate a new idea, including its benefits, risks, and first steps." },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [modelToPull, setModelToPull] = useState("");
  const [modelBusy, setModelBusy] = useState(false);
  const [modelNotice, setModelNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [webSearch, setWebSearch] = useState(false);

  const loadModels = useCallback(async (tokenOverride?: string) => {
    setStatus("checking");
    try {
      const token = tokenOverride ?? accessToken;
      const response = await fetch("/api/chat", {
        cache: "no-store",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (response.status === 401) setNeedsAuth(true);
      if (response.status === 503 && String(data.error || "").includes("access is not configured")) setNeedsAuth(false);
      if (!response.ok) throw new Error(data.error || "Ollama is not reachable.");
      setNeedsAuth(false);
      const available: Model[] = Array.isArray(data.models) ? data.models : [];
      setModels(available);
      setModel((current) => current && available.some((item) => item.name === current) ? current : (data.defaultModel || available[0]?.name || ""));
      setStatus(available.length ? "online" : "offline");
      setError(available.length ? "" : "OWN travel knowledge is ready.");
    } catch (err) {
      setStatus("offline");
      setError(err instanceof Error ? err.message : "Could not load OWN travel knowledge.");
    }
  }, [accessToken]);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem("oathome_access_token") || "";
    if (savedToken) {
      setAccessToken(savedToken);
      void loadModels(savedToken);
    } else {
      void loadModels("");
    }
  }, [loadModels]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("own_current_conversation");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const restored = parsed.filter((item): item is Message =>
            !!item && typeof item === "object" &&
            ((item as Message).role === "user" || (item as Message).role === "assistant") &&
            typeof (item as Message).content === "string"
          );
          setMessages(restored.slice(-40));
        }
      }
    } catch {
      window.localStorage.removeItem("own_current_conversation");
    } finally {
      setHistoryReady(true);
    }
  }, []);
  useEffect(() => {
    if (!historyReady) return;
    try { window.localStorage.setItem("own_current_conversation", JSON.stringify(messages.slice(-40))); } catch { /* Storage may be disabled or full. */ }
  }, [messages, historyReady]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async (text = draft) => {
    const content = text.trim();
    if (!content || loading) return;
    if (!model) {
      setError("OWN is loading its travel knowledge. Please try again in a moment.");
      return;
    }
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ model, messages: next, webSearch }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) setNeedsAuth(true);
        throw new Error(data.error || "The model request failed.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const part = JSON.parse(line);
          if (part.message?.content) {
            answer += part.message.content;
            setMessages((current) => {
              const updated = [...current];
              updated[updated.length - 1] = { role: "assistant", content: answer };
              return updated;
            });
          }
          if (part.error) throw new Error(part.error);
        }
      }
      if (buffer.trim()) {
        const part = JSON.parse(buffer);
        if (part.message?.content) {
          answer += part.message.content;
          setMessages((current) => {
            const updated = [...current];
            updated[updated.length - 1] = { role: "assistant", content: answer };
            return updated;
          });
        }
        if (part.error) throw new Error(part.error);
      }
      if (!answer) setMessages((current) => current.slice(0, -1));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((current) => current.map((item, index) => index === current.length - 1 && item.role === "assistant" && !item.content ? { ...item, content: "Generation stopped." } : item));
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong while generating a response.");
        setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && item.role === "assistant" && !item.content)));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void sendMessage(); };
  const submitToken = (event: FormEvent) => {
    event.preventDefault();
    const token = tokenDraft.trim();
    if (!token) return;
    window.sessionStorage.setItem("oathome_access_token", token);
    setAccessToken(token);
    setTokenDraft("");
    setError("");
    void loadModels(token);
  };
  const clearToken = () => {
    window.sessionStorage.removeItem("oathome_access_token");
    setAccessToken("");
    setNeedsAuth(true);
    setModels([]);
    setModel("");
    setStatus("offline");
    setError("Access token cleared.");
  };
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
  };
  const newChat = () => { abortRef.current?.abort(); setMessages([]); setDraft(""); setError(""); setLoading(false); setSidebarOpen(false); setModelsOpen(false); };
  const manageModel = async (action: "pull" | "delete", name: string) => {
    if (!name.trim() || modelBusy) return;
    if (action === "delete" && !window.confirm(`Remove model "${name}" from this machine? This cannot be undone.`)) return;
    setModelBusy(true); setModelNotice(action === "pull" ? "Downloading model… this can take several minutes." : "Removing model…"); setError("");
    try {
      const response = await fetch("/api/models", { method: action === "pull" ? "POST" : "DELETE", headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ model: name.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Model operation failed.");
      setModelNotice(data.message || "Done.");
      await loadModels();
      if (action === "delete" && model === name) setModel("");
      if (action === "pull") setModel(name.trim());
      setModelToPull("");
    } catch (err) { setModelNotice(err instanceof Error ? err.message : "Model operation failed."); }
    finally { setModelBusy(false); }
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>O</span></div>
          <div className="brand-copy"><strong>OWN</strong><span>OATHOME INTELLIGENCE</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
        </div>
        <button className="new-chat" onClick={newChat}><span className="plus">＋</span> New chat <span className="shortcut">⌘ K</span></button>
        <div className="side-label">YOUR WORKSPACE</div>
        <button className="side-link selected"><span className="side-icon">◈</span> Chat</button>
        
        <div className="sidebar-bottom">
          <div className="runtime-card">
            <div className="runtime-heading"><span className={`status-dot ${status}`}></span><strong>Runtime status</strong></div>
            <p>{status === "online" ? "OWN knowledge engine ready" : status === "checking" ? "Loading travel knowledge…" : "Knowledge engine unavailable"}</p>
            <button onClick={() => void loadModels()}>{status === "online" ? "Refresh knowledge ↻" : "Retry ↻"}</button>
          </div>
          <div className="profile"><div className="profile-avatar">O</div><div><strong>OWN Workspace</strong><span>Personal AI lab</span></div><span className="profile-menu">•••</span></div>
        </div>
      </aside>
      {sidebarOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button><span className="breadcrumb">OWN <span>/</span> Chat</span><span className="private-pill"><span>●</span> YOUR AI</span></div>
          <div className="topbar-right">
            <label className="model-select-label" htmlFor="model-select">MODEL</label>
            <select id="model-select" value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length} aria-label="Choose model">
              {!models.length && <option value="">No models found</option>}
              {models.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
            {accessToken && <button className="icon-button" onClick={clearToken} title="Lock runtime" aria-label="Lock runtime">⌑</button>}
            <button className="icon-button" onClick={() => void loadModels()} title="Refresh runtime" aria-label="Refresh runtime">↻</button>
          </div>
        </header>
        {modelsOpen ? <div className="model-manager"><div className="model-manager-head"><div><div className="conversation-label"><span className="blue-pip"></span> YOUR MODEL LIBRARY</div><h1>Models</h1><p>OWN answers using approved travel information. No external AI model or AI API is used.</p></div><button className="icon-button" onClick={() => void loadModels()} aria-label="Refresh models">↻</button></div><div className="model-pull-form"><strong>Knowledge-based mode</strong><p>Package information is maintained in the approved travel knowledge file. No model downloads, API keys, or AI credits are required.</p></div>{modelNotice && <div className="model-notice" role="status">{modelBusy && <span className="status-dot checking" />} {modelNotice}</div>}<div className="model-list-head"><strong>Installed models</strong><span>{models.length} available</span></div>{models.length ? <div className="model-grid">{models.map((item) => <article className="model-card" key={item.name}><div className="model-card-icon">⬡</div><div className="model-card-info"><strong>{item.name}</strong><span>{item.details?.parameter_size || item.details?.family || "Local model"}{item.size ? ` · ${(item.size / 1_000_000_000).toFixed(1)} GB` : ""}</span></div><button className="model-use" onClick={() => { setModel(item.name); setModelsOpen(false); }} disabled={model === item.name}>{model === item.name ? "Selected" : "Use model"}</button><button className="model-delete" onClick={() => void manageModel("delete", item.name)} disabled={modelBusy} aria-label={`Remove ${item.name}`} title="Remove model">×</button></article>)}</div> : <div className="model-empty">No travel packages have been added to the knowledge file yet. Add approved package details to enable package-specific answers.</div>}<p className="model-safety-note">Downloads can be large and use disk space. Removing a model permanently deletes its local files.</p></div> : <div className="chat-scroll">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-symbol"><div className="symbol-core">O</div><span className="symbol-orbit orbit-one"></span><span className="symbol-orbit orbit-two"></span></div>
              <div className="welcome-kicker"><span className="blue-pip"></span> YOUR SPACE. YOUR MODELS. YOUR AI.</div>
              <h1>Intelligence,<br /><span>on your terms.</span></h1>
              <p className="welcome-description">A home for your ideas, powered by models you choose.<br className="desktop-break" /> Private by design. Built by you. Growing with you.</p>
              {status === "offline" && <div className="connection-warning"><span>!</span><div><strong>{needsAuth ? "Unlock your OWN runtime" : "Connect your model runtime"}</strong><p>{error || (needsAuth ? "Enter the access token configured by your runtime administrator." : "Start Ollama and make sure the OATHome server can reach it.")}</p>{needsAuth ? <form className="token-form" onSubmit={submitToken}><input type="password" autoComplete="current-password" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} placeholder="OATHome access token" aria-label="OATHome access token" /><button type="submit" disabled={!tokenDraft.trim()}>Unlock ↗</button></form> : <button onClick={() => void loadModels()}>Try again ↗</button>}</div></div>}
              {status === "online" && <div className="connected-note"><span className="status-dot online"></span> OWN knowledge engine · no AI API</div>}
              <div className="starter-grid">{starters.map((starter, index) => <button className="starter-card" key={starter.title} onClick={() => void sendMessage(starter.prompt)} disabled={!model || loading}><span className={`starter-icon starter-icon-${index}`}>{["✳", "⌘", "↗", "◇"][index]}</span><strong>{starter.title}</strong><span>{starter.prompt}</span><b>↗</b></button>)}</div>
            </div>
          ) : (
            <div className="conversation">
              <div className="conversation-label"><span className="blue-pip"></span> CONVERSATION</div>
              {messages.map((message, index) => <article className={`message ${message.role}`} key={index}>
                <div className={`message-avatar ${message.role}`}>{message.role === "user" ? "Y" : "O"}</div>
                <div className="message-body"><div className="message-author">{message.role === "user" ? "You" : "OWN"} <span>{message.role === "assistant" && index === messages.length - 1 && loading ? "· generating" : ""}</span></div><div className="message-content">{message.content ? renderMarkdown(message.content) : (loading && index === messages.length - 1 ? <span className="typing"><i></i><i></i><i></i></span> : "")}</div></div>
              </article>)}
              <div ref={endRef} />
            </div>
          )}
        </div>}
        {!modelsOpen && <>{error && messages.length > 0 && <div className="inline-error">{error}{needsAuth && <form className="inline-token-form" onSubmit={submitToken}><input type="password" autoComplete="current-password" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} placeholder="Access token" aria-label="OATHome access token" /><button type="submit" disabled={!tokenDraft.trim()}>Unlock</button></form>}<button onClick={() => setError("")}>×</button></div>}
        <div className="composer-area">
          <form className="composer" onSubmit={submit}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder={model ? "Ask about a tour package…" : "Loading OWN travel knowledge…"} rows={1} disabled={!model || loading} aria-label="Message OWN" />
            <div className="composer-toolbar"><div className="composer-tools"><span className="web-search-toggle">Answers from approved travel data</span><span className="composer-hint"><span>↵</span> Send <span className="hint-divider">·</span> Shift + ↵ for new line</span></div><div className="composer-actions"><span className="runtime-mini"><i className={`status-dot ${status}`}></i> {"OWN Travel Knowledge"}</span>{loading ? <button type="button" className="send-button stop-button" onClick={() => abortRef.current?.abort()} aria-label="Stop generation">■</button> : <button type="submit" className="send-button" disabled={!draft.trim() || !model} aria-label="Send message">↑</button>}</div></div>
          </form>
          <p className="disclaimer">OWN can make mistakes. Verify important information. <span>·</span> Your interface, your choice of models.</p>
        </div></>}
      </section>
    </main>
  );
}
