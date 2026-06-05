// 대한민국 공휴일 — 한국천문연구원 공식 데이터(@hyunbinseo/holidays-kr, 2018~2026).
// 음력 설날·추석 연휴 + 대체공휴일까지 정확.
import { y2024, y2025, y2026 } from "@hyunbinseo/holidays-kr";

// 패키지가 readonly 튜플로 타입을 노출 → 단순 읽기전용 레코드로 취급
const YEARS = [y2024, y2025, y2026] as unknown as Record<
  string,
  readonly string[]
>[];

/** 빨간날(공휴일)이 아닌 항목 — 달력에 휴일로 표시하지 않음 */
const NON_REST = new Set(["제헌절", "노동절"]);

export type HolidayMap = Record<string, string>; // 'YYYY-MM-DD' -> 표시 이름

/** 사람이 읽기 쉬운 짧은 이름으로 정리 */
function shortName(name: string): string {
  if (name.startsWith("대체공휴일")) return "대체공휴일";
  if (name.includes("설날")) return "설날";
  if (name.includes("추석")) return "추석";
  if (name === "1월 1일") return "신정";
  if (name === "기독탄신일") return "성탄절";
  if (name === "부처님 오신 날") return "부처님오신날";
  if (name.includes("지방선거") || name.includes("대통령선거")) return "선거일";
  return name.replace(/ㆍ/g, "·");
}

/** MVP에서 다루는 연도 범위의 공휴일 맵 */
export function getHolidayMap(): HolidayMap {
  const map: HolidayMap = {};
  for (const data of YEARS) {
    for (const [date, names] of Object.entries(data)) {
      const rest = names.filter((n) => !NON_REST.has(n));
      if (rest.length === 0) continue;
      map[date] = shortName(rest[0]);
    }
  }
  return map;
}
