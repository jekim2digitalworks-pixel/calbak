import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function StatusRow({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <span
        className={
          "rounded-full px-3 py-1 text-xs font-medium " +
          (ok
            ? "bg-accent-soft/50 text-accent"
            : "bg-foreground/5 text-muted")
        }
      >
        {ok ? "연결됨" : "미연결"}
      </span>
    </div>
  );
}

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/landing");

  const admin = createSupabaseAdminClient();
  const { data: conn } = await admin
    .from("user_google_connections")
    .select("drive_connected, calendar_connected")
    .eq("user_id", user.id)
    .maybeSingle();

  const driveOk = conn?.drive_connected ?? false;
  const calendarOk = conn?.calendar_connected ?? false;
  const meta = user.user_metadata ?? {};
  const nickname = meta.full_name ?? meta.name ?? user.email ?? "친구";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface px-8 py-10 shadow-[0_8px_30px_rgba(42,38,34,0.06)]">
        <p className="text-sm font-medium tracking-wide text-accent">환영합니다</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {nickname}님, 캘박에 오신 걸 환영해요
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          추억을 박제할 준비를 확인합니다.
        </p>

        <div className="mt-7 space-y-3">
          <StatusRow
            label="구글 드라이브"
            ok={driveOk}
            hint="사진을 내 드라이브에 보관 (사진 기능에 필요)"
          />
          <StatusRow
            label="구글 캘린더"
            ok={calendarOk}
            hint="박제한 모임 일정을 내 캘린더에 동기화"
          />
        </div>

        {!driveOk && (
          <p className="mt-4 rounded-2xl bg-accent-soft/40 px-4 py-3 text-sm leading-relaxed text-foreground/80">
            드라이브가 미연결 상태예요. 로그인 시 권한을 허용하지 않았다면, 다시
            로그인하며 드라이브 접근을 허용해 주세요.
          </p>
        )}

        <div className="mt-8 flex gap-3">
          <a
            href="/"
            className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-accent px-4 font-medium text-white transition-all duration-300 hover:-translate-y-0.5"
          >
            캘박 시작하기
          </a>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex h-11 items-center justify-center rounded-2xl border border-border px-4 font-medium text-muted transition-colors hover:bg-foreground/5"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
