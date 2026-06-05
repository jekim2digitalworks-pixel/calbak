import { createSupabaseServerClient } from "@/lib/supabase/server";
import { replicatePhoto } from "@/lib/photos";

/** 사진 업로드 → 멤버별 Drive 팬아웃 복제 (개발기획서 §5). */
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

  // 멤버십 확인(RLS): 비멤버면 모임이 안 보임
  const { data: memory } = await supabase
    .from("memories")
    .select("id, space_id")
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
  try {
    const result = await replicatePhoto({
      spaceId: memory.space_id as string,
      memoryId,
      uploaderId: user.id,
      filename: file.name || `photo-${Date.now()}.jpg`,
      mimeType: file.type || "image/jpeg",
      bytes,
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, message: (e as Error).message },
      { status: 500 },
    );
  }
}
