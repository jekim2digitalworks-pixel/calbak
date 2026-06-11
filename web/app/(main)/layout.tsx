import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";

// 메인 앱 셸: 하단 탭(피드/캘린더/공간) + 인증 가드
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/landing");

  return (
    // 모바일은 화면 꽉 차게(풀폭), 데스크톱(≥640px)에선 가운데 좁은 앱 프레임(인스타 웹처럼)
    <div className="mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-background sm:max-w-md sm:border-x sm:border-border/60 sm:shadow-[0_0_60px_rgba(42,38,34,0.05)]">
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
