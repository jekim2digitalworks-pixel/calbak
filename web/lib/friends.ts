import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 친구 시스템(의사결정 D11). 추가는 개인 코드/링크/QR로(연락처 불필요).
 * friendships는 정규화 쌍(user_a < user_b)으로 1행만 저장.
 */

export type Friend = {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
};

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function genCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8);
}

/** 내 친구 코드 보장(없으면 생성). */
export async function ensureFriendCode(userId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("friend_code")
    .eq("id", userId)
    .maybeSingle();
  if (data?.friend_code) return data.friend_code as string;

  // 충돌 시 재시도(매우 드묾)
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const { error } = await admin
      .from("profiles")
      .update({ friend_code: code })
      .eq("id", userId);
    if (!error) return code;
  }
  throw new Error("친구 코드 생성 실패");
}

/** 친구 코드로 친구 추가(상호). 본인/이미 친구는 무시. 추가된 친구 프로필 반환. */
export async function addFriendByCode(
  code: string,
  meId: string,
): Promise<Friend | null> {
  const admin = createSupabaseAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .eq("friend_code", code)
    .maybeSingle();
  if (!target || target.id === meId) return null;

  const friendId = target.id as string;
  const [a, b] = pair(meId, friendId);
  await admin
    .from("friendships")
    .upsert({ user_a: a, user_b: b }, { onConflict: "user_a,user_b" });

  return {
    user_id: friendId,
    nickname: (target.nickname as string) ?? "친구",
    avatar_url: (target.avatar_url as string | null) ?? null,
  };
}

/** 친구 코드 주인 프로필(추가 화면 표시용). 본인이면 isSelf=true. */
export async function getFriendCodeOwner(
  code: string,
  meId: string | null,
): Promise<{ friend: Friend; isSelf: boolean; alreadyFriend: boolean } | null> {
  const admin = createSupabaseAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .eq("friend_code", code)
    .maybeSingle();
  if (!target) return null;

  const friend: Friend = {
    user_id: target.id as string,
    nickname: (target.nickname as string) ?? "친구",
    avatar_url: (target.avatar_url as string | null) ?? null,
  };
  const isSelf = meId === target.id;
  let alreadyFriend = false;
  if (meId && !isSelf) alreadyFriend = await areFriends(meId, target.id as string);
  return { friend, isSelf, alreadyFriend };
}

/** 내 친구 목록(닉네임 포함). */
export async function listFriends(): Promise<Friend[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  const friendIds = (rows ?? []).map((r) =>
    r.user_a === user.id ? (r.user_b as string) : (r.user_a as string),
  );
  if (!friendIds.length) return [];

  const admin = createSupabaseAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", friendIds);
  return (profs ?? []).map((p) => ({
    user_id: p.id as string,
    nickname: (p.nickname as string) ?? "친구",
    avatar_url: (p.avatar_url as string | null) ?? null,
  }));
}

/** 두 사용자가 친구인지. */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const [x, y] = pair(a, b);
  const { data } = await admin
    .from("friendships")
    .select("user_a")
    .eq("user_a", x)
    .eq("user_b", y)
    .maybeSingle();
  return !!data;
}
