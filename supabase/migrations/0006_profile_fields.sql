-- 캘박 0006: 프로필 편집 필드 추가(이름/전화번호/연락 이메일)
-- nickname, avatar_url 은 0001에 이미 존재. 본인만 수정(profiles_self 정책 그대로 적용).
-- email은 '연락용' 필드(로그인 구글 이메일과 별개) — 로그인 식별자는 auth.users가 관리.
-- 적용: Supabase SQL Editor에 붙여넣고 Run. (0005 이후 1회)

alter table profiles
  add column if not exists name  text,
  add column if not exists phone text,
  add column if not exists email text;
