import Link from "next/link";
import { Bell } from "lucide-react";
import {
  listMyNotifications,
  markAllRead,
  type NotificationItem,
} from "@/lib/notifications";
import { Avatar } from "@/components/avatar";

function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function describe(n: NotificationItem): string {
  const who = n.actor?.nickname ?? "친구";
  const where = n.memory_title ? `'${n.memory_title}'` : "박제";
  if (n.type === "comment") return `${who} 님이 ${where}에 댓글을 남겼어요`;
  if (n.type === "photo") return `${who} 님이 ${where}에 사진을 올렸어요`;
  if (n.type === "invite") return `${who} 님이 ${where}에 초대했어요`;
  if (n.type === "on_this_day") return `${where} — 그날의 기억`;
  return `${who} 님의 새 소식`;
}

export default async function NotificationsPage() {
  const items = await listMyNotifications();
  // 목록을 가져온 뒤 읽음 처리(렌더에는 미읽음 강조 유지, 배지는 곧 0).
  await markAllRead();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-7">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">알림</h1>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-muted">
          <Bell size={36} strokeWidth={1.6} className="opacity-50" />
          <p>아직 알림이 없어요.</p>
          <p className="text-sm">친구가 사진이나 댓글을 남기면 여기에 떠요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div
                className={
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors " +
                  (n.read_at
                    ? "border-border bg-surface"
                    : "border-accent/30 bg-accent-soft/20")
                }
              >
                <Avatar
                  name={n.actor?.nickname ?? "친구"}
                  src={n.actor?.avatar_url ?? null}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground/90">
                    {describe(n)}
                  </p>
                  {n.preview && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      “{n.preview}”
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            );
            return (
              <li key={n.id}>
                {n.memory_id ? (
                  <Link href={`/memory/${n.memory_id}`}>{body}</Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
