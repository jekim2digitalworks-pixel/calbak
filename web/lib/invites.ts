import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addParticipant } from "@/lib/participants";
import { backfillMemoryPhotos } from "@/lib/photos";
import { pushMemoryToParticipant } from "@/lib/calendar-sync";

function genCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

/** 모임(일정) 단위 초대 코드 생성. */
export async function createInvite(
  memoryId: string,
  userId: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const code = genCode();
  const { data: mem } = await admin
    .from("memories")
    .select("space_id")
    .eq("id", memoryId)
    .maybeSingle();
  const { error } = await admin.from("invites").insert({
    memory_id: memoryId,
    space_id: mem?.space_id ?? null,
    code,
    created_by: userId,
  });
  if (error) throw error;
  return code;
}

export type InviteInfo = {
  code: string;
  memoryId: string;
  title: string;
  date: string;
  place: string | null;
  hostName: string;
  valid: boolean;
  alreadyParticipant: boolean;
};

export async function getInviteInfo(
  code: string,
  userId: string | null,
): Promise<InviteInfo | null> {
  const admin = createSupabaseAdminClient();
  const { data: inv } = await admin
    .from("invites")
    .select(
      "code, memory_id, expires_at, max_uses, used_count, memories(title, date, place, created_by)",
    )
    .eq("code", code)
    .maybeSingle();
  if (!inv || !inv.memory_id) return null;

  const mem = inv.memories as unknown as
    | { title: string; date: string; place: string | null; created_by: string }
    | null;
  if (!mem) return null;

  const { data: host } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", mem.created_by)
    .maybeSingle();

  const expired = inv.expires_at ? Date.parse(inv.expires_at) < Date.now() : false;
  const usedUp =
    inv.max_uses != null ? (inv.used_count as number) >= inv.max_uses : false;

  let alreadyParticipant = false;
  if (userId) {
    const { data } = await admin
      .from("memory_participants")
      .select("user_id")
      .eq("memory_id", inv.memory_id)
      .eq("user_id", userId)
      .maybeSingle();
    alreadyParticipant = !!data;
  }

  return {
    code,
    memoryId: inv.memory_id as string,
    title: mem.title,
    date: mem.date,
    place: mem.place,
    hostName: (host?.nickname as string) ?? "친구",
    valid: !expired && !usedUp,
    alreadyParticipant,
  };
}

export async function acceptInvite(
  code: string,
  userId: string,
): Promise<{ ok: boolean; memoryId?: string }> {
  const admin = createSupabaseAdminClient();
  const { data: inv } = await admin
    .from("invites")
    .select("memory_id, expires_at, max_uses, used_count")
    .eq("code", code)
    .maybeSingle();
  if (!inv || !inv.memory_id) return { ok: false };

  const expired = inv.expires_at ? Date.parse(inv.expires_at) < Date.now() : false;
  const usedUp =
    inv.max_uses != null ? (inv.used_count as number) >= inv.max_uses : false;
  if (expired || usedUp) return { ok: false };

  const memoryId = inv.memory_id as string;
  const { data: existing } = await admin
    .from("memory_participants")
    .select("user_id")
    .eq("memory_id", memoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await addParticipant(memoryId, userId, "guest");
    await admin
      .from("invites")
      .update({ used_count: ((inv.used_count as number) ?? 0) + 1 })
      .eq("code", code);
    try {
      await backfillMemoryPhotos(memoryId, userId);
    } catch {
      // 무시 — 다음 업로드부터 정상 팬아웃
    }
    try {
      await pushMemoryToParticipant(memoryId, userId);
    } catch {
      // 무시 — 캘린더 미연동/실패
    }
  }

  return { ok: true, memoryId };
}
