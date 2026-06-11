import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { areFriends } from "@/lib/friends";
import { getOrCreateThread, listMessages, markThreadRead } from "@/lib/dm";
import { ChatRoom } from "@/components/chat-room";
import { Avatar } from "@/components/avatar";

export default async function DmPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/landing");
  if (user.id === friendId) notFound();
  if (!(await areFriends(user.id, friendId))) redirect("/friends");

  const admin = createSupabaseAdminClient();
  const { data: friend } = await admin
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", friendId)
    .maybeSingle();

  const threadId = await getOrCreateThread(user.id, friendId);
  const messages = await listMessages(threadId);
  await markThreadRead(threadId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-3 py-2.5 backdrop-blur-md">
        <Link
          href="/friends"
          aria-label="뒤로"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5"
        >
          <ChevronLeft size={22} />
        </Link>
        <Avatar
          name={(friend?.nickname as string) ?? "친구"}
          src={(friend?.avatar_url as string | null) ?? null}
          size={34}
        />
        <span className="font-semibold">
          {(friend?.nickname as string) ?? "친구"}
        </span>
      </header>

      <ChatRoom threadId={threadId} myId={user.id} initial={messages} />
    </div>
  );
}
