import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { OnThisDayItem } from "@/lib/on-this-day";

/** "그날의 기억" 회고 배너. 항목 없으면 렌더 안 함(휑함 방지). */
export function OnThisDay({ items }: { items: OnThisDayItem[] }) {
  if (!items.length) return null;

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl border border-accent/20 bg-accent-soft/20 px-3 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Sparkles size={13} strokeWidth={2.4} /> 그날의 기억
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/memory/${it.id}`}
              className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2 transition-colors hover:bg-foreground/[0.04]"
            >
              <span className="block text-[11px] font-medium text-accent">
                {it.yearsAgo}년 전 오늘
              </span>
              <span className="mt-0.5 block max-w-[44vw] truncate text-sm font-semibold sm:max-w-[200px]">
                {it.title}
              </span>
              {it.place && (
                <span className="mt-0.5 block max-w-[44vw] truncate text-[11px] text-muted sm:max-w-[200px]">
                  📍 {it.place}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
