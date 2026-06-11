import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { notifyParticipants } from "@/lib/notifications";
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

/** A1(개선안): 원본 안전망용 Storage 버킷(비공개). 전원 synced 시 삭제 → 평상시 상주 0. */
const STAGING_BUCKET = "photo-staging";

/** Supabase Storage 임시 버킷 보장(멱등). 이미 있으면 무시. */
async function ensureStagingBucket(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<void> {
  await admin.storage
    .createBucket(STAGING_BUCKET, { public: false })
    .catch(() => undefined);
}

/** Drive/토큰 에러 → 영구(quota/auth) vs 일시(other) 분류. */
function classifyError(e: unknown): "quota" | "auth" | "other" {
  const msg = (e as Error)?.message ?? "";
  if (/storageQuotaExceeded|quotaExceeded/i.test(msg)) return "quota";
  if (/invalid_grant|access token 갱신 실패|\b401\b|unauthorized/i.test(msg))
    return "auth";
  return "other";
}

/** 모임의 사진 목록(논리 레코드). RLS: 참가자만. */
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
 * 사진 업로드 1단계(동기): 논리 레코드 + 원본 스테이징 + 참가자별 pending 행.
 * 응답을 빠르게 돌려주고, 실제 Drive 팬아웃은 runFanout(백그라운드)이 수행한다.
 * 원본을 Storage에 보관하므로, 팬아웃이 전부 실패해도 사진이 소실되지 않는다(영속 안전망).
 */
export async function createPhotoRecord(input: {
  memoryId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ photoId: string; queued: number; stagingOk: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: photo, error } = await admin
    .from("photos")
    .insert({ memory_id: input.memoryId, uploaded_by: input.uploaderId })
    .select("id")
    .single();
  if (error) throw error;
  const photoId = photo.id as string;

  // 원본을 스테이징에 저장(안전망 + 팬아웃 원천)
  let stagingOk = false;
  const stagingPath = `${photoId}/${input.filename}`;
  try {
    await ensureStagingBucket(admin);
    const { error: upErr } = await admin.storage
      .from(STAGING_BUCKET)
      .upload(stagingPath, input.bytes, {
        contentType: input.mimeType,
        upsert: true,
      });
    if (!upErr) {
      stagingOk = true;
      await admin.from("photos").update({ staging_path: stagingPath }).eq("id", photoId);
    }
  } catch {
    // 스테이징 실패해도 진행(아래 즉시 팬아웃이 메모리 바이트로 시도)
  }

  // 참가자별 pending 복사본
  const { data: parts } = await admin
    .from("memory_participants")
    .select("user_id")
    .eq("memory_id", input.memoryId);
  const memberIds = (parts ?? []).map((p) => p.user_id as string);
  if (memberIds.length) {
    await admin.from("photo_drive_copies").upsert(
      memberIds.map((uid) => ({
        photo_id: photoId,
        member_id: uid,
        sync_status: "pending",
      })),
      { onConflict: "photo_id,member_id" },
    );
  }

  // 새 사진 알림(행위자 제외)
  try {
    await notifyParticipants(input.memoryId, input.uploaderId, "photo", null);
  } catch {
    /* 알림 실패는 무시 */
  }

  // 스테이징이 안 됐다면, 사라지기 전에 메모리 바이트로 즉시 1차 팬아웃 시도
  if (!stagingOk) {
    await runFanout(photoId, input.bytes, input.mimeType);
  }

  return { photoId, queued: memberIds.length, stagingOk };
}

/**
 * 팬아웃(백그라운드/재시도 공용). pending·재시도가능(failed+other) 복사본을 Drive로 업로드.
 * srcBytes 가 주어지면 그것을, 없으면 스테이징에서 원본을 내려받아 사용.
 */
export async function runFanout(
  photoId: string,
  srcBytes?: Buffer,
  srcMime?: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: photo } = await admin
    .from("photos")
    .select("id, memory_id, staging_path, fanout_done")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo || photo.fanout_done) return;

  // 처리 대상: pending 또는 재시도 가능한 failed(other)
  const { data: copies } = await admin
    .from("photo_drive_copies")
    .select("member_id, sync_status, error_code")
    .eq("photo_id", photoId);
  const targets = (copies ?? []).filter(
    (c) =>
      c.sync_status === "pending" ||
      (c.sync_status === "failed" && (c.error_code ?? "other") === "other"),
  );
  if (!targets.length) {
    await finalizeFanout(admin, photoId, photo.staging_path as string | null);
    return;
  }

  // 원본 바이트 확보
  let bytes = srcBytes ?? null;
  let mime = srcMime ?? "image/jpeg";
  if (!bytes && photo.staging_path) {
    try {
      const { data: blob } = await admin.storage
        .from(STAGING_BUCKET)
        .download(photo.staging_path as string);
      if (blob) {
        bytes = Buffer.from(await blob.arrayBuffer());
        mime = blob.type || mime;
      }
    } catch {
      /* 다운로드 실패 → 이번엔 못함, 다음 cron 재시도 */
    }
  }
  if (!bytes) return; // 원천 없음 → 종료(스테이징 복구 전까지 보류)

  const filename = `photo-${photoId}.jpg`;

  for (const t of targets) {
    const memberId = t.member_id as string;
    const { data: conn } = await admin
      .from("user_google_connections")
      .select("refresh_token_enc, drive_connected, drive_folder_id")
      .eq("user_id", memberId)
      .maybeSingle();

    if (!conn?.drive_connected || !conn.refresh_token_enc) {
      await admin
        .from("photo_drive_copies")
        .update({ sync_status: "skipped", updated_at: new Date().toISOString() })
        .eq("photo_id", photoId)
        .eq("member_id", memberId);
      continue;
    }

    try {
      const accessToken = await getGoogleAccessToken(decryptToken(conn.refresh_token_enc));
      const folderId = await ensureCalbakFolder(accessToken, conn.drive_folder_id ?? null);
      if (folderId !== conn.drive_folder_id) {
        await admin
          .from("user_google_connections")
          .update({ drive_folder_id: folderId })
          .eq("user_id", memberId);
      }
      const fileId = await uploadPhotoToDrive(accessToken, folderId, filename, mime, bytes);
      await admin
        .from("photo_drive_copies")
        .update({
          drive_file_id: fileId,
          sync_status: "synced",
          error_code: null,
          attempts: ((t as { attempts?: number }).attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("photo_id", photoId)
        .eq("member_id", memberId);
    } catch (e) {
      await admin
        .from("photo_drive_copies")
        .update({
          sync_status: "failed",
          error_code: classifyError(e),
          updated_at: new Date().toISOString(),
        })
        .eq("photo_id", photoId)
        .eq("member_id", memberId);
    }
  }

  await finalizeFanout(admin, photoId, photo.staging_path as string | null);
}

/**
 * 팬아웃 마무리: 더 할 일(pending/재시도가능 failed)이 없으면 fanout_done.
 * 단, synced 복사본이 하나라도 있을 때만 스테이징 원본을 삭제(안전망 유지).
 * synced 0개(전원 미연동 등)면 스테이징을 남겨 사진을 살린다.
 */
async function finalizeFanout(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  photoId: string,
  stagingPath: string | null,
): Promise<void> {
  const { data: copies } = await admin
    .from("photo_drive_copies")
    .select("sync_status, error_code")
    .eq("photo_id", photoId);
  const rows = copies ?? [];
  const pending = rows.some(
    (c) =>
      c.sync_status === "pending" ||
      (c.sync_status === "failed" && (c.error_code ?? "other") === "other"),
  );
  if (pending) return; // 아직 재시도할 게 남음

  const hasSynced = rows.some((c) => c.sync_status === "synced");
  await admin.from("photos").update({ fanout_done: true }).eq("id", photoId);
  if (hasSynced && stagingPath) {
    await admin.storage.from(STAGING_BUCKET).remove([stagingPath]).catch(() => undefined);
    await admin.from("photos").update({ staging_path: null }).eq("id", photoId);
  }
}

/** Cron(P4-6): 미완 팬아웃 재시도. quota/auth는 사용자 조치 전까지 자동 skip(무한 재시도 방지). */
export async function retryPendingFanouts(limit = 30): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data: photos } = await admin
    .from("photos")
    .select("id")
    .eq("fanout_done", false)
    .not("staging_path", "is", null)
    .limit(limit);
  let processed = 0;
  for (const p of photos ?? []) {
    await runFanout(p.id as string);
    processed++;
  }
  return processed;
}

