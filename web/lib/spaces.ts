import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type Space = { id: string; name: string };

/**
 * 사용자가 멤버인 공간이 없으면 기본 공간("…님의 캘박")을 생성하고 owner 멤버십을 부여.
 * 멱등: 이미 멤버면 그 공간 id 반환.
 * space_members INSERT는 RLS상 막혀 있으므로 admin(service role)로 수행. (개발기획서 §8)
 */
export async function ensureDefaultSpace(
  userId: string,
  nickname: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("space_members")
    .select("space_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.space_id as string;

  const { data: space, error } = await admin
    .from("spaces")
    .insert({ name: `${nickname}님의 캘박`, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;

  const { error: memErr } = await admin
    .from("space_members")
    .insert({ space_id: space.id, user_id: userId, role: "owner" });
  if (memErr) throw memErr;

  return space.id as string;
}

/** 현재 로그인 사용자의 기본(가장 먼저 가입한) 공간. RLS 적용. */
export async function getMyDefaultSpace(): Promise<Space | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 가장 최근 합류한 공간을 '현재 공간'으로 (초대로 합류한 친구는 공유 공간을 보게 됨)
  const { data } = await supabase
    .from("space_members")
    .select("spaces!inner(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const space = (data as { spaces?: Space } | null)?.spaces;
  return space ?? null;
}
