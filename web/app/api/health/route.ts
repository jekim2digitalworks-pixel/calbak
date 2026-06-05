import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 배선 점검용 헬스 라우트. Supabase 연결 + 스키마 적용 여부를 확인한다.
 * (P1 이후 인증이 붙으면 이 라우트는 제거하거나 보호한다.)
 */
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("spaces")
      .select("*", { count: "exact", head: true });

    if (error) {
      return Response.json(
        { ok: false, db: "error", message: error.message },
        { status: 500 },
      );
    }
    return Response.json({ ok: true, db: "connected", spacesCount: count ?? 0 });
  } catch (e) {
    return Response.json(
      { ok: false, db: "exception", message: (e as Error).message },
      { status: 500 },
    );
  }
}
