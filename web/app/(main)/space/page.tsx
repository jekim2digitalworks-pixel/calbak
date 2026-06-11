import { HardDriveUpload, CalendarCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMyProfile } from "@/lib/profile";
import { ProfileEditor } from "@/components/profile-editor";

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

  const admin = createSupabaseAdminClient();
  const { data: conn } = user
    ? await admin
        .from("user_google_connections")
        .select("drive_connected, calendar_connected")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const profile = await getMyProfile();

  return (
    <main className="mx-auto w-full max-w-md px-5 py-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">내 프로필</h1>

      {profile && <ProfileEditor initial={profile} />}

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
