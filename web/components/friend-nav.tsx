"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** 하단탭 "친구" — 안 읽은 DM 배지(Supabase Realtime 실시간). */
export function FriendNavItem() {
  const pathname = usePathname();
  const active = pathname.startsWith("/friends") || pathname.startsWith("/dm");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const refresh = async () => {
        const { count } = await supabase
          .from("dm_messages")
          .select("id", { count: "exact", head: true })
          .is("read_at", null)
          .neq("sender_id", user.id);
        if (!cancelled) setCount(count ?? 0);
      };
      await refresh();

      channel = supabase
        .channel("dm-badge")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "dm_messages" },
          refresh,
        )
        .subscribe();
    }
    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [pathname]);

  return (
    <Link
      href="/friends"
      className={
        "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition-colors " +
        (active ? "text-accent" : "text-muted hover:text-foreground")
      }
    >
      <span className="relative">
        <Users
          size={22}
          strokeWidth={active ? 2.4 : 1.9}
          fill={active ? "currentColor" : "none"}
        />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sunday px-1 text-[9px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      친구
    </Link>
  );
}
