import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFriendCodeOwner } from "@/lib/friends";
import { addFriendAction } from "@/app/actions/friends";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Avatar } from "@/components/avatar";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface px-8 py-12 text-center shadow-[0_8px_30px_rgba(42,38,34,0.06)]">
        {children}
      </div>
    </main>
  );
}

export default async function AddFriendPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const owner = await getFriendCodeOwner(code, user?.id ?? null);

  if (!owner) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">유효하지 않은 링크예요</h1>
        <p className="mt-3 leading-relaxed text-muted">
          친구 코드가 잘못됐어요.
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
      <div className="mx-auto mb-4 flex justify-center">
        <Avatar
          name={owner.friend.nickname}
          src={owner.friend.avatar_url}
          size={64}
        />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        {owner.friend.nickname}
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        캘박에서 친구가 되어 일정을 함께 박제하고 대화해요.
      </p>

      <div className="mt-7">
        {owner.isSelf ? (
          <Link
            href="/friends"
            className="flex h-12 items-center justify-center rounded-2xl border border-border font-semibold"
          >
            내 친구 코드예요 · 친구 보기
          </Link>
        ) : owner.alreadyFriend ? (
          <Link
            href={`/dm/${owner.friend.user_id}`}
            className="flex h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-white"
          >
            이미 친구예요 · 대화하기
          </Link>
        ) : user ? (
          <form action={addFriendAction}>
            <input type="hidden" name="code" value={code} />
            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-accent font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
            >
              친구 추가하기
            </button>
          </form>
        ) : (
          <>
            <GoogleSignInButton next={`/add/${code}`} />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              로그인하면 친구로 추가돼요.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
