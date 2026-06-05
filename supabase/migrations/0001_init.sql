-- 캘박 (CalBak) 초기 스키마 + RLS
-- 설계 근거: docs/개발기획서.md §8
-- 원칙: 공간(Space) 단위 격리, 박제값은 불변 스냅샷, 민감 토큰은 서버 전용.
-- 주의: 이 파일은 골격 초안이다. P0-8(스키마 적용 + RLS 검증)에서 실제 검증한다.

-- ─────────────────────────────────────────────────────────
-- 공통: 갱신 시각 트리거
-- ─────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ─────────────────────────────────────────────────────────
-- 1. profiles  (↔ auth.users)
-- ─────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────
-- 2. user_google_connections  (서버 전용 — 토큰/연동 상태)
--    refresh_token_enc 는 클라이언트가 직접 쿼리하지 않는다(서버 service role 전용).
-- ─────────────────────────────────────────────────────────
create table user_google_connections (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  refresh_token_enc  text,                       -- 암호화 저장
  drive_connected    boolean not null default false,
  calendar_connected boolean not null default false,
  drive_folder_id    text,                       -- 멤버 Drive 내 '캘박' 루트 폴더
  scopes             text,
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────
-- 3. spaces  (캘박 공간)
-- ─────────────────────────────────────────────────────────
create table spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

-- 4. space_members  (멤버십 — RLS 기준점)
create table space_members (
  space_id   uuid not null references spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member',      -- 'owner' | 'member'
  joined_at  timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index on space_members(user_id);

-- 멤버십 판별 헬퍼 (RLS 재귀 회피용 SECURITY DEFINER)
create or replace function is_space_member(p_space_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from space_members
    where space_id = p_space_id and user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────
-- 5. memories  (모임 = 박제 셀). date 가 정체성.
-- ─────────────────────────────────────────────────────────
create table memories (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  title       text not null,
  date        date not null,
  place       text,
  place_lat   double precision,                   -- 날씨 박제용 좌표
  place_lng   double precision,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on memories(space_id, date);

-- 6. weather_snapshots  (박제된 날씨 — 불변 스냅샷, memory 1:1)
create table weather_snapshots (
  memory_id   uuid primary key references memories(id) on delete cascade,
  temp        double precision,
  condition   text,
  source      text not null default 'open-meteo',
  fetched_at  timestamptz not null default now()
);

-- 7. photos  (논리적 사진 1건)
create table photos (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null references memories(id) on delete cascade,
  uploaded_by  uuid not null references auth.users(id),
  taken_at     timestamptz,
  caption      text,
  created_at   timestamptz not null default now()
);
create index on photos(memory_id);

-- 8. photo_drive_copies  (멤버별 물리 복사본 — 분산 저장)
create table photo_drive_copies (
  id             uuid primary key default gen_random_uuid(),
  photo_id       uuid not null references photos(id) on delete cascade,
  member_id      uuid not null references auth.users(id) on delete cascade,
  drive_file_id  text,
  thumbnail_link text,
  sync_status    text not null default 'pending',  -- pending|synced|failed|skipped
  created_at     timestamptz not null default now(),
  unique (photo_id, member_id)
);
create index on photo_drive_copies(member_id);

-- 9. comments  (비동기 댓글)
create table comments (
  id          uuid primary key default gen_random_uuid(),
  memory_id   uuid not null references memories(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index on comments(memory_id, created_at);

-- 10. memory_calendar_events  (모임 ↔ Google Calendar 매핑)
create table memory_calendar_events (
  id              uuid primary key default gen_random_uuid(),
  memory_id       uuid not null references memories(id) on delete cascade,
  member_id       uuid not null references auth.users(id) on delete cascade,
  google_event_id text,
  sync_status     text not null default 'pending',
  unique (memory_id, member_id)
);

-- 11. invites  (초대 링크/코드)
create table invites (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  code        text not null unique,
  created_by  uuid not null references auth.users(id),
  expires_at  timestamptz,
  max_uses    integer,
  used_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- (v1.1) diary_entries — 개인 비밀 일기. MVP 미사용, 참고용 정의.
-- create table diary_entries (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   date date not null,
--   content text,
--   created_at timestamptz not null default now()
-- );

-- updated_at 트리거
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_memories_updated before update on memories
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table profiles                enable row level security;
alter table user_google_connections enable row level security;
alter table spaces                  enable row level security;
alter table space_members           enable row level security;
alter table memories                enable row level security;
alter table weather_snapshots       enable row level security;
alter table photos                  enable row level security;
alter table photo_drive_copies      enable row level security;
alter table comments                enable row level security;
alter table memory_calendar_events  enable row level security;
alter table invites                 enable row level security;

-- profiles: 본인 read/write (공간 멤버 프로필 노출은 추후 뷰/정책으로 확장)
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- user_google_connections: 본인만 (토큰은 서버 service role로만 실제 접근)
create policy ugc_self on user_google_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- spaces: 멤버만 조회 / 생성자는 본인 명의로 생성
create policy spaces_member_select on spaces
  for select using (is_space_member(id));
create policy spaces_insert on spaces
  for insert with check (created_by = auth.uid());

-- space_members: 같은 공간 멤버끼리 조회
create policy sm_select on space_members
  for select using (is_space_member(space_id));

-- 공간 종속 테이블: 멤버면 read/write
create policy memories_member on memories
  for all using (is_space_member(space_id)) with check (is_space_member(space_id));

create policy comments_member on comments
  for all using (is_space_member((select space_id from memories m where m.id = memory_id)))
  with check (is_space_member((select space_id from memories m where m.id = memory_id)));

create policy photos_member on photos
  for all using (is_space_member((select space_id from memories m where m.id = memory_id)))
  with check (is_space_member((select space_id from memories m where m.id = memory_id)));

create policy weather_member_select on weather_snapshots
  for select using (is_space_member((select space_id from memories m where m.id = memory_id)));

create policy invites_member on invites
  for all using (is_space_member(space_id)) with check (is_space_member(space_id));

-- 멤버 개인 테이블: 본인 행만 (팬아웃 쓰기는 서버 service role)
create policy pdc_self on photo_drive_copies
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy mce_self on memory_calendar_events
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());

-- 주: weather 박제(insert/update), 사진 팬아웃, 초대 수락 등 특권 작업은
--     서버 Route Handler가 service role 키로 RLS를 우회해 수행한다.
