import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { getGoogleAccessToken } from "@/lib/google/drive";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalEvent,
} from "@/lib/google/calendar";

const APP_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

/** calendar_connected 멤버의 access token (없으면 null). */
async function memberCalToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data: conn } = await admin
    .from("user_google_connections")
    .select("refresh_token_enc, calendar_connected")
    .eq("user_id", userId)
    .maybeSingle();
  if (!conn?.calendar_connected || !conn.refresh_token_enc) return null;
  try {
    return await getGoogleAccessToken(decryptToken(conn.refresh_token_enc));
  } catch {
    return null;
  }
}

async function eventFor(memoryId: string): Promise<CalEvent | null> {
  const admin = createSupabaseAdminClient();
  const { data: mem } = await admin
    .from("memories")
    .select("title, date, place")
    .eq("id", memoryId)
    .maybeSingle();
  if (!mem) return null;
  return {
    summary: mem.title as string,
    location: (mem.place as string | null) ?? null,
    description: `캘박에서 박제한 일정\n${APP_URL}/memory/${memoryId}`,
    date: mem.date as string,
  };
}

/** 한 참가자의 캘린더에 일정 생성/갱신. best-effort. */
export async function pushMemoryToParticipant(
  memoryId: string,
  userId: string,
): Promise<void> {
  const e = await eventFor(memoryId);
  if (!e) return;
  const token = await memberCalToken(userId);
  if (!token) return;

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("memory_calendar_events")
    .select("google_event_id")
    .eq("memory_id", memoryId)
    .eq("member_id", userId)
    .maybeSingle();

  try {
    if (row?.google_event_id) {
      const ok = await updateCalendarEvent(token, row.google_event_id, e);
      await admin
        .from("memory_calendar_events")
        .update({ sync_status: ok ? "synced" : "failed" })
        .eq("memory_id", memoryId)
        .eq("member_id", userId);
    } else {
      const id = await createCalendarEvent(token, e);
      await admin.from("memory_calendar_events").upsert(
        {
          memory_id: memoryId,
          member_id: userId,
          google_event_id: id,
          sync_status: id ? "synced" : "failed",
        },
        { onConflict: "memory_id,member_id" },
      );
    }
  } catch {
    await admin.from("memory_calendar_events").upsert(
      { memory_id: memoryId, member_id: userId, sync_status: "failed" },
      { onConflict: "memory_id,member_id" },
    );
  }
}

/** 모든 참가자 캘린더에 동기화(생성/갱신). */
export async function syncMemoryCalendar(memoryId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: parts } = await admin
    .from("memory_participants")
    .select("user_id")
    .eq("memory_id", memoryId);
  for (const p of parts ?? []) {
    await pushMemoryToParticipant(memoryId, p.user_id as string);
  }
}

/** 한 참가자의 일정 제거(제외 시). */
export async function removeMemoryEventForUser(
  memoryId: string,
  userId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("memory_calendar_events")
    .select("google_event_id")
    .eq("memory_id", memoryId)
    .eq("member_id", userId)
    .maybeSingle();
  if (row?.google_event_id) {
    const token = await memberCalToken(userId);
    if (token) {
      try {
        await deleteCalendarEvent(token, row.google_event_id);
      } catch {
        /* best-effort */
      }
    }
  }
  await admin
    .from("memory_calendar_events")
    .delete()
    .eq("memory_id", memoryId)
    .eq("member_id", userId);
}

/** 모임 삭제 시 모든 참가자 일정 제거. */
export async function removeMemoryCalendarAll(memoryId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: rows } = await admin
    .from("memory_calendar_events")
    .select("member_id, google_event_id")
    .eq("memory_id", memoryId);
  for (const r of rows ?? []) {
    if (r.google_event_id) {
      const token = await memberCalToken(r.member_id as string);
      if (token) {
        try {
          await deleteCalendarEvent(token, r.google_event_id as string);
        } catch {
          /* best-effort */
        }
      }
    }
  }
  await admin
    .from("memory_calendar_events")
    .delete()
    .eq("memory_id", memoryId);
}
