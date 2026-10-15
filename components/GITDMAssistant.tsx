"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string; links?: { label: string; href: string }[] };

const suggestions = [
  "How do I apply to GITDM?",
  "Where can I find the free guide?",
  "What can I study here?",
  "How do I buy a book?",
];

export function GITDMAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I’m the GITDM support assistant. I can help you find programmes, understand the admissions steps, locate learning resources in the store, or navigate the website. What would you like help with?", links: [{ label: "Explore programmes", href: "/programmes" }, { label: "Open the store", href: "/store" }, { label: "Apply to GITDM", href: "/admissions/apply" }] },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy, open]);

  async function send(text = input) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10).map(({ role, content }) => ({ role, content })), page: window.location.pathname }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant is temporarily unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer, links: Array.isArray(data.links) ? data.links : [] }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn’t reach the support service just now. You can still use these website sections, or try again in a moment.", links: [{ label: "Programmes", href: "/programmes" }, { label: "Admissions", href: "/admissions/apply" }, { label: "Store", href: "/store" }, { label: "Contact", href: "/contact" }] }]);
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(); }

  return <>
    <button className="gitdm-ai-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close GITDM assistant" : "Open GITDM assistant"} aria-expanded={open}>
      <span className="gitdm-ai-launcher-icon">{open ? "×" : "✦"}</span><span>{open ? "Close" : "Ask GITDM"}</span>
    </button>
    {open && <section className="gitdm-ai-panel" aria-label="GITDM AI support chat">
      <header className="gitdm-ai-header"><div className="gitdm-ai-avatar">✦</div><div><strong>GITDM Assistant</strong><small>Website, admissions & store help</small></div><button onClick={() => setOpen(false)} aria-label="Close chat">×</button></header>
      <div className="gitdm-ai-messages" aria-live="polite">
        {messages.map((message, index) => <div className={`gitdm-ai-message ${message.role}`} key={`${index}-${message.role}`}><div className="gitdm-ai-message-text">{message.content}</div>{message.links?.length ? <div className="gitdm-ai-links">{message.links.map((link) => <Link href={link.href} key={`${link.href}-${link.label}`} onClick={() => setOpen(false)}>{link.label} ↗</Link>)}</div> : null}</div>)}
        {messages.length === 1 && <div className="gitdm-ai-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>}
        {busy && <div className="gitdm-ai-message assistant"><div className="gitdm-ai-message-text">Thinking…</div></div>}
        <div ref={bottomRef} />
      </div>
      <form className="gitdm-ai-form" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question…" aria-label="Ask the GITDM assistant" maxLength={1200} disabled={busy}/><button type="submit" disabled={busy || !input.trim()} aria-label="Send message">➤</button></form>
      <p className="gitdm-ai-disclaimer">AI can make mistakes. Confirm important admissions, payment and policy details with GITDM staff. No trading or investment advice.</p>
    </section>}
  </>;
}
