import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemory } from "@/lib/memories";
import { listMemoryPhotos } from "@/lib/photos";
import { listComments } from "@/lib/comments";
import { listParticipants } from "@/lib/participants";
import { listFriends } from "@/lib/friends";
import { ensureWeatherSnapshot, weatherEmoji } from "@/lib/weather";
import { deleteMemoryAction } from "@/app/actions/memories";
import { addCommentAction } from "@/app/actions/comments";
import { removeParticipantAction } from "@/app/actions/participants";
import { inviteFriendsToMemoryAction } from "@/app/actions/friends";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoImg } from "@/components/photo-img";
import { ShareInvite } from "@/components/share-invite";
import { Avatar } from "@/components/avatar";

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const wd = "일월화수목금토"[new Date(y, m - 1, day).getDay()];
  return `${y}년 ${m}월 ${day}일 ${wd}요일`;
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/landing");

  const memory = await getMemory(id);
  if (!memory) notFound();

  const [photos, comments, weather, participants, friends] = await Promise.all([
    listMemoryPhotos(id),
    listComments(id),
    ensureWeatherSnapshot(memory),
    listParticipants(id),
    listFriends(),
  ]);

  const isHost = participants.some(
    (p) => p.user_id === user.id && p.role === "host",
  );

  // 아직 참가자가 아닌 친구만 원탭 초대 대상
  const participantIds = new Set(participants.map((p) => p.user_id));
  const invitableFriends = friends.filter((f) => !participantIds.has(f.user_id));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-7">
      <Link href="/" className="mb-5 inline-block text-sm text-muted">
        ← 피드
      </Link>

      {/* 헤더 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-accent">
          {formatDate(memory.date)}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {memory.title}
        </h1>
        {memory.place && <p className="mt-1 text-muted">📍 {memory.place}</p>}
        {weather && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft/40 px-3 py-1.5 text-sm font-medium text-foreground/80">
            <span className="text-base">{weatherEmoji(weather.condition)}</span>
            {weather.is_approx ? "대략 " : "이날 "}
            {weather.temp}° {weather.condition}
          </span>
        )}
      </div>

      {/* 참가자 */}
      <section className="mb-7">
        <h2 className="mb-3 text-sm font-semibold text-muted">
          참가자 {participants.length}
        </h2>
        <ul className="space-y-2">
          {participants.map((p) => (
            <li
              key={p.user_id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5"
            >
              <Avatar name={p.nickname} src={p.avatar_url} size={36} />
              <span className="flex-1 font-medium">{p.nickname}</span>
              {p.role === "host" ? (
                <span className="rounded-full bg-accent-soft/50 px-2.5 py-1 text-xs font-medium text-accent">
                  호스트
                </span>
              ) : isHost ? (
                <form action={removeParticipantAction}>
                  <input type="hidden" name="memoryId" value={memory.id} />
                  <input type="hidden" name="userId" value={p.user_id} />
                  <button
                    type="submit"
                    aria-label="제외"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunday/10 hover:text-sunday"
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        {/* 친구 원탭 초대(호스트만) */}
        {isHost && invitableFriends.length > 0 && (
          <form
            action={inviteFriendsToMemoryAction}
            className="mt-3 rounded-2xl border border-border bg-surface p-3"
          >
            <input type="hidden" name="memoryId" value={memory.id} />
            <p className="mb-2 px-1 text-xs text-muted">
              친구를 골라 바로 초대하세요
            </p>
            <div className="flex flex-wrap gap-2">
              {invitableFriends.map((f) => (
                <label
                  key={f.user_id}
                  className="cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    name="friendId"
                    value={f.user_id}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white">
                    <Avatar name={f.nickname} src={f.avatar_url} size={22} />
                    {f.nickname}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-3 h-10 w-full rounded-xl bg-accent text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
            >
              선택한 친구 초대
            </button>
          </form>
        )}

        {/* 초대 링크(호스트만) — 친구가 아닌 사람에게 */}
        {isHost && (
          <div className="mt-3">
            <ShareInvite memoryId={memory.id} title={memory.title} />
          </div>
        )}
      </section>

      {/* 사진 */}
      <section className="mb-7">
        <h2 className="mb-3 text-sm font-semibold text-muted">사진</h2>
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {photos.map((p) => (
              <div
                key={p.id}
                className="aspect-square w-full overflow-hidden rounded-xl border border-border"
              >
                <PhotoImg id={p.id} />
              </div>
            ))}
          </div>
        )}
        <PhotoUploader memoryId={memory.id} />
      </section>

      {/* 댓글 */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">
          댓글 {comments.length > 0 && comments.length}
        </h2>
        {comments.length > 0 && (
          <ul className="mb-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">
                    {c.author?.nickname ?? "친구"}
                  </span>
                  <span className="text-[11px] text-muted">
                    {formatTime(c.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 leading-relaxed text-foreground/90">
                  {c.content}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form action={addCommentAction} className="flex gap-2">
          <input type="hidden" name="memoryId" value={memory.id} />
          <input
            name="content"
            required
            placeholder="이 날의 한마디…"
            className="h-11 flex-1 rounded-2xl border border-border bg-surface px-4 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="h-11 rounded-2xl bg-accent px-5 font-medium text-white transition-all duration-300 hover:-translate-y-0.5"
          >
            남기기
          </button>
        </form>
      </section>

      {/* 삭제(호스트만) */}
      {isHost && (
        <form action={deleteMemoryAction} className="mt-auto pt-6 text-center">
          <input type="hidden" name="id" value={memory.id} />
          <button
            type="submit"
            className="text-sm text-muted underline hover:text-sunday"
          >
            이 박제 삭제
          </button>
        </form>
      )}
    </main>
  );
}
