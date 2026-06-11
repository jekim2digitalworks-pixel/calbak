import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyParticipants } from "@/lib/notifications";

export type Author = { nickname: string; avatar_url: string | null } | null;
export type Comment = {
  id: string;
  memory_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: Author;
};

/**
 * 모임의 댓글(오래된 순). RLS: 멤버만 조회.
 * 작성자 닉네임은 profiles RLS(본인만)를 우회해 admin으로 일괄 조회 후 매핑.
 */
export async function listComments(memoryId: string): Promise<Comment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, memory_id, author_id, content, created_at")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Omit<Comment, "author">[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.author_id))];
  const admin = createSupabaseAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", ids);
  const map = new Map(
    (profs ?? []).map((p) => [
      p.id as string,
      { nickname: p.nickname as string, avatar_url: p.avatar_url as string | null },
    ]),
  );

  return rows.map((r) => ({ ...r, author: map.get(r.author_id) ?? null }));
}

export async function addComment(
  memoryId: string,
  content: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { error } = await supabase.from("comments").insert({
    memory_id: memoryId,
    author_id: user.id,
    content,
  });
  if (error) throw error;

  // 새 댓글 알림(행위자 제외). 실패는 무시.
  try {
    await notifyParticipants(memoryId, user.id, "comment", content.slice(0, 60));
  } catch {
    /* 무시 */
  }
}
