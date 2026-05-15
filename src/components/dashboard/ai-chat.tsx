"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

const SUGGESTIONS = [
  "Who is late today?",
  "Generate the May payroll summary",
  "Suggest a shift schedule for next week",
  "What is EMP001's leave balance?",
  "Show me the top 3 KPI performers",
  "Predict absenteeism for tomorrow",
];

export function AiChat({
  channel = "dashboard",
  employeeId,
  compact = false,
}: {
  channel?: "dashboard" | "liff";
  employeeId?: string;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm EC AIHR Assistant. I can read live attendance, leave, payroll, and shift data for your organization. Ask me anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await fetch("/api/mastra/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, channel, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Agent error");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.response, toolsUsed: data.tools_used },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reach agent";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col", compact ? "h-[calc(100vh-180px)]" : "h-[calc(100vh-160px)]")}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 pb-4">
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-3 px-2 text-sm text-navy-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            EC AIHR is thinking...
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-lg border border-navy-100 bg-white p-3 text-left text-sm text-navy-700 transition-colors hover:border-orange-200 hover:bg-orange-50"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span>{s}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-navy-200 bg-white p-2 shadow-soft">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask anything — payroll, schedule, leave balance, attendance..."
          className="min-h-[44px] resize-none border-0 px-2 py-2 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between border-t border-navy-100 px-2 pt-2">
          <span className="text-[11px] text-navy-400">Powered by Claude Sonnet 4.6 via Mastra</span>
          <Button onClick={() => send()} disabled={loading || !input.trim()} size="sm">
            <ArrowUp className="h-3.5 w-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-navy-900 px-4 py-2.5 text-sm text-white shadow-soft">
          {message.content}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-700">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-400 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] space-y-1">
        <div className="rounded-2xl rounded-tl-sm border border-navy-100 bg-white px-4 py-2.5 text-sm text-navy-900 shadow-soft whitespace-pre-wrap">
          {message.content}
        </div>
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.toolsUsed.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-navy-100 bg-navy-50 px-2 py-0.5 text-[10px] text-navy-500"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
