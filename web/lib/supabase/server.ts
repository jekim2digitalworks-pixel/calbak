import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버(서버 컴포넌트 / Route Handler / Server Action)용 Supabase 클라이언트.
 * Next.js 16: cookies() 는 async 이므로 await 한다.
 * RLS 적용(로그인 사용자 컨텍스트). 특권 작업은 admin 클라이언트(admin.ts) 사용.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 set 호출 시 무시 — 세션 갱신은 proxy.ts 가 담당.
          }
        },
      },
    },
  );
}
