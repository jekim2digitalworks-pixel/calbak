import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import {
  getGoogleAccessToken,
  ensureCalbakFolder,
  uploadPhotoToDrive,
  fetchDriveFile,
} from "@/lib/google/drive";

export type PhotoRow = {
  id: string;
  uploaded_by: string;
  created_at: string;
};

/** 모임의 사진 목록(논리 레코드). RLS: 멤버만. */
export async function listMemoryPhotos(memoryId: string): Promise<PhotoRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("photos")
    .select("id, uploaded_by, created_at")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });
  return (data ?? []) as PhotoRow[];
}

/**
 * 사진 멤버별 Drive 복제(팬아웃). 개발기획서 §5.
 * 1) 논리 photo 1건 생성
 * 2) 공간의 drive 연동 멤버 각각의 Drive로 복사본 업로드 → photo_drive_copies 기록
 * 미연동/실패 멤버는 sync_status로 표시(로그인 자체는 막지 않음).
 */
export async function replicatePhoto(input: {
  spaceId: string;
  memoryId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ photoId: string; synced: number; failed: number; skipped: number }> {
  const admin = createSupabaseAdminClient();

  const { data: photo, error } = await admin
    .from("photos")
    .insert({ memory_id: input.memoryId, uploaded_by: input.uploaderId })
    .select("id")
    .single();
  if (error) throw error;

  const { data: members } = await admin
    .from("space_members")
    .select("user_id")
    .eq("space_id", input.spaceId);

  let synced = 0,
    failed = 0,
    skipped = 0;

  for (const mem of members ?? []) {
    const { data: conn } = await admin
      .from("user_google_connections")
      .select("refresh_token_enc, drive_connected, drive_folder_id")
      .eq("user_id", mem.user_id)
      .maybeSingle();

    if (!conn?.drive_connected || !conn.refresh_token_enc) {
      await admin.from("photo_drive_copies").insert({
        photo_id: photo.id,
        member_id: mem.user_id,
        sync_status: "skipped",
      });
      skipped++;
      continue;
    }

    try {
      const accessToken = await getGoogleAccessToken(
        decryptToken(conn.refresh_token_enc),
      );
      const folderId = await ensureCalbakFolder(
        accessToken,
        conn.drive_folder_id ?? null,
      );
      if (folderId !== conn.drive_folder_id) {
        await admin
          .from("user_google_connections")
          .update({ drive_folder_id: folderId })
          .eq("user_id", mem.user_id);
      }
      const fileId = await uploadPhotoToDrive(
        accessToken,
        folderId,
        input.filename,
        input.mimeType,
        input.bytes,
      );
      await admin.from("photo_drive_copies").insert({
        photo_id: photo.id,
        member_id: mem.user_id,
        drive_file_id: fileId,
        sync_status: "synced",
      });
      synced++;
    } catch {
      await admin.from("photo_drive_copies").insert({
        photo_id: photo.id,
        member_id: mem.user_id,
        sync_status: "failed",
      });
      failed++;
    }
  }

  return { photoId: photo.id, synced, failed, skipped };
}

/**
 * 신규 참가자 백필(개발기획서 §5.3 / P4-4): 모임의 기존 사진들을 새 참가자의 Drive로 복제.
 * 원본 바이트는 저장 안 하므로, 기존 멤버의 synced 복사본에서 다운로드해 새 참가자 Drive로 업로드.
 * best-effort: 사진별 try/catch.
 */
export async function backfillMemoryPhotos(
  memoryId: string,
  memberId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: conn } = await admin
    .from("user_google_connections")
    .select("refresh_token_enc, drive_connected, drive_folder_id")
    .eq("user_id", memberId)
    .maybeSingle();
  if (!conn?.drive_connected || !conn.refresh_token_enc) return;

  const { data: photos } = await admin
    .from("photos")
    .select("id")
    .eq("memory_id", memoryId);
  if (!photos?.length) return;

  const { data: myCopies } = await admin
    .from("photo_drive_copies")
    .select("photo_id")
    .eq("member_id", memberId);
  const have = new Set((myCopies ?? []).map((c) => c.photo_id as string));

  const memberAccess = await getGoogleAccessToken(
    decryptToken(conn.refresh_token_enc),
  );
  const memberFolder = await ensureCalbakFolder(
    memberAccess,
    conn.drive_folder_id ?? null,
  );
  if (memberFolder !== conn.drive_folder_id) {
    await admin
      .from("user_google_connections")
      .update({ drive_folder_id: memberFolder })
      .eq("user_id", memberId);
  }

  for (const photo of photos) {
    if (have.has(photo.id as string)) continue;
    try {
      const { data: src } = await admin
        .from("photo_drive_copies")
        .select("member_id, drive_file_id")
        .eq("photo_id", photo.id)
        .eq("sync_status", "synced")
        .limit(1)
        .maybeSingle();
      if (!src?.drive_file_id) continue;

      const { data: srcConn } = await admin
        .from("user_google_connections")
        .select("refresh_token_enc")
        .eq("user_id", src.member_id)
        .maybeSingle();
      if (!srcConn?.refresh_token_enc) continue;

      const srcAccess = await getGoogleAccessToken(
        decryptToken(srcConn.refresh_token_enc),
      );
      const fileRes = await fetchDriveFile(srcAccess, src.drive_file_id);
      if (!fileRes.ok) continue;
      const bytes = Buffer.from(await fileRes.arrayBuffer());
      const mimeType = fileRes.headers.get("content-type") ?? "image/jpeg";

      const fileId = await uploadPhotoToDrive(
        memberAccess,
        memberFolder,
        `photo-${photo.id}.jpg`,
        mimeType,
        bytes,
      );
      await admin.from("photo_drive_copies").insert({
        photo_id: photo.id,
        member_id: memberId,
        drive_file_id: fileId,
        sync_status: "synced",
      });
    } catch {
      await admin.from("photo_drive_copies").insert({
        photo_id: photo.id,
        member_id: memberId,
        sync_status: "failed",
      });
    }
  }
}
