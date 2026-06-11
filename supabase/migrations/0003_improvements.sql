-- 캘박 0003: 개선 4건 (개선제안_구현안_v1.md)
-- A1 사진 팬아웃 비동기/안전망 · A2 날씨 폴백 정직화 · B5 인앱 알림
-- 적용: Supabase SQL Editor에 붙여넣고 Run. (0002 이후 1회)

-- ── A1: 팬아웃 비동기 + 안전망 ───────────────────────────
alter table photos
  add column if not exists staging_path text,                  -- Supabase Storage 임시 원본 경로
  add column if not exists fanout_done  boolean not null default false;

alter table photo_drive_copies
  add column if not exists error_code text,                     -- 'quota' | 'auth' | 'other'
  add column if not exists attempts    integer not null default 0,
  add column if not exists updated_at  timestamptz not null default now();

-- ── A2: 날씨 정확도 표식 ─────────────────────────────────
alter table weather_snapshots
  add column if not exists is_approx boolean not null default false;  -- 광역/추정 좌표 여부

-- ── B5: 인앱 알림 ────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,  -- 받는 사람
  memory_id  uuid references memories(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,          -- 행위자
  type       text not null,                       -- 'comment' | 'photo' | 'on_this_day'
  preview    text,                                 -- "그 횟집 진짜였다"
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on notifications(user_id, created_at desc);

alter table notifications enable row level security;

-- 본인 알림만 조회 / 읽음 처리. INSERT(생성)는 서버 service role 전용(정책 없음 → RLS 차단, admin 우회).
drop policy if exists notifications_self on notifications;
create policy notifications_self on notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_self_update on notifications;
create policy notifications_self_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