/**
 * 신규 참가자 백필(개발기획서 §5.3 / P4-4): 모임의 기존 사진들을 새 참가자 Drive로 복제.
 * 원천 우선순위: 기존 멤버의 synced Drive 복사본 → 없으면 스테이징 원본(A1 안전망).
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
    .select("id, staging_path")
    .eq("memory_id", memoryId);
  if (!photos?.length) return;

  const { data: myCopies } = await admin
    .from("photo_drive_copies")
    .select("photo_id, sync_status")
    .eq("member_id", memberId);
  const have = new Set(
    (myCopies ?? [])
      .filter((c) => c.sync_status === "synced")
      .map((c) => c.photo_id as string),
  );

  const memberAccess = await getGoogleAccessToken(decryptToken(conn.refresh_token_enc));
  const memberFolder = await ensureCalbakFolder(memberAccess, conn.drive_folder_id ?? null);
  if (memberFolder !== conn.drive_folder_id) {
    await admin
      .from("user_google_connections")
      .update({ drive_folder_id: memberFolder })
      .eq("user_id", memberId);
  }

  for (const photo of photos) {
    const pid = photo.id as string;
    if (have.has(pid)) continue;
    try {
      let bytes: Buffer | null = null;
      let mime = "image/jpeg";

      // 1순위: 기존 멤버의 synced Drive 복사본
      const { data: src } = await admin
        .from("photo_drive_copies")
        .select("member_id, drive_file_id")
        .eq("photo_id", pid)
        .eq("sync_status", "synced")
        .limit(1)
        .maybeSingle();
      if (src?.drive_file_id) {
        const { data: srcConn } = await admin
          .from("user_google_connections")
          .select("refresh_token_enc")
          .eq("user_id", src.member_id)
          .maybeSingle();
        if (srcConn?.refresh_token_enc) {
          const srcAccess = await getGoogleAccessToken(decryptToken(srcConn.refresh_token_enc));
          const fileRes = await fetchDriveFile(srcAccess, src.drive_file_id as string);
          if (fileRes.ok) {
            bytes = Buffer.from(await fileRes.arrayBuffer());
            mime = fileRes.headers.get("content-type") ?? mime;
          }
        }
      }
      // 2순위: 스테이징 원본
      if (!bytes && photo.staging_path) {
        const { data: blob } = await admin.storage
          .from(STAGING_BUCKET)
          .download(photo.staging_path as string);
        if (blob) {
          bytes = Buffer.from(await blob.arrayBuffer());
          mime = blob.type || mime;
        }
      }
      if (!bytes) continue;

      const fileId = await uploadPhotoToDrive(
        memberAccess,
        memberFolder,
        `photo-${pid}.jpg`,
        mime,
        bytes,
      );
      await admin.from("photo_drive_copies").upsert(
        {
          photo_id: pid,
          member_id: memberId,
          drive_file_id: fileId,
          sync_status: "synced",
          error_code: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "photo_id,member_id" },
      );
    } catch (e) {
      await admin.from("photo_drive_copies").upsert(
        {
          photo_id: pid,
          member_id: memberId,
          sync_status: "failed",
          error_code: classifyError(e),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "photo_id,member_id" },
      );
    }
  }
}
