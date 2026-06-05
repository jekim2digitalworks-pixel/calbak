import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 특권 클라이언트 — service(secret) 키로 RLS를 우회한다.
 * 용도: 사진 멤버별 Drive 팬아웃, 날씨 스냅샷 박제, 초대 수락 등(개발기획서 §8 RLS 노트).
 * ⚠️ 절대 클라이언트 컴포넌트에서 import 금지. 'server-only' 가 빌드 타임에 차단한다.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
