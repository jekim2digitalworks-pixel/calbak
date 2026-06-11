"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Settings } from "lucide-react";
import { NotificationNavItem } from "@/components/notification-nav";
import { FriendNavItem } from "@/components/friend-nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-border bg-surface/85 backdrop-blur-md">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <li className="flex-1">
          <Link
            href="/calendar"
            className={
              "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition-colors " +
              (pathname.startsWith("/calendar")
                ? "text-accent"
                : "text-muted hover:text-foreground")
            }
          >
            <CalendarDays
              size={22}
              strokeWidth={pathname.startsWith("/calendar") ? 2.4 : 1.9}
              fill={pathname.startsWith("/calendar") ? "currentColor" : "none"}
            />
            캘린더
          </Link>
        </li>
        <li className="flex-1">
          <FriendNavItem />
        </li>
        <li className="flex-1">
          <NotificationNavItem />
        </li>
        <li className="flex-1">
          <Link
            href="/space"
            className={
              "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition-colors " +
              (pathname.startsWith("/space")
                ? "text-accent"
                : "text-muted hover:text-foreground")
            }
          >
            <Settings
              size={22}
              strokeWidth={pathname.startsWith("/space") ? 2.4 : 1.9}
              fill={pathname.startsWith("/space") ? "currentColor" : "none"}
            />
            공간
          </Link>
        </li>
      </ul>
    </nav>
  );
}
