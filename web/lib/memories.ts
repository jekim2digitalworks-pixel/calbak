import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type Memory = {
  id: string;
  space_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  place: string | null;
  place_lat: number | null;
  place_lng: number | null;
  created_by: string;
  created_at: string;
};

/** 단일 모임. RLS상 참가자 아니면 null. */
export async function getMemory(id: string): Promise<Memory | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Memory | null) ?? null;
}

/** 모임 생성 + 생성자를 host 참가자로 등록. */
export async function createMemory(input: {
  spaceId: string;
  title: string;
  date: string;
  place?: string | null;
  placeLat?: number | null;
  placeLng?: number | null;
}): Promise<Memory> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data, error } = await supabase
    .from("memories")
    .insert({
      space_id: input.spaceId,
      title: input.title,
      date: input.date,
      place: input.place ?? null,
      place_lat: input.placeLat ?? null,
      place_lng: input.placeLng ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;

  // 생성자 = host 참가자 (RLS상 클라 insert 정책이 없으므로 admin)
  const admin = createSupabaseAdminClient();
  await admin
    .from("memory_participants")
    .upsert(
      { memory_id: data.id, user_id: user.id, role: "host" },
      { onConflict: "memory_id,user_id" },
    );

  return data as Memory;
}

export async function updateMemory(
  id: string,
  patch: { title?: string; date?: string; place?: string | null },
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("memories").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw error;
}
