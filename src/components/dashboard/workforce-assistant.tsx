"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  FileText,
  Maximize2,
  Minimize2,
  Plus,
  Square,
  User,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { AiMark } from "@/components/dashboard/ai-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { WorkforceAssistantStreamEvent } from "@/lib/workforce-assistant/stream";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reportUrl?: string;
  source?: "openai" | "deterministic";
  stopped?: boolean;
}

interface WorkforceAssistantSession {
  messages: ChatMessage[];
  referenceDate: string;
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  send: (message?: string) => Promise<void>;
  stop: () => void;
  newChat: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "workforce-welcome",
  role: "assistant",
  content:
    "ถามเรื่องข้อมูลการมาทำงาน การลา OT เงินเดือน หรือภาพรวมกำลังคนได้ ระบบจะตอบจากข้อมูลในขอบเขตองค์กรของคุณ และสามารถสร้างรายงานพร้อมกราฟให้เปิดดูต่อได้",
};

const SUGGESTIONS = [
  "วันนี้ใครมาสายบ้าง",
  "สรุปการมาทำงานย้อนหลัง 7 วัน",
  "เดือนนี้มีรายการขาดงานและลางานเท่าไร",
  "เปรียบเทียบอัตราการมาทำงานแต่ละแผนก",
];

const WorkforceAssistantContext = createContext<WorkforceAssistantSession | null>(null);

function newMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function WorkforceAssistantProvider({
  children,
  referenceDate,
}: {
  children: ReactNode;
  referenceDate: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const previousResponseIdRef = useRef<string | null>(null);
  const continuationTokenRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    previousResponseIdRef.current = null;
    continuationTokenRef.current = null;
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setSending(false);
  }, []);

  const send = useCallback(
    async (suggestedMessage?: string) => {
      const message = (suggestedMessage ?? input).trim();
      if (!message || sending) return;

      const userId = newMessageId();
      const assistantId = newMessageId();
      const abortController = new AbortController();
      abortRef.current = abortController;
      setInput("");
      setSending(true);
      setMessages((current) => [
        ...current,
        { id: userId, role: "user", content: message },
        { id: assistantId, role: "assistant", content: "" },
      ]);

      function updateAssistant(update: (current: ChatMessage) => ChatMessage) {
        setMessages((current) =>
          current.map((item) => (item.id === assistantId ? update(item) : item)),
        );
      }

      try {
        const response = await fetch("/api/workforce-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            previousResponseId: previousResponseIdRef.current,
            continuationToken: continuationTokenRef.current,
          }),
          signal: abortController.signal,
        });
        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "Workforce assistant request failed.");
        }
        if (!response.body) throw new Error("Streaming response is unavailable.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedDone = false;

        const applyEvent = (event: WorkforceAssistantStreamEvent) => {
          if (event.type === "delta") {
            updateAssistant((current) => ({ ...current, content: current.content + event.delta }));
          } else if (event.type === "done") {
            receivedDone = true;
            previousResponseIdRef.current = event.responseId;
            continuationTokenRef.current = event.continuationToken;
            updateAssistant((current) => ({
              ...current,
              content: event.answer,
              reportUrl: event.reportUrl ?? undefined,
              source: event.source,
            }));
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim()) applyEvent(JSON.parse(line) as WorkforceAssistantStreamEvent);
          }
          if (done) break;
        }
        if (buffer.trim()) applyEvent(JSON.parse(buffer) as WorkforceAssistantStreamEvent);
        if (!receivedDone) {
          throw new Error("Workforce assistant stream ended before completion.");
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          updateAssistant((current) => ({
            ...current,
            content: current.content || "หยุดการตอบแล้ว",
            stopped: true,
          }));
        } else {
          const message = error instanceof Error ? error.message : "Workforce assistant failed.";
          updateAssistant((current) => ({
            ...current,
            content: current.content || "ไม่สามารถตอบคำถามนี้ได้ กรุณาลองใหม่อีกครั้ง",
          }));
          toast.error(message);
        }
      } finally {
        if (abortRef.current === abortController) abortRef.current = null;
        setSending(false);
      }
    },
    [input, sending],
  );

  const value = useMemo(
    () => ({ messages, referenceDate, input, setInput, sending, send, stop, newChat }),
    [messages, referenceDate, input, sending, send, stop, newChat],
  );

  return (
    <WorkforceAssistantContext.Provider value={value}>
      {children}
    </WorkforceAssistantContext.Provider>
  );
}

function useWorkforceAssistant(): WorkforceAssistantSession {
  const value = useContext(WorkforceAssistantContext);
  if (!value) throw new Error("WorkforceAssistantProvider is missing.");
  return value;
}

