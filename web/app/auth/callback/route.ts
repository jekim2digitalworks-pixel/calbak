import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";
import { DRIVE_SCOPE, CALENDAR_SCOPE } from "@/lib/google/scopes";
import { ensureDefaultSpace } from "@/lib/spaces";

/**
 * Google OAuth 콜백 (개발기획서 §4 / C-2).
 * 1) code → 세션 교환
 * 2) 프로필 upsert
 * 3) provider_refresh_token 암호화 저장 + 부여 스코프로 drive/calendar 연동 플래그 기록
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const { session } = data;
  const user = session.user;
  const meta = user.user_metadata ?? {};
  const admin = createSupabaseAdminClient();

  // 2) 프로필
  await admin.from("profiles").upsert(
    {
      id: user.id,
      nickname: meta.full_name ?? meta.name ?? user.email ?? "친구",
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
    },
    { onConflict: "id" },
  );

  // 3) 부여된 스코프 확인 (tokeninfo)
  let scopeStr = "";
  let driveConnected = false;
  let calendarConnected = false;
  if (session.provider_token) {
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${session.provider_token}`,
      );
      if (res.ok) {
        const info = (await res.json()) as { scope?: string };
        scopeStr = info.scope ?? "";
        driveConnected = scopeStr.includes(DRIVE_SCOPE);
        calendarConnected = scopeStr.includes(CALENDAR_SCOPE);
      }
    } catch {
      // tokeninfo 실패해도 로그인 자체는 진행
    }
  }

  const conn: Record<string, unknown> = {
    user_id: user.id,
    drive_connected: driveConnected,
    calendar_connected: calendarConnected,
    scopes: scopeStr,
    updated_at: new Date().toISOString(),
  };
  // refresh token은 최초 동의(또는 prompt=consent) 시에만 내려온다 → 있을 때만 갱신
  if (session.provider_refresh_token) {
    conn.refresh_token_enc = encryptToken(session.provider_refresh_token);
  }
  await admin
    .from("user_google_connections")
    .upsert(conn, { onConflict: "user_id" });

  // 기본 공간 자동 생성(멱등) — 첫 로그인 시 "…님의 캘박"
  try {
    await ensureDefaultSpace(
      user.id,
      meta.full_name ?? meta.name ?? user.email ?? "친구",
    );
  } catch {
    // 공간 생성 실패해도 로그인은 진행(캘린더 진입 시 재시도)
  }

  return NextResponse.redirect(`${origin}${next}`);
}
