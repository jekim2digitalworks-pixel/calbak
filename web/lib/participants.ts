import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { removeMemoryEventForUser } from "@/lib/calendar-sync";

export type Participant = {
  user_id: string;
  role: string; // 'host' | 'guest'
  nickname: string;
  avatar_url: string | null;
};

/** 모임 참가자 목록(host 먼저). 닉네임은 admin으로 조회. */
export async function listParticipants(memoryId: string): Promise<Participant[]> {
  const admin = createSupabaseAdminClient();
  const { data: parts } = await admin
    .from("memory_participants")
    .select("user_id, role, joined_at")
    .eq("memory_id", memoryId)
    .order("joined_at", { ascending: true });
  const ids = (parts ?? []).map((p) => p.user_id as string);
  if (!ids.length) return [];

  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", ids);
  const m = new Map(
    (profs ?? []).map((p) => [
      p.id as string,
      { nickname: p.nickname as string, avatar_url: p.avatar_url as string | null },
    ]),
  );

  return (parts ?? [])
    .map((p) => ({
      user_id: p.user_id as string,
      role: p.role as string,
      nickname: m.get(p.user_id as string)?.nickname ?? "친구",
      avatar_url: m.get(p.user_id as string)?.avatar_url ?? null,
    }))
    .sort((a, b) => (a.role === "host" ? -1 : b.role === "host" ? 1 : 0));
}

export async function isHost(memoryId: string, userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("memory_participants")
    .select("role")
    .eq("memory_id", memoryId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "host";
}

export async function addParticipant(
  memoryId: string,
  userId: string,
  role = "guest",
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("memory_participants")
    .upsert(
      { memory_id: memoryId, user_id: userId, role },
      { onConflict: "memory_id,user_id" },
    );
}

/** 참가자 제외(host 제외 불가). 앱 내 사진 복사본 접근도 제거(물리 Drive 파일은 남음). */
export async function removeParticipant(
  memoryId: string,
  userId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("memory_participants")
    .delete()
    .eq("memory_id", memoryId)
    .eq("user_id", userId)
    .neq("role", "host");

  const { data: photos } = await admin
    .from("photos")
    .select("id")
    .eq("memory_id", memoryId);
  const pids = (photos ?? []).map((p) => p.id as string);
  if (pids.length) {
    await admin
      .from("photo_drive_copies")
      .delete()
      .eq("member_id", userId)
      .in("photo_id", pids);
  }

  // 제외된 참가자의 구글 캘린더 일정도 제거 (best-effort)
  try {
    await removeMemoryEventForUser(memoryId, userId);
  } catch {
    /* 무시 */
  }
}
