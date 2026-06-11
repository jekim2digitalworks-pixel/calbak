import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** 프로필 이미지 업로드 → Supabase Storage(public 'avatars') → profiles.avatar_url 갱신. */
const BUCKET = "avatars";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return new Response("no file", { status: 400 });
  if (!file.type.startsWith("image/"))
    return new Response("not an image", { status: 400 });
  if (file.size > 5 * 1024 * 1024)
    return new Response("file too large", { status: 413 });

  const admin = createSupabaseAdminClient();
  // 버킷 보장(public). 이미 있으면 무시.
  await admin.storage
    .createBucket(BUCKET, { public: true })
    .catch(() => undefined);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const path = `${user.id}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error)
    return Response.json({ ok: false, message: error.message }, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  await admin
    .from("profiles")
    .update({ avatar_url: pub.publicUrl })
    .eq("id", user.id);

  return Response.json({ ok: true, url: pub.publicUrl });
}
