import Link from "next/link";
import { CalendarHeart } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInviteInfo } from "@/lib/invites";
import { acceptInviteAction } from "@/app/actions/invites";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface px-8 py-12 text-center shadow-[0_8px_30px_rgba(42,38,34,0.06)]">
        {children}
      </div>
    </main>
  );
}

function fmt(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const wd = "일월화수목금토"[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 ${wd}요일`;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const info = await getInviteInfo(code, user?.id ?? null);

  if (!info || !info.valid) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">유효하지 않은 초대예요</h1>
        <p className="mt-3 leading-relaxed text-muted">
          링크가 만료됐거나 잘못됐어요.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-border px-5 font-medium"
        >
          홈으로
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-accent-soft/40 text-accent">
        <CalendarHeart size={26} />
      </div>
      <p className="text-sm font-medium text-accent">
        {info.hostName}님의 초대
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{info.title}</h1>
      <p className="mt-2 text-muted">{fmt(info.date)}</p>
      {info.place && <p className="text-sm text-muted">📍 {info.place}</p>}
      <p className="mt-4 leading-relaxed text-muted">
        이 날의 추억을 함께 박제해요.
      </p>

      <div className="mt-7">
        {info.alreadyParticipant ? (
          <Link
            href={`/memory/${info.memoryId}`}
            className="flex h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-white"
          >
            이미 참여 중 · 들어가기
          </Link>
        ) : user ? (
          <form action={acceptInviteAction}>
            <input type="hidden" name="code" value={code} />
            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-accent font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
            >
              참여하기
            </button>
          </form>
        ) : (
          <>
            <GoogleSignInButton next={`/invite/${code}`} />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              사진 보관을 위한 구글 드라이브 접근을 함께 요청해요.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
