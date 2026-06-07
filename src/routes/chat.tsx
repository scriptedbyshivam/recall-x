import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Send, Sparkles, Database, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMemorySummary } from "@/lib/analysis";

const STORAGE_KEY = "hindsight-chat-v1";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Hindsight Content Strategy Agent" },
      { name: "description", content: "Ask the memory-powered marketing strategist anything." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const memFn = useServerFn(getMemorySummary);
  const { data: mem } = useQuery({ queryKey: ["mem-summary"], queryFn: () => memFn() });

  const [useMemory, setUseMemory] = useState(true);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setInitial(raw ? (JSON.parse(raw) as UIMessage[]) : []);
    } catch {
      setInitial([]);
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ useMemory }),
      }),
    [useMemory],
  );

  return initial === null ? (
    <main className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Loading…</main>
  ) : (
    <ChatInner
      transport={transport}
      initial={initial}
      useMemory={useMemory}
      setUseMemory={setUseMemory}
      memoryCount={mem?.count ?? 0}
      input={input}
      setInput={setInput}
      inputRef={inputRef}
      scrollRef={scrollRef}
    />
  );
}

function ChatInner({
  transport, initial, useMemory, setUseMemory, memoryCount, input, setInput, inputRef, scrollRef,
}: {
  transport: DefaultChatTransport<UIMessage>;
  initial: UIMessage[];
  useMemory: boolean;
  setUseMemory: (v: boolean) => void;
  memoryCount: number;
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { messages, sendMessage, status, setMessages } = useChat({
    id: "single",
    messages: initial,
    transport,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  useEffect(() => { inputRef.current?.focus(); }, [status, inputRef]);

  const busy = status === "submitted" || status === "streaming";

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col px-6 py-8" style={{ minHeight: "calc(100vh - 73px)" }}>
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Chat with the strategist</h1>
          <p className="text-sm text-muted-foreground">Backed by Hindsight Memory · cites real numbers from your history.</p>
        </div>
        <button
          onClick={() => setUseMemory(!useMemory)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-mono uppercase tracking-wider transition ${
            useMemory ? "border-memory/40 bg-memory/10 text-memory" : "border-border bg-secondary text-muted-foreground"
          }`}
          title="Toggle memory access to compare answers"
        >
          {useMemory ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          Memory {useMemory ? "ON" : "OFF"}
        </button>
      </header>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs">
        <Database className={`h-3.5 w-3.5 ${useMemory ? "text-memory" : "text-muted-foreground"}`} />
        <span className="font-mono uppercase tracking-wider text-muted-foreground">
          {useMemory ? `${memoryCount} memories in context` : "Memory disabled — generic AI mode"}
        </span>
        <button
          onClick={() => { if (confirm("Clear chat?")) { setMessages([]); localStorage.removeItem(STORAGE_KEY); } }}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          Clear chat
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto rounded-xl border border-border bg-card/60 backdrop-blur px-5 py-6 md:px-8 md:py-8">
        {messages.length === 0 && <Welcome useMemory={useMemory} setInput={setInput} />}
        {messages.map((m) => <Message key={m.id} m={m} />)}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading memory…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="mt-3 flex items-end gap-2 rounded-xl border border-border bg-card p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          rows={2}
          placeholder={useMemory ? "What should I post next?" : "Ask anything (generic mode)…"}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </main>
  );
}

function Welcome({ useMemory, setInput }: { useMemory: boolean; setInput: (v: string) => void }) {
  const prompts = useMemory
    ? [
        "What should I post next?",
        "Which topic gives me the best return?",
        "Compare LinkedIn vs Instagram for our brand.",
        "What content gaps am I missing?",
      ]
    : [
        "What should I post next?",
        "Best topic for a marketing brand?",
      ];
  return (
    <div className="py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Brain className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-3 font-display text-xl">
        {useMemory ? "Ask me anything about your content." : "Generic mode — no memory."}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {useMemory ? "I'll cite real numbers from your stored memories." : "Toggle Memory ON to see the difference."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => setInput(p)}
            className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
          >
            <Sparkles className="mr-1 inline h-3 w-3" />{p}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ m }: { m: UIMessage }) {
  const isUser = m.role === "user";
  const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-black shadow-md">
        <Brain className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 pt-1 text-[15px] leading-[1.7] text-foreground/95">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
            h1: ({ children }) => <h1 className="mt-5 mb-3 font-display text-xl text-white">{children}</h1>,
            h2: ({ children }) => <h2 className="mt-5 mb-2 font-display text-lg text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="mt-4 mb-2 font-display text-base text-white">{children}</h3>,
            ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5 marker:text-violet-400">{children}</ul>,
            ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-1.5 marker:text-violet-400">{children}</ol>,
            li: ({ children }) => <li className="pl-1">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-white/90">{children}</em>,
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">{children}</a>
            ),
            code: ({ children }) => (
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[13px] text-cyan-200 border border-white/10">{children}</code>
            ),
            pre: ({ children }) => (
              <pre className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-4 text-[13px] leading-relaxed">{children}</pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-3 border-l-2 border-violet-400/60 pl-4 italic text-white/80">{children}</blockquote>
            ),
            hr: () => <hr className="my-5 border-white/10" />,
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto"><table className="w-full text-sm border-collapse">{children}</table></div>
            ),
            th: ({ children }) => <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold">{children}</th>,
            td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
          }}
        >
          {text || "…"}
        </ReactMarkdown>
      </div>
    </div>
  );
}
