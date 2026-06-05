import "server-only";

/**
 * Google Calendar 푸시 (개발기획서 §6). calendar.events 스코프 — 앱이 만든 일정만.
 * 모임은 날짜 기반이므로 '종일 이벤트'로 등록한다.
 */

const CAL_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type CalEvent = {
  summary: string;
  location?: string | null;
  description?: string;
  date: string; // YYYY-MM-DD (종일)
};

function buildBody(e: CalEvent) {
  // 종일 이벤트의 end.date는 배타적(exclusive) → 다음 날
  const end = new Date(e.date + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    summary: e.summary,
    location: e.location || undefined,
    description: e.description,
    start: { date: e.date },
    end: { date: end.toISOString().slice(0, 10) },
  };
}

export async function createCalendarEvent(
  accessToken: string,
  e: CalEvent,
): Promise<string | null> {
  const r = await fetch(CAL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(e)),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { id?: string };
  return j.id ?? null;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  e: CalEvent,
): Promise<boolean> {
  const r = await fetch(`${CAL_API}/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(e)),
  });
  return r.ok;
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<boolean> {
  const r = await fetch(`${CAL_API}/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return r.ok || r.status === 410; // 410 = 이미 삭제됨
}
