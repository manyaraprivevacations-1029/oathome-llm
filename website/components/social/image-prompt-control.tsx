"use client";

import { useRef, useState } from "react";

export function ImagePromptControl({ prompts, selected, onSelect, onEdit, disabled }: {
  prompts: string[];
  selected: number;
  onSelect: (index: number) => void;
  onEdit: (text: string) => void;
  disabled?: boolean;
}) {
  const labels = ["Scenic", "Landmark", "People"];
  const prompt = prompts[selected] || "";
  const field = useRef<HTMLTextAreaElement>(null);
  const [copyStatus, setCopyStatus] = useState("");

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus("Copied. Paste into ChatGPT, then upload the image below.");
    } catch {
      field.current?.focus();
      field.current?.select();
      setCopyStatus("Prompt selected. Use your device’s Copy command.");
    }
  }

  return <div style={{ display: "grid", gap: 7 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#746957", marginRight: 4 }}>IMAGE PROMPT</span>
      {prompts.map((_, index) => <button
        key={index} type="button" aria-pressed={selected === index} disabled={disabled}
        onClick={() => { setCopyStatus(""); onSelect(index); }}
        style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #d7c7ae", borderRadius: 6, cursor: "pointer", background: selected === index ? "#a8752d" : "#fff", color: selected === index ? "#fff" : "#746957" }}
      >{labels[index] || `Option ${index + 1}`}</button>)}
      <button type="button" disabled={disabled || !prompt.trim()} onClick={() => void copyPrompt()}
        style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #d7c7ae", borderRadius: 6, cursor: "pointer", background: "#fff", color: "#746957" }}
      >Copy for ChatGPT</button>
    </div>
    <textarea ref={field} aria-label="Selected image prompt" rows={2} maxLength={1200} value={prompt} disabled={disabled}
      onChange={event => { setCopyStatus(""); onEdit(event.target.value); }}
      style={{ boxSizing: "border-box", width: "100%", minHeight: 56, maxHeight: 140, resize: "vertical", overflowY: "auto", border: "1px solid #ded5c6", borderRadius: 8, padding: "9px 11px", fontSize: 12, fontWeight: 400, lineHeight: 1.45, background: "#fff", color: "#30291f" }}
    />
    {copyStatus && <span role="status" style={{ fontSize: 11, color: "#746957" }}>{copyStatus}</span>}
  </div>;
}
