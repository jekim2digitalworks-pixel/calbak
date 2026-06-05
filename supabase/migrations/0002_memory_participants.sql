-- 캘박 0002: 초대/참가자를 '공간' → '모임(일정)' 단위로 전환
-- 일정마다 초대 대상이 다르므로, 모임별 참가자(memory_participants)로 접근을 통제한다.
-- 적용: Supabase SQL Editor에 붙여넣고 Run. (0001 이후 1회)

-- 1) 모임 참가자
create table memory_participants (
  memory_id  uuid not null references memories(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'guest',   -- 'host' | 'guest'
  joined_at  timestamptz not null default now(),
  primary key (memory_id, user_id)
);
create index on memory_participants(user_id);

-- 참가자 판별 헬퍼 (RLS 재귀 회피)
create or replace function is_memory_participant(p_memory_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memory_participants
    where memory_id = p_memory_id and user_id = auth.uid()
  );
$$;

create or replace function is_memory_host(p_memory_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memory_participants
    where memory_id = p_memory_id and user_id = auth.uid() and role = 'host'
  );
$$;

-- 2) 기존 모임 → 생성자를 host로 백필
insert into memory_participants (memory_id, user_id, role)
  select id, created_by, 'host' from memories
on conflict do nothing;

-- 3) invites: 모임 단위 초대 지원 (space_id는 nullable로 완화)
alter table invites add column memory_id uuid references memories(id) on delete cascade;
alter table invites alter column space_id drop not null;

-- 4) RLS 재구성 — 참가자 기반
alter table memory_participants enable row level security;

create policy mp_select on memory_participants
  for select using (is_memory_participant(memory_id));
-- 호스트는 참가자 제외(삭제) 가능
create policy mp_host_delete on memory_participants
  for delete using (is_memory_host(memory_id));

-- memories: 참가자 또는 (생성용) 공간 멤버
drop policy if exists memories_member on memories;
create policy memories_select on memories
  for select using (is_memory_participant(id) or is_space_member(space_id));
create policy memories_insert on memories
  for insert with check (is_space_member(space_id));
create policy memories_update on memories
  for update using (is_memory_participant(id)) with check (is_memory_participant(id));
create policy memories_delete on memories
  for delete using (is_memory_host(id));

-- photos: 참가자
drop policy if exists photos_member on photos;
create policy photos_access on photos
  for all using (is_memory_participant(memory_id))
  with check (is_memory_participant(memory_id));

-- comments: 참가자
drop policy if exists comments_member on comments;
create policy comments_access on comments
  for all using (is_memory_participant(memory_id))
  with check (is_memory_participant(memory_id));

-- weather: 참가자
drop policy if exists weather_member_select on weather_snapshots;
create policy weather_access on weather_snapshots
  for select using (is_memory_participant(memory_id));

-- invites: 모임 호스트가 관리 (조회/생성). 수락은 서버 service role.
drop policy if exists invites_member on invites;
create policy invites_host on invites
  for all using (memory_id is not null and is_memory_host(memory_id))
  with check (memory_id is not null and is_memory_host(memory_id));
