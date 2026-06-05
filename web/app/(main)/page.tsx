import { redirect } from "next/navigation";

// 피드 탭은 숨김 — 메인은 캘린더. (피드 카드는 날짜 탭 시 그날 단위로 노출)
export default function Home() {
  redirect("/calendar");
}
