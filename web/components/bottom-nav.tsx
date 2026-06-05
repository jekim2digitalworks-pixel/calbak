"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";

const TABS = [
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/space", label: "공간", icon: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-border bg-surface/85 backdrop-blur-md">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={
                  "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition-colors " +
                  (active
                    ? "text-accent"
                    : "text-muted hover:text-foreground")
                }
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.9}
                  fill={active ? "currentColor" : "none"}
                  className={active ? "opacity-100" : "opacity-90"}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
