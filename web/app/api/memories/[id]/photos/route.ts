import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPhotoRecord, runFanout } from "@/lib/photos";

/**
 * 사진 업로드 → 멤버별 Drive 팬아웃 복제 (개발기획서 §5 / A1 비동기화).
 * 1) 논리 레코드 + 스테이징(원본 안전망) + pending 행 만들고 즉시 응답
 * 2) 실제 Drive 팬아웃은 after()로 응답 후 백그라운드 처리 (미완은 cron이 보강)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: memoryId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  // 멤버십 확인(RLS): 비참가자면 모임이 안 보임
  const { data: memory } = await supabase
    .from("memories")
    .select("id")
    .eq("id", memoryId)
    .maybeSingle();
  if (!memory) return new Response("not found", { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response("no file", { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return new Response("file too large", { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  try {
    const result = await createPhotoRecord({
      memoryId,
      uploaderId: user.id,
      filename: file.name || `photo-${Date.now()}.jpg`,
      mimeType,
      bytes,
    });

    // 스테이징 성공 시: 응답 후 백그라운드 팬아웃(메모리 바이트 재사용 → 재다운로드 회피)
    if (result.stagingOk) {
      after(() => runFanout(result.photoId, bytes, mimeType));
    }

    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, message: (e as Error).message },
      { status: 500 },
    );
  }
}
