"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, ChevronLeft, X } from "lucide-react";
import { createMemoryAction } from "@/app/actions/memories";
import { FeedCard } from "@/components/feed-card";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import type { FeedItem } from "@/lib/feed";

type Props = {
  spaceName: string;
  holidays: Record<string, string>;
  items: FeedItem[];
  todayStr: string; // KST 'YYYY-MM-DD'
};

type Sheet = { mode: "view" | "create"; date: string } | null;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

type Cell = { d: number; dateStr: string; inMonth: boolean };

function buildGrid(year: number, month: number): Cell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: Cell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const dt = new Date(year, month - 1, prevDays - i);
    cells.push({
      d: prevDays - i,
      dateStr: toStr(dt.getFullYear(), dt.getMonth(), prevDays - i),
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, dateStr: toStr(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const idx = cells.length - (firstWeekday + daysInMonth) + 1;
    const dt = new Date(year, month + 1, idx);
    cells.push({
      d: idx,
      dateStr: toStr(dt.getFullYear(), dt.getMonth(), idx),
      inMonth: false,
    });
  }
  return cells;
}

function formatDayHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${m}월 ${d}일 ${WEEKDAYS[new Date(y, m - 1, d).getDay()]}요일`;
}

export function MonthCalendar({ spaceName, holidays, items, todayStr }: Props) {
  const router = useRouter();
  const [ty, tm] = useMemo(() => {
    const [y, m] = todayStr.split("-").map(Number);
    return [y, m - 1];
  }, [todayStr]);

  const [viewYear, setViewYear] = useState(ty);
  const [viewMonth, setViewMonth] = useState(tm);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [submitting, setSubmitting] = useState(false);

  const itemsByDate = useMemo(() => {
    const map: Record<string, FeedItem[]> = {};
    for (const it of items) (map[it.date] ??= []).push(it);
    return map;
  }, [items]);

  const cells = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }
  function goToday() {
    setViewYear(ty);
    setViewMonth(tm);
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSubmitting(true);
    await createMemoryAction(fd);
    setSubmitting(false);
    setSheet({ mode: "view", date: String(fd.get("date")) });
    router.refresh();
  }

  const sheetItems = sheet ? itemsByDate[sheet.date] ?? [] : [];
  const sheetHoliday = sheet ? holidays[sheet.date] : undefined;

  return (
    <div className="flex flex-1 flex-col">
      {/* 헤더 */}
      <header className="flex items-end justify-between px-4 pt-6 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {spaceName}
          </p>
          <h1 className="mt-1 text-[28px] font-bold leading-none tracking-tight">
            {viewYear}년 {viewMonth + 1}월
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="이전 달"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            ‹
          </button>
          <button
            onClick={goToday}
            className="h-9 rounded-full border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-foreground/5"
          >
            오늘
          </button>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            ›
          </button>
        </div>
      </header>

      {/* 요일 */}
      <div className="grid grid-cols-7 px-1.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={
              "py-2 text-center text-xs font-semibold " +
              (i === 0 ? "text-sunday" : i === 6 ? "text-saturday" : "text-muted")
            }
          >
            {w}
          </div>
        ))}
      </div>

      {/* 그리드 */}
      <div
        key={`${viewYear}-${viewMonth}`}
        className="grid flex-1 grid-cols-7 grid-rows-6 gap-1 px-1.5 pb-2"
      >
        {cells.map((c, idx) => {
          const col = idx % 7;
          const holiday = holidays[c.dateStr];
          const isRed = col === 0 || !!holiday;
          const isBlue = col === 6;
          const isToday = c.dateStr === todayStr;
          const mems = itemsByDate[c.dateStr] ?? [];
          const numColor = !c.inMonth
            ? "text-foreground/25"
            : isRed
              ? "text-sunday"
              : isBlue
                ? "text-saturday"
                : "text-foreground";

          return (
            <button
              key={c.dateStr + idx}
              onClick={() => setSheet({ mode: "view", date: c.dateStr })}
              style={{ animationDelay: `${idx * 8}ms` }}
              className={
                "animate-cal-fade-up relative flex min-h-0 flex-col items-center overflow-hidden rounded-2xl px-0.5 pt-1.5 text-center transition-colors " +
                (mems.length
                  ? "bg-accent-soft/20 hover:bg-accent-soft/30"
                  : "hover:bg-foreground/[0.04]")
              }
            >
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold " +
                  (isToday ? "bg-accent text-white" : numColor)
                }
              >
                {c.d}
              </span>
              {holiday && c.inMonth && (
                <span className="mt-0.5 w-full truncate px-0.5 text-[9px] font-medium leading-tight text-sunday">
                  {holiday}
                </span>
              )}
              {mems.length > 0 && mems.length < 4 && (
                <span className="mt-0.5 flex w-full flex-col gap-0.5 px-0.5">
                  {mems.map((m) => (
                    <span
                      key={m.id}
                      className="block w-full truncate rounded-md bg-accent-soft/50 px-1 py-0.5 text-left text-[9px] font-medium leading-tight text-foreground/80"
                    >
                      {m.title}
                    </span>
                  ))}
                </span>
              )}
              {mems.length >= 4 && (
                <span className="mt-1 inline-flex items-center gap-0.5 rounded-md bg-accent-soft/70 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  <CalendarDays size={11} strokeWidth={2.4} />
                  {mems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 시트 */}
      {sheet && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <button
            aria-label="닫기"
            onClick={() => setSheet(null)}
            className="animate-fade-in absolute inset-0 bg-foreground/25"
          />
          <div
            className={
              "animate-modal-in relative w-full max-w-md rounded-3xl border border-border bg-surface shadow-[0_20px_60px_rgba(42,38,34,0.18)] " +
              (sheet.mode === "create" ? "overflow-visible" : "overflow-hidden")
            }
          >
            <button
              aria-label="닫기"
              onClick={() => setSheet(null)}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <X size={18} />
            </button>
            <div
              className={
                "px-5 pb-6 pt-5 " +
                (sheet.mode === "create"
                  ? ""
                  : "modal-scroll max-h-[80dvh] overflow-y-auto")
              }
            >
            {sheet.mode === "view" ? (
              <>
                <div className="mb-4 flex items-baseline justify-between pr-9">
                  <h2 className="text-lg font-bold tracking-tight">
                    {formatDayHeading(sheet.date)}
                  </h2>
                  {sheetHoliday && (
                    <span className="text-sm font-semibold text-sunday">
                      {sheetHoliday}
                    </span>
                  )}
                </div>

                {sheetItems.length > 0 ? (
                  <div className="mb-4 space-y-3">
                    {sheetItems.map((it) => (
                      <FeedCard key={it.id} item={it} today={todayStr} />
                    ))}
                  </div>
                ) : (
                  <p className="mb-4 rounded-2xl border border-dashed border-border px-5 py-8 text-center text-muted">
                    이 날 박제된 추억이 없어요.
                  </p>
                )}

                <button
                  onClick={() => setSheet({ mode: "create", date: sheet.date })}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Plus size={20} strokeWidth={2.6} /> 이 날 등록
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2 pr-9">
                  <button
                    onClick={() =>
                      setSheet({ mode: "view", date: sheet.date })
                    }
                    aria-label="뒤로"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-lg font-bold tracking-tight">
                    {formatDayHeading(sheet.date)} 등록
                  </h2>
                </div>

                <form onSubmit={onCreate} className="space-y-3">
                  <input type="hidden" name="date" value={sheet.date} />
                  <input
                    name="title"
                    required
                    autoFocus
                    placeholder="제목 (예: 강릉 여행)"
                    className="h-12 w-full rounded-2xl border border-border bg-background px-4 outline-none focus:border-accent"
                  />
                  <PlaceAutocomplete />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-2xl bg-accent font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {submitting ? "박제 중…" : "박제하기"}
                  </button>
                </form>
              </>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
