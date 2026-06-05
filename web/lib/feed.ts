import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FeedItem = {
  id: string;
  title: string;
  date: string;
  place: string | null;
  author: { nickname: string; avatar_url: string | null } | null;
  photoIds: string[]; // 미리보기용 최대 4
  photoCount: number;
  commentCount: number;
};

/** 내가 참가자인 모든 모임(최신순). 사진·댓글 수, 작성자 포함. */
export async function listMyFeed(): Promise<FeedItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: mems } = await supabase
    .from("memories")
    .select(
      "id, title, date, place, created_by, memory_participants!inner(user_id)",
    )
    .eq("memory_participants.user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (!mems?.length) return [];

  const ids = mems.map((m) => m.id as string);

  const [{ data: photos }, { data: comments }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, memory_id, created_at")
      .in("memory_id", ids)
      .order("created_at", { ascending: true }),
    supabase.from("comments").select("memory_id").in("memory_id", ids),
  ]);

  const admin = createSupabaseAdminClient();
  const authorIds = [...new Set(mems.map((m) => m.created_by as string))];
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", authorIds);
  const profMap = new Map(
    (profs ?? []).map((p) => [
      p.id as string,
      {
        nickname: p.nickname as string,
        avatar_url: p.avatar_url as string | null,
      },
    ]),
  );

  const photosByMem = new Map<string, string[]>();
  for (const p of photos ?? []) {
    const arr = photosByMem.get(p.memory_id as string) ?? [];
    arr.push(p.id as string);
    photosByMem.set(p.memory_id as string, arr);
  }
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) {
    const k = c.memory_id as string;
    commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
  }

  return mems.map((m) => {
    const pics = photosByMem.get(m.id as string) ?? [];
    return {
      id: m.id as string,
      title: m.title as string,
      date: m.date as string,
      place: (m.place as string | null) ?? null,
      author: profMap.get(m.created_by as string) ?? null,
      photoIds: pics.slice(0, 4),
      photoCount: pics.length,
      commentCount: commentCount.get(m.id as string) ?? 0,
    };
  });
}
