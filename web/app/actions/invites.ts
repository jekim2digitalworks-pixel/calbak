"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvite, acceptInvite } from "@/lib/invites";
import { isHost } from "@/lib/participants";

/** 모임 초대 코드 생성(호스트만) → 코드 반환(클라이언트가 origin과 합쳐 링크 구성) */
export async function createInviteAction(
  memoryId: string,
): Promise<{ code: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };
  if (!(await isHost(memoryId, user.id))) return { error: "not_host" };
  const code = await createInvite(memoryId, user.id);
  return { code };
}

/** 초대 수락 → 모임 참가자 + 백필 → 해당 모임으로 */
export async function acceptInviteAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/invite/${code}`);
  const res = await acceptInvite(code, user.id);
  redirect(res.memoryId ? `/memory/${res.memoryId}` : "/calendar");
}
