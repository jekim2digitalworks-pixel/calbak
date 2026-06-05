import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { getGoogleAccessToken, fetchDriveFile } from "@/lib/google/drive";

/**
 * 사진 프록시 — 현재 사용자의 '본인 Drive 복사본'을 스트리밍한다(개발기획서 §5.3).
 * 공개 공유 없이 각자 자기 토큰으로 자기 복사본을 본다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: copy } = await admin
    .from("photo_drive_copies")
    .select("drive_file_id")
    .eq("photo_id", photoId)
    .eq("member_id", user.id)
    .eq("sync_status", "synced")
    .maybeSingle();
  if (!copy?.drive_file_id) return new Response("no copy", { status: 404 });

  const { data: conn } = await admin
    .from("user_google_connections")
    .select("refresh_token_enc")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn?.refresh_token_enc) return new Response("no token", { status: 403 });

  const accessToken = await getGoogleAccessToken(
    decryptToken(conn.refresh_token_enc),
  );
  const driveRes = await fetchDriveFile(accessToken, copy.drive_file_id);
  if (!driveRes.ok || !driveRes.body) {
    return new Response("drive error", { status: 502 });
  }

  return new Response(driveRes.body, {
    headers: {
      "Content-Type": driveRes.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
