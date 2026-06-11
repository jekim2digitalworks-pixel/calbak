import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * B5(개선안): 인앱 알림. 비동기 댓글/사진이 핵심인데 알림이 없으면 아무도 모름.
 * 생성(INSERT)은 service role 전용(RLS는 본인 select/update만 허용).
 */

export type NotificationType = "comment" | "photo" | "on_this_day" | "invite";

export type NotificationItem = {
  id: string;
  memory_id: string | null;
  actor_id: string | null;
  type: NotificationType;
  preview: string | null;
  read_at: string | null;
  created_at: string;
  actor: { nickname: string; avatar_url: string | null } | null;
  memory_title: string | null;
};

/** 모임 참가자(행위자 제외)에게 알림 생성. */
export async function notifyParticipants(
  memoryId: string,
  actorId: string,
  type: NotificationType,
  preview: string | null,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: parts } = await admin
    .from("memory_participants")
    .select("user_id")
    .eq("memory_id", memoryId);
  const rows = (parts ?? [])
    .map((p) => p.user_id as string)
    .filter((uid) => uid !== actorId)
    .map((uid) => ({
      user_id: uid,
      memory_id: memoryId,
      actor_id: actorId,
      type,
      preview,
    }));
  if (rows.length) await admin.from("notifications").insert(rows);
}

/** 특정 사용자 1명에게 알림 생성(예: 모임 초대). */
export async function notifyUser(
  userId: string,
  actorId: string,
  memoryId: string | null,
  type: NotificationType,
  preview: string | null,
): Promise<void> {
  if (userId === actorId) return;
  const admin = createSupabaseAdminClient();
  await admin.from("notifications").insert({
    user_id: userId,
    actor_id: actorId,
    memory_id: memoryId,
    type,
    preview,
  });
}

/** 미읽음 개수(본인). */
export async function unreadCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

/** 내 알림 목록(최신순). 행위자 닉네임/모임 제목은 admin으로 보강. */
export async function listMyNotifications(): Promise<NotificationItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, memory_id, actor_id, type, preview, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as Omit<
    NotificationItem,
    "actor" | "memory_title"
  >[];
  if (!rows.length) return [];

  const admin = createSupabaseAdminClient();
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)),
  ];
  const memIds = [
    ...new Set(rows.map((r) => r.memory_id).filter((x): x is string => !!x)),
  ];

  const [{ data: profs }, { data: mems }] = await Promise.all([
    actorIds.length
      ? admin.from("profiles").select("id, nickname, avatar_url").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string; avatar_url: string | null }[] }),
    memIds.length
      ? admin.from("memories").select("id, title").in("id", memIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const profMap = new Map(
    (profs ?? []).map((p) => [
      p.id as string,
      {
        nickname: p.nickname as string,
        avatar_url: p.avatar_url as string | null,
      },
    ]),
  );
  const memMap = new Map(
    (mems ?? []).map((m) => [m.id as string, m.title as string]),
  );

  return rows.map((r) => ({
    ...r,
    actor: r.actor_id ? profMap.get(r.actor_id) ?? null : null,
    memory_title: r.memory_id ? memMap.get(r.memory_id) ?? null : null,
  }));
}

/** 본인 미읽음 전체를 읽음 처리. */
export async function markAllRead(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}
