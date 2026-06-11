"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Check, Share2 } from "lucide-react";

/** 내 친구 초대 링크 + QR 공유. 연락처 없이 카톡 공유/대면 QR로 친구 추가. */
export function FriendShare({
  url,
  qrDataUrl,
  nickname,
}: {
  url: string;
  qrDataUrl: string;
  nickname: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 차단 */
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "캘박 친구 추가",
          text: `${nickname}님과 캘박에서 친구해요`,
          url,
        });
      } catch {
        /* 취소 */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 text-center">
      <p className="text-sm font-semibold">내 친구 코드</p>
      <p className="mt-1 text-xs text-muted">
        링크를 보내거나, 만나서 QR을 찍으면 친구가 돼요
      </p>

      <div className="mx-auto mt-4 w-40 rounded-2xl border border-border bg-white p-3">
        {/* QR은 서버 생성 data URL */}
        <Image
          src={qrDataUrl}
          alt="내 친구 QR"
          width={400}
          height={400}
          unoptimized
          className="h-full w-full"
        />
      </div>

      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-4 h-10 w-full rounded-xl border border-border bg-background px-3 text-center text-sm outline-none"
      />
      <div className="mt-2 flex gap-2">
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
