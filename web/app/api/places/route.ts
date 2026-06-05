import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchPlaces } from "@/lib/places";

/** 장소 자동완성 검색 프록시 (로그인 필요). */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchPlaces(q);
  return Response.json({ results });
}
