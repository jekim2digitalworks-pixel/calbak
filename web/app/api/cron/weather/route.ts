import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureWeatherSnapshot } from "@/lib/weather";

/**
 * 날씨 배치(P5-2). Vercel Cron이 매일 호출.
 * 날짜가 지났는데 아직 날씨가 없는 모임들을 박제한다.
 * 보안: CRON_SECRET 설정 시 Authorization: Bearer 검증(Vercel Cron이 자동 첨부).
 */
function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const today = kstToday();

  const { data: mems } = await admin
    .from("memories")
    .select("id, date, place, place_lat, place_lng")
    .lte("date", today);
  const { data: snaps } = await admin
    .from("weather_snapshots")
    .select("memory_id");
  const have = new Set((snaps ?? []).map((s) => s.memory_id as string));

  let processed = 0;
  for (const m of mems ?? []) {
    if (have.has(m.id as string)) continue;
    const w = await ensureWeatherSnapshot({
      id: m.id as string,
      date: m.date as string,
      place: (m.place as string | null) ?? null,
      place_lat: (m.place_lat as number | null) ?? null,
      place_lng: (m.place_lng as number | null) ?? null,
    });
    if (w) processed++;
    if (processed >= 80) break; // 배치 상한
  }

  return Response.json({ ok: true, processed });
}
