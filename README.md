# 캘박 (CalBak)

> 박제하다: 지나간 날을 못 박듯 영원히 고정한다.

친한 친구들끼리 추억과 일정을 **날짜 단위로 박제**하는 프라이빗 공간. 카카오톡이 "강(흘러감)"이라면, 캘박은 "박물관(고정)"이다.

## 문서
- 서비스 기획서: [`docs/캘박_기획서_v0.1.md`](docs/캘박_기획서_v0.1.md)
- **개발기획서(설계·결정)**: [`docs/개발기획서.md`](docs/개발기획서.md)
- **WBS(작업 순서·진행)**: [`docs/WBS.md`](docs/WBS.md)
- UI/UX 가이드: [`docs/su_prompt.md`](docs/su_prompt.md)

## 기술 스택 (무료 티어)
| 레이어 | 선택 |
|---|---|
| 프레임워크/호스팅 | Next.js 15 (App Router) on Vercel |
| DB / 인증 | Supabase Postgres + Auth (Google OAuth) |
| 사진 저장 | **멤버별 Google Drive 복제** (Drive API v3) |
| 캘린더 연동 | Google Calendar API v3 (모임 → GCal 푸시) |
| 날씨 | Open-Meteo Archive API |
| 스타일 | Tailwind CSS + Pretendard (웜화이트/크림 톤) |

## 핵심 설계 메모
- **사진**: owner 한 곳이 아니라 연동한 멤버 각자의 Google Drive에 복사본 분산 저장 → 누가 지워도 내 Drive에 남으면 계속 보임(영속성). 사진 기능은 Drive 연동 필수.
- **인증**: 가입 시 Google 로그인으로 Drive·Calendar 스코프를 함께 요청하고 연동 여부를 기록.
- **공간 격리**: Supabase RLS로 "내가 멤버인 공간"만 접근.

## 프로젝트 구조 (예정)
```
calbak/
├─ docs/        # 기획·설계 문서
├─ web/         # Next.js 앱 (Vercel 배포 단위)
├─ supabase/    # 마이그레이션(스키마 + RLS)
├─ .env.example
└─ README.md
```

## 시작하기 (셋업 예정 — WBS P0-5~P0-8)
1. Supabase 프로젝트 생성, `supabase/migrations` 적용
2. Google Cloud OAuth 클라이언트 생성(Drive·Calendar 스코프, 동의화면)
3. `.env.example`을 `.env.local`로 복사해 값 채우기
4. `web/`에서 `npm install && npm run dev`

현재 단계: **M0 기반(설계·문서·골격 완료)**. 상세 진행은 [`docs/WBS.md`](docs/WBS.md) §3 참조.
