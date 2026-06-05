import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultSpace, getMyDefaultSpace } from "@/lib/spaces";
import { listMyFeed } from "@/lib/feed";
import { getHolidayMap } from "@/lib/holidays";
import { MonthCalendar } from "@/components/month-calendar";

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 메인: 전체화면 월 캘린더 (날짜 탭 → 그날 피드카드 / 등록 모달)
// 내가 참가자인 모든 모임(내 일정 + 초대받은 일정)을 보여준다.
export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};
  const nickname = meta.full_name ?? meta.name ?? user?.email ?? "친구";
  if (user) await ensureDefaultSpace(user.id, nickname); // 생성용 공간 보장

  const space = await getMyDefaultSpace();
  const items = await listMyFeed();

  return (
    <MonthCalendar
      spaceName={space?.name ?? "내 캘박"}
      holidays={getHolidayMap()}
      items={items}
      todayStr={kstToday()}
    />
  );
}
