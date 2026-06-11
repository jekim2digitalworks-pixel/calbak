import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MyProfile = {
  id: string;
  nickname: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
};

/** 내 프로필(없는 값은 구글 메타/로그인 이메일로 폴백). */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("nickname, name, phone, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    nickname:
      (data?.nickname as string | undefined) ??
      meta.full_name ??
      meta.name ??
      user.email ??
      "친구",
    name:
      (data?.name as string | null | undefined) ??
      meta.full_name ??
      meta.name ??
      null,
    phone: (data?.phone as string | null | undefined) ?? null,
    email: (data?.email as string | null | undefined) ?? user.email ?? null,
    avatar_url:
      (data?.avatar_url as string | null | undefined) ??
      meta.avatar_url ??
      meta.picture ??
      null,
  };
}

/** 내 프로필 텍스트 필드 수정(본인만, RLS). */
export async function updateMyProfile(patch: {
  nickname?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const update: Record<string, unknown> = {};
  if (patch.nickname !== undefined) update.nickname = patch.nickname;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.email !== undefined) update.email = patch.email;
  if (!Object.keys(update).length) return;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) throw error;
}
