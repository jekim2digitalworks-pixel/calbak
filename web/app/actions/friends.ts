"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addFriendByCode } from "@/lib/friends";
import { isHost, addParticipant } from "@/lib/participants";
import { backfillMemoryPhotos } from "@/lib/photos";
import { pushMemoryToParticipant } from "@/lib/calendar-sync";
import { notifyUser } from "@/lib/notifications";

/** 개인 코드로 친구 추가 → 친구 목록으로. (로그아웃이면 로그인으로) */
export async function addFriendAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/friends");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/add/${code}`);
  await addFriendByCode(code, user.id);
  redirect("/friends");
}

/** 친구 목록에서 모임에 원탭 초대(호스트만). 참가자 추가+사진 백필+GCal+알림. */
export async function inviteFriendsToMemoryAction(formData: FormData) {
  const memoryId = String(formData.get("memoryId") ?? "").trim();
  const friendIds = formData.getAll("friendId").map((v) => String(v));
  if (!memoryId || !friendIds.length) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isHost(memoryId, user.id))) return;

  const { data: mem } = await supabase
    .from("memories")
    .select("title")
    .eq("id", memoryId)
    .maybeSingle();
  const title = (mem?.title as string | undefined) ?? null;

  for (const fid of friendIds) {
    await addParticipant(memoryId, fid, "guest");
    try {
      await backfillMemoryPhotos(memoryId, fid);
    } catch {
      /* 다음 업로드부터 정상 팬아웃 */
    }
    try {
      await pushMemoryToParticipant(memoryId, fid);
    } catch {
      /* 캘린더 미연동/실패 */
    }
    try {
      await notifyUser(fid, user.id, memoryId, "invite", title);
    } catch {
      /* 알림 실패 무시 */
    }
  }

  revalidatePath(`/memory/${memoryId}`);
}
