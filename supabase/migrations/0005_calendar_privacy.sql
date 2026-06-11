-- 캘박 0005: 캘린더 이벤트 열람을 '참가자만'으로 엄격화
-- 작성자 본인은 생성 시 host 참가자로 등록되므로 당연히 열람 가능.
-- 기존 memories_select의 'or is_space_member(space_id)'를 제거 →
-- 다중 공간 확장 시에도 '초대 안 받은 공간 멤버'에게 일정이 노출되지 않는다.
-- 주의: 생성 직후 RETURNING 읽기는 createMemory가 service role로 수행하므로 이 정책에 의존하지 않는다.
-- 적용: Supabase SQL Editor에 붙여넣고 Run. (0004 이후 1회)

drop policy if exists memories_select on memories;
create policy memories_select on memories
  for select using (is_memory_participant(id));