export function WorkforceAssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (pathname.startsWith("/dashboard/ai-assistant") || pathname.startsWith("/dashboard/ai-reports")) {
    return null;
  }

  return (
    <>
      {!open && (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-5 right-4 z-40 h-14 w-14 rounded-full border border-navy-200 bg-white text-navy-900 shadow-card hover:bg-navy-50 sm:bottom-6 sm:right-6"
          aria-label="เปิด Workforce Assistant"
          onClick={() => setOpen(true)}
        >
          <AiMark size="lg" />
        </Button>
      )}
      {open && (
        <div
          className={cn(
            "fixed z-50",
            expanded
              ? "inset-2 sm:inset-4"
              : "inset-2 sm:bottom-6 sm:left-auto sm:right-6 sm:top-auto sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[min(430px,calc(100vw-3rem))]",
          )}
        >
          <WorkforceAssistantChat
            mode="popup"
            expanded={expanded}
            onExpand={() => setExpanded((value) => !value)}
            onClose={() => {
              setOpen(false);
              setExpanded(false);
            }}
          />
        </div>
      )}
    </>
  );
}

export function WorkforceAssistantChat({
  mode = "page",
  expanded = false,
  onExpand,
  onClose,
}: {
  mode?: "page" | "popup";
  expanded?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
}) {
  const session = useWorkforceAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const formattedReferenceDate = useMemo(
    () =>
      new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${session.referenceDate}T00:00:00Z`)),
    [session.referenceDate],
  );

  useEffect(() => {
    const element = scrollRef.current;
    element?.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [session.messages, session.sending]);

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-navy-200 bg-white shadow-card",
        mode === "page" && "h-[calc(100dvh-136px)] min-h-[520px] sm:h-[calc(100dvh-164px)] sm:min-h-[560px]",
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-navy-100 bg-white px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-navy-100 bg-white shadow-soft">
            <AiMark size="md" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-navy-900">ผู้ช่วย AI สำหรับงานบุคคล</h2>
            <p className="truncate text-[11px] text-navy-500">
              วิเคราะห์ข้อมูลบุคลากรและสร้างรายงานองค์กร
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="เริ่มแชตใหม่"
            title="เริ่มแชตใหม่"
            onClick={session.newChat}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {mode === "popup" && onExpand && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={expanded ? "ย่อหน้าต่าง" : "ขยายหน้าต่าง"}
              title={expanded ? "ย่อหน้าต่าง" : "ขยายหน้าต่าง"}
              onClick={onExpand}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          {mode === "popup" && onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="ปิดผู้ช่วย"
              title="ปิดผู้ช่วย"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-navy-50/30 px-3 py-4 sm:px-4"
      >
        {session.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            pending={
              session.sending &&
              index === session.messages.length - 1 &&
              message.role === "assistant" &&
              message.content === ""
            }
          />
        ))}
      </div>

      {session.messages.length === 1 && (
        <div className="grid shrink-0 gap-2 border-t border-navy-100 px-4 py-3 sm:grid-cols-2">
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-xs font-normal leading-5"
              onClick={() => session.send(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      <footer className="shrink-0 border-t border-navy-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="rounded-xl border border-navy-200 bg-white p-2 shadow-soft focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100">
          <Textarea
            aria-label="ข้อความถึง Workforce Assistant"
            value={session.input}
            onChange={(event) => session.setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void session.send();
              }
            }}
            placeholder="ถามข้อมูลกำลังคนและช่วงวันที่ที่ต้องการ"
            className="min-h-[48px] resize-none border-0 px-2 py-2 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 border-t border-navy-100 px-1 pt-2">
            <span className="text-[10px] leading-4 text-navy-400">
              วันที่อ้างอิง {formattedReferenceDate} · Asia/Bangkok
            </span>
            {session.sending ? (
              <Button type="button" variant="destructive" size="sm" onClick={session.stop}>
                <Square className="h-3.5 w-3.5" />
                หยุด
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={!session.input.trim()}
                onClick={() => void session.send()}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                ส่ง
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] leading-4 text-navy-400">
          ใช้ข้อมูลเวลาเพื่ออธิบายข้อเท็จจริง ไม่ใช้ตัดสินคุณลักษณะหรือลงโทษบุคคล
        </p>
      </footer>
    </Card>
  );
}

function MessageBubble({ message, pending = false }: { message: ChatMessage; pending?: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-navy-900 px-4 py-2.5 text-sm leading-6 text-white shadow-soft">
          {message.content}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-700" aria-hidden="true">
          <User className="h-4 w-4" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-navy-100 bg-white shadow-soft">
        <AiMark size="sm" />
      </span>
      <div className="max-w-[88%] space-y-2">
        {(message.content || pending) && (
          <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-navy-200 bg-white px-4 py-2.5 text-sm leading-6 text-navy-900 shadow-soft">
            {pending ? (
              <span className="flex min-h-6 items-center gap-1.5" aria-label="กำลังประมวลผล">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500 [animation-delay:300ms]" />
              </span>
            ) : (
              message.content
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 px-1">
          {message.stopped && <Badge variant="outline">หยุดแล้ว</Badge>}
          {message.reportUrl && (
            <Button asChild variant="outline" size="sm" className="h-7">
              <Link href={message.reportUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-3.5 w-3.5" />
                เปิดรายงานและกราฟ
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
