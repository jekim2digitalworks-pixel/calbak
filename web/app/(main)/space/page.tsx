import { HardDriveUpload, CalendarCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/avatar";

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        "rounded-full px-2.5 py-1 text-xs font-medium " +
        (ok ? "bg-accent-soft/50 text-accent" : "bg-foreground/5 text-muted")
      }
    >
      {ok ? "연결됨" : "미연결"}
    </span>
  );
}

export default async function SpacePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = user?.user_metadata ?? {};
  const nickname = meta.full_name ?? meta.name ?? user?.email ?? "친구";
  const avatar = meta.avatar_url ?? meta.picture ?? null;

  const admin = createSupabaseAdminClient();
  const { data: conn } = user
    ? await admin
        .from("user_google_connections")
        .select("drive_connected, calendar_connected")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-md px-5 py-6">
      <header className="mb-6 flex items-center gap-4">
        <Avatar name={nickname} src={avatar} size={56} />
        <div>
          <h1 className="text-xl font-bold tracking-tight">{nickname}</h1>
          <p className="text-sm text-muted">{user?.email}</p>
        </div>
      </header>

      <p className="mb-3 rounded-2xl bg-accent-soft/25 px-4 py-3 text-sm leading-relaxed text-foreground/70">
        초대는 각 <b>일정 상세 화면</b>에서 만들어요. 일정마다 함께할 친구를 따로
        초대하고, 참가자를 관리할 수 있어요.
      </p>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">내 연동</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <HardDriveUpload size={20} className="text-accent" />
            <span className="flex-1 font-medium">구글 드라이브</span>
            <StatusPill ok={conn?.drive_connected ?? false} />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <CalendarCheck size={20} className="text-accent" />
            <span className="flex-1 font-medium">구글 캘린더</span>
            <StatusPill ok={conn?.calendar_connected ?? false} />
          </div>
        </div>
      </section>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="h-11 w-full rounded-2xl border border-border font-medium text-muted transition-colors hover:bg-foreground/5"
        >
          로그아웃
        </button>
      </form>
    </main>
  );
}
