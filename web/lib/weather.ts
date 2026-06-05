import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 날씨 박제 (개발기획서 §7). Open-Meteo (무료·키 불필요).
 * - 최근(~90일): Forecast API (아카이브는 며칠 지연)
 * - 그 이전: Archive API
 * 그날 실제 날씨를 1회 조회해 불변 스냅샷으로 저장.
 */

const SEOUL = { lat: 37.5665, lng: 126.978 };

// WMO weather code → 한국어
const WMO: Record<number, string> = {
  0: "맑음", 1: "대체로 맑음", 2: "부분 흐림", 3: "흐림",
  45: "안개", 48: "안개",
  51: "이슬비", 53: "이슬비", 55: "이슬비", 56: "언 이슬비", 57: "언 이슬비",
  61: "비", 63: "비", 65: "강한 비", 66: "언 비", 67: "언 비",
  71: "눈", 73: "눈", 75: "많은 눈", 77: "싸락눈",
  80: "소나기", 81: "소나기", 82: "강한 소나기", 85: "소낙눈", 86: "소낙눈",
  95: "뇌우", 96: "우박 뇌우", 99: "우박 뇌우",
};

const EMOJI: Record<string, string> = {
  맑음: "☀️", "대체로 맑음": "🌤️", "부분 흐림": "⛅", 흐림: "☁️",
  안개: "🌫️", 이슬비: "🌦️", "언 이슬비": "🌧️", 비: "🌧️", "강한 비": "🌧️",
  "언 비": "🌧️", 눈: "❄️", "많은 눈": "❄️", 싸락눈: "🌨️",
  소나기: "🌦️", "강한 소나기": "🌧️", 소낙눈: "🌨️", 뇌우: "⛈️", "우박 뇌우": "⛈️",
};

export function weatherEmoji(condition: string): string {
  return EMOJI[condition] ?? "🌡️";
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function geocode(place: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=ko`,
      { cache: "force-cache" },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      results?: { latitude: number; longitude: number }[];
    };
    const hit = j.results?.[0];
    return hit ? { lat: hit.latitude, lng: hit.longitude } : null;
  } catch {
    return null;
  }
}

async function fetchDay(
  lat: number,
  lng: number,
  date: string,
): Promise<{ temp: number; condition: string } | null> {
  const daysAgo = Math.round((Date.parse(kstToday()) - Date.parse(date)) / 86400000);
  const base =
    daysAgo <= 90
      ? "https://api.open-meteo.com/v1/forecast"
      : "https://archive-api.open-meteo.com/v1/archive";
  const url =
    `${base}?latitude=${lat}&longitude=${lng}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&timezone=Asia%2FSeoul&start_date=${date}&end_date=${date}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = (
      (await r.json()) as {
        daily?: {
          time?: string[];
          weathercode?: number[];
          temperature_2m_max?: (number | null)[];
          temperature_2m_min?: (number | null)[];
        };
      }
    ).daily;
    if (!d?.time?.length) return null;
    const code = d.weathercode?.[0] ?? 3;
    const tmax = d.temperature_2m_max?.[0];
    const tmin = d.temperature_2m_min?.[0];
    if (tmax == null && tmin == null) return null;
    const temp = Math.round(((tmax ?? tmin)! + (tmin ?? tmax)!) / 2);
    return { temp, condition: WMO[code] ?? "흐림" };
  } catch {
    return null;
  }
}

export type WeatherSnapshot = { temp: number; condition: string };

/**
 * 모임 날씨 스냅샷 보장(멱등). 미래 날짜면 null. 이미 있으면 그대로 반환.
 * 데이터가 아직 없으면(아카이브 지연 등) null → 다음 조회 때 재시도.
 */
export async function ensureWeatherSnapshot(memory: {
  id: string;
  date: string;
  place: string | null;
  place_lat: number | null;
  place_lng: number | null;
}): Promise<WeatherSnapshot | null> {
  if (memory.date > kstToday()) return null; // 미래

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("weather_snapshots")
    .select("temp, condition")
    .eq("memory_id", memory.id)
    .maybeSingle();
  if (existing)
    return { temp: existing.temp as number, condition: existing.condition as string };

  let lat = memory.place_lat;
  let lng = memory.place_lng;
  if ((lat == null || lng == null) && memory.place) {
    const g = await geocode(memory.place);
    if (g) {
      lat = g.lat;
      lng = g.lng;
    }
  }
  if (lat == null || lng == null) {
    lat = SEOUL.lat;
    lng = SEOUL.lng;
  }

  const w = await fetchDay(lat, lng, memory.date);
  if (!w) return null;

  await admin.from("weather_snapshots").insert({
    memory_id: memory.id,
    temp: w.temp,
    condition: w.condition,
    source: "open-meteo",
  });
  return w;
}
