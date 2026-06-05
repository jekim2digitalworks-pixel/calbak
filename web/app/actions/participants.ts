"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isHost, removeParticipant } from "@/lib/participants";

/** 참가자 제외(호스트만). */
export async function removeParticipantAction(formData: FormData) {
  const memoryId = String(formData.get("memoryId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!memoryId || !userId) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isHost(memoryId, user.id))) return;

  await removeParticipant(memoryId, userId);
  revalidatePath(`/memory/${memoryId}`);
}
