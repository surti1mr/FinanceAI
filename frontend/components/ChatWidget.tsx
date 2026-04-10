"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: number;
  thinking?: boolean;
}

let msgId = 0;
function nextId() {
  return ++msgId;
}

function getUserId(): string | null {
  try {
    const user = getCurrentUser();
    return user ? String(user.user_id) : null;
  } catch {
    return null;
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChatIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
      <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="w-5 h-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
    </svg>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-purple-600 text-white rounded-br-sm"
              : "bg-gray-100 text-gray-800 rounded-bl-sm"
          }`}
        >
          {msg.thinking ? (
            <span className="flex gap-1 items-center py-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            msg.text
          )}
        </div>
        {msg.sources !== undefined && !msg.thinking && (
          <span className="text-xs text-gray-400 px-1">
            Sources: {msg.sources} transaction{msg.sources !== 1 ? "s" : ""} used
          </span>
        )}
      </div>
    </div>
  );
}

// ── Widget ────────────────────────────────────────────────────────────────────

function greeting(): Message {
  return {
    id: nextId(),
    role: "assistant",
    text: "Hi! I'm your FinanceAI assistant. Ask me anything about your transactions.",
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([greeting()]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Read user_id from localStorage inside the component so it always reflects
  // the current session. Track it in state to detect account switches.
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    getUserId()
  );

  // Reset chat history whenever the logged-in user changes.
  useEffect(() => {
    const id = getUserId();
    if (id !== currentUserId) {
      setCurrentUserId(id);
      setMessages([greeting()]);
      setInput("");
      setBusy(false);
      setOpen(false);
    }
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || busy) return;

    const userId = getUserId();
    if (!userId) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "Please log in first to use the AI assistant.",
        },
      ]);
      return;
    }

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text: question },
    ]);

    const thinkingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: "assistant", text: "", thinking: true },
    ]);
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, question }),
      });

      if (!res.ok) throw new Error("Request failed.");
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                text: data.answer ?? "No answer returned.",
                thinking: false,
                sources: Array.isArray(data.relevant_transactions)
                  ? data.relevant_transactions.length
                  : 0,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                text: "Sorry, something went wrong. Please try again.",
                thinking: false,
              }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-transform active:scale-95"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Chat drawer */}
      <div
        className={`fixed bottom-24 right-6 z-40 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ maxHeight: "520px" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <ChatIcon />
            <span className="font-semibold text-sm">FinanceAI</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="text-purple-200 hover:text-white transition"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 bg-white">
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3 flex gap-2 bg-white">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            placeholder="Ask about your finances…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 transition"
          />
          <button
            onClick={sendMessage}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
}
