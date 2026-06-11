import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** 1:1 실시간 DM(의사결정 D11). 스레드는 정규화 쌍(user_a < user_b). */

export type DmMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** 두 사람의 스레드 보장(없으면 생성) → threadId. 생성은 service role. */
export async function getOrCreateThread(
  meId: string,
  friendId: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const [a, b] = pair(meId, friendId);
  const { data, error } = await admin
    .from("dm_threads")
    .upsert({ user_a: a, user_b: b }, { onConflict: "user_a,user_b" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** 스레드 메시지(오래된 순). RLS: 멤버만. */
export async function listMessages(threadId: string): Promise<DmMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("dm_messages")
    .select("id, thread_id, sender_id, content, created_at, read_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as DmMessage[];
}

/** 메시지 전송(보낸이=본인). RLS: 멤버만. */
export async function sendMessage(
  threadId: string,
  content: string,
): Promise<DmMessage | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({ thread_id: threadId, sender_id: user.id, content })
    .select("id, thread_id, sender_id, content, created_at, read_at")
    .single();
  if (error) throw error;
  return data as DmMessage;
}

/** 스레드 내 상대 메시지를 읽음 처리. */
export async function markThreadRead(threadId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("dm_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}
