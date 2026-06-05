"use client";

import { useState } from "react";
import { Link2, Copy, Check, Share2 } from "lucide-react";
import { createInviteAction } from "@/app/actions/invites";

export function ShareInvite({
  memoryId,
  title,
}: {
  memoryId: string;
  title: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await createInviteAction(memoryId);
    setLoading(false);
    if ("code" in res) setUrl(`${window.location.origin}/invite/${res.code}`);
    else alert("초대 링크를 만들지 못했어요.");
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 차단 환경 */
    }
  }

  async function share() {
    if (!url) return;
    // 모바일: OS 공유시트 → 카카오톡 등으로 전송
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${title} · 캘박 초대`,
          text: `'${title}' 일정에 초대합니다`,
          url,
        });
      } catch {
        /* 사용자가 취소 */
      }
    } else {
      copy();
    }
  }

  if (!url) {
    return (
      <button
        onClick={generate}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/50 bg-accent-soft/20 font-medium text-accent transition-colors hover:bg-accent-soft/40 disabled:opacity-60"
      >
        <Link2 size={18} /> {loading ? "만드는 중…" : "초대 링크 만들기"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <p className="mb-2 px-1 text-xs text-muted">
        이 일정에 초대할 친구에게 보내세요
      </p>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mb-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium transition-colors hover:bg-foreground/5"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "복사됨" : "링크 복사"}
        </button>
        <button
          onClick={share}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent text-sm font-medium text-white"
        >
          <Share2 size={16} /> 공유 (카톡)
        </button>
      </div>
    </div>
  );
}
