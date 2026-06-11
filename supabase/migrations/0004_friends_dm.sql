-- 캘박 0004: 친구 시스템 + 1:1 실시간 DM (의사결정 D11 — 소통+프라이빗 캘린더로 방향 확장)
-- 적용: Supabase SQL Editor에 붙여넣고 Run. (0003 이후 1회)

-- ── 개인 친구 코드(영구 초대 링크/QR용) ─────────────────
alter table profiles add column if not exists friend_code text unique;

-- ── friendships: 무방향 친구 관계(정규화: user_a < user_b 로 중복 쌍 방지) ──
create table if not exists friendships (
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_b_idx on friendships(user_b);

alter table friendships enable row level security;
drop policy if exists friendships_self on friendships;
create policy friendships_self on friendships
  for select using (user_a = auth.uid() or user_b = auth.uid());
-- 생성/삭제는 service role(개인 링크 수락 핸들러)에서 수행.

-- ── DM 스레드(1:1, 정규화 쌍) + 메시지 ───────────────────
create table if not exists dm_threads (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists dm_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references dm_threads(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists dm_messages_thread_idx on dm_messages(thread_id, created_at);
create index if not exists dm_messages_unread_idx on dm_messages(sender_id, read_at);

-- 스레드 멤버 판별(RLS 재귀 회피)
create or replace function is_dm_member(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dm_threads
    where id = p_thread_id and (user_a = auth.uid() or user_b = auth.uid())
  );
$$;

alter table dm_threads  enable row level security;
alter table dm_messages enable row level security;

drop policy if exists dm_threads_member on dm_threads;
create policy dm_threads_member on dm_threads
  for select using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists dm_messages_select on dm_messages;
create policy dm_messages_select on dm_messages
  for select using (is_dm_member(thread_id));

drop policy if exists dm_messages_insert on dm_messages;
create policy dm_messages_insert on dm_messages
  for insert with check (is_dm_member(thread_id) and sender_id = auth.uid());

drop policy if exists dm_messages_update on dm_messages;
create policy dm_messages_update on dm_messages
  for update using (is_dm_member(thread_id)) with check (is_dm_member(thread_id));

-- Realtime: dm_messages 변경 브로드캐스트(이미 멤버면 무시)
do $$
begin
  alter publication supabase_realtime add table dm_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
