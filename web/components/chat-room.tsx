"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendMessageAction } from "@/app/actions/dm";
import type { DmMessage } from "@/lib/dm";

function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ChatRoom({
  threadId,
  myId,
  initial,
}: {
  threadId: string;
  myId: string;
  initial: DmMessage[];
}) {
  const [messages, setMessages] = useState<DmMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // id 기준 dedupe 후 추가(실시간/낙관 중복 방지)
  function merge(m: DmMessage) {
    setMessages((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, m],
    );
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`dm:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => merge(payload.new as DmMessage),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const sent = await sendMessageAction(threadId, content);
      if (sent) merge(sent); // 실시간이 늦어도 즉시 표시
    } catch {
      setText(content); // 실패 시 입력 복구
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted">
            첫 메시지를 보내보세요.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={"flex " + (mine ? "justify-end" : "justify-start")}
            >
              <div
                className={
                  "flex max-w-[78%] items-end gap-1.5 " +
                  (mine ? "flex-row-reverse" : "")
                }
              >
                <div
                  className={
                    "rounded-2xl px-3.5 py-2 text-[15px] leading-snug " +
                    (mine
                      ? "rounded-br-md bg-accent text-white"
                      : "rounded-bl-md border border-border bg-surface text-foreground")
                  }
                >
                  {m.content}
                </div>
                <span className="shrink-0 text-[10px] text-muted">
                  {clock(m.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-border bg-surface px-3 py-2.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지…"
          className="h-11 flex-1 rounded-full border border-border bg-background px-4 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="보내기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </>
  );
}
