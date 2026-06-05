"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createMemory, deleteMemory } from "@/lib/memories";
import { getMyDefaultSpace } from "@/lib/spaces";
import {
  syncMemoryCalendar,
  removeMemoryCalendarAll,
} from "@/lib/calendar-sync";

/** 모임 박제(생성). 캘린더의 폼에서 호출. */
export async function createMemoryAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();
  const latRaw = String(formData.get("place_lat") ?? "").trim();
  const lngRaw = String(formData.get("place_lng") ?? "").trim();
  if (!title || !date) return;

  const space = await getMyDefaultSpace();
  if (!space) throw new Error("공간을 찾을 수 없습니다.");

  const mem = await createMemory({
    spaceId: space.id,
    title,
    date,
    place: place || null,
    placeLat: latRaw ? Number(latRaw) : null,
    placeLng: lngRaw ? Number(lngRaw) : null,
  });
  // 호스트(생성자) 구글 캘린더에 일정 푸시 (best-effort)
  try {
    await syncMemoryCalendar(mem.id);
  } catch {
    /* 캘린더 연동 실패해도 박제는 성립 */
  }
  revalidatePath("/calendar");
}

/** 모임 삭제 후 캘린더로 이동. 상세 화면에서 호출. */
export async function deleteMemoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    await removeMemoryCalendarAll(id);
  } catch {
    /* best-effort */
  }
  await deleteMemory(id);
  revalidatePath("/calendar");
  redirect("/calendar");
}
