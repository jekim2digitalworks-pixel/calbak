import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * B4(개선안): "1년 전 오늘" 회고. 박물관 컨셉의 핵심 — 과거 박제를 다시 꺼내본다.
 * 오늘과 같은 월·일(MM-DD)의 과거 모임 중, 내가 참가자인 것만.
 * 스키마 변경 없음(memories.date + RLS 참가자 정책 그대로 활용).
 */

export type OnThisDayItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  place: string | null;
  yearsAgo: number;
};

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function listOnThisDay(): Promise<OnThisDayItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = kstToday();
  const mmdd = today.slice(5); // MM-DD
  const thisYear = Number(today.slice(0, 4));

  // 내가 참가자인 과거 모임(최신 연도 먼저). 월-일 매칭은 JS에서.
  const { data } = await supabase
    .from("memories")
    .select("id, title, date, place, memory_participants!inner(user_id)")
    .eq("memory_participants.user_id", user.id)
    .lt("date", today)
    .order("date", { ascending: false });

  return (data ?? [])
    .filter((m) => (m.date as string).slice(5) === mmdd)
    .map((m) => ({
      id: m.id as string,
      title: m.title as string,
      date: m.date as string,
      place: (m.place as string | null) ?? null,
      yearsAgo: thisYear - Number((m.date as string).slice(0, 4)),
    }));
}
