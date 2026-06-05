# `lib/` — 도메인 로직 모듈 (예정)

개발기획서 §10의 폴더 구조. 각 모듈은 해당 WBS Phase에서 생성한다.
**Next.js 16 코드 작성 전 `node_modules/next/dist/docs/01-app/` 의 관련 문서를 먼저 읽을 것** (web/AGENTS.md 경고).

| 모듈 | 역할 | WBS |
|---|---|---|
| `supabase/` | 클라이언트/서버 Supabase 인스턴스, RLS 호출 | P0-7, P1 |
| `google/oauth.ts` | Google OAuth, refresh token 암호화 저장 | P1 |
| `google/drive.ts` | 사진 멤버별 Drive 복제(팬아웃)·프록시 | P4 |
| `google/calendar.ts` | 모임 → Google Calendar 푸시 | P7 |
| `weather/` | Open-Meteo Archive 날씨 박제 | P5 |

> 민감 정보(refresh token 등)는 서버 전용. 클라이언트 노출 금지.
