import Link from "next/link";
import QRCode from "qrcode";
import { MessageCircle, UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureFriendCode, listFriends } from "@/lib/friends";
import { FriendShare } from "@/components/friend-share";
import { Avatar } from "@/components/avatar";

export default async function FriendsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};
  const myName = meta.full_name ?? meta.name ?? user?.email ?? "나";

  const code = user ? await ensureFriendCode(user.id) : "";
  const base = process.env.APP_BASE_URL ?? "";
  const url = `${base}/add/${code}`;
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 400 });

  const friends = await listFriends();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-7">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">친구</h1>

      <FriendShare url={url} qrDataUrl={qrDataUrl} nickname={myName} />

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-semibold text-muted">
          내 친구 {friends.length > 0 && friends.length}
        </h2>

        {friends.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-muted">
            <UserPlus size={28} strokeWidth={1.6} className="opacity-50" />
            <p>아직 친구가 없어요.</p>
            <p className="text-sm">위 링크·QR을 친구에게 보내보세요.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.user_id}>
                <Link
                  href={`/dm/${f.user_id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 transition-colors hover:bg-foreground/[0.04]"
                >
                  <Avatar name={f.nickname} src={f.avatar_url} size={40} />
                  <span className="flex-1 font-medium">{f.nickname}</span>
                  <MessageCircle size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
