# 캘박 외부 서비스 셋업 가이드 (이 프로젝트 전용)

> 대상: WBS **P0-6**(Google Cloud OAuth) · **P0-8**(Supabase). 값은 모두 `web/.env.local`(루트 `.env.example` 참조)에 채운다.
>
> ⚠️ **보안**: service role key·client secret·refresh token 암호화 키는 **채팅에 붙여넣지 말고** `web/.env.local`에 직접 입력. 이 파일은 `.gitignore`로 커밋 제외됨.

순서: **A. Supabase 프로젝트 → B. Google Cloud OAuth → C. Supabase에 Google 연결 → D. 스키마 적용 → E. 동작 확인**

---

## A. Supabase 프로젝트 생성

1. https://supabase.com → 로그인 → **New project**.
2. 입력: Name `calbak`, DB Password(메모), Region `Northeast Asia (Seoul)` 권장(무료 OK).
3. 생성 후 **Project Settings → API**에서 아래 3개 복사 → `web/.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (secret) → `SUPABASE_SERVICE_ROLE_KEY`
4. **Project Settings → API**의 Project ref(예: `abcd1234`)와, **Authentication → URL** 콜백 주소를 메모(B에서 사용). 콜백 형식:
   `https://<project-ref>.supabase.co/auth/v1/callback`

---

## B. Google Cloud OAuth 클라이언트 (Drive + Calendar) — 상세

> 이 프로젝트 콜백 URL(B-4, C에서 사용): **`https://uzjzvfhbsnmeyagwjgbt.supabase.co/auth/v1/callback`**

### B-1. 프로젝트
1. https://console.cloud.google.com → 상단 프로젝트 선택기 → **New Project** → 이름 `calbak` → Create → 생성 후 그 프로젝트 선택.

### B-2. API 사용 설정
**APIs & Services → Library** 에서 검색해 각각 **Enable**:
- **Google Drive API** (사진 복제)
- **Google Calendar API** (모임 일정 푸시)
- (선택) People API — 프로필 보강용. 없어도 됨.

### B-3. OAuth consent screen (브랜딩/대상/스코프)
좌측 **APIs & Services → OAuth consent screen** (최신 UI는 *Branding / Audience / Data Access* 탭으로 나뉨):
1. **Audience(User type): External** 선택.
2. **Branding**: 앱 이름 `캘박`, User support email(본인), Developer contact(본인 이메일).
3. **Data Access → Add or remove scopes** 에서 아래 **4개** 추가:
   | 스코프 | 분류 | 용도 |
   |---|---|---|
   | `.../auth/userinfo.email` | 비민감 | 이메일 |
   | `.../auth/userinfo.profile` | 비민감 | 이름·아바타 |
   | `.../auth/drive.file` | **비민감(권장 스코프)** | 앱이 만든 파일만 — 사진 복제 |
   | `.../auth/calendar.events` | **민감(sensitive)** | 앱이 만든 일정만 — 모임 푸시 |
4. **Audience → Test users**: 본인 + 친구들의 **Google 계정 이메일** 추가.
   - Publishing status는 **Testing**으로 둔다(MVP 실험엔 충분, 심사 불필요).
   - ⚠️ **중요 한계**: Testing 상태 + 민감 스코프(`calendar.events`)에서는 **refresh token이 7일 후 만료**된다. 친구 5명 1주일 실험엔 OK지만, 더 길게 쓰려면 (a) 앱을 **Publish**(민감 스코프 검증 필요) 하거나 (b) 7일마다 재로그인. → 캘린더 연동을 빼고 `drive.file`만 쓰면 비민감이라 이 제약이 없다(캘린더는 나중에 켜는 선택지).

### B-4. OAuth Client ID 생성
**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- Name: `calbak-web`
- **Authorized redirect URIs → ADD URI**:
  `https://uzjzvfhbsnmeyagwjgbt.supabase.co/auth/v1/callback`
  (정확히 이 값. 끝에 슬래시·공백 없이. Supabase가 OAuth 교환을 대행하므로 우리 앱 주소가 아니라 **Supabase 도메인**이다.)
- (Authorized JavaScript origins는 이 흐름에선 불필요. 생략 가능.)
- **Create** → 모달에 뜨는 **Client ID**(`...apps.googleusercontent.com`)와 **Client secret**(`GOCSPX-...`) 복사.

### B-5. 값 저장 (2곳에 들어감)
- `web/.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - 우리 서버가 저장된 refresh token으로 Drive/Calendar 호출 시 토큰을 갱신하는 데 **client secret이 필요**하므로 env에도 둔다.
- 그리고 **C단계에서 Supabase에도** 같은 값을 입력.

---

## C. Supabase에 Google 공급자 연결 — 상세

1. Supabase 대시보드 → **Authentication → Sign In / Providers → Google**:
   - **Enable Sign in with Google** 켜기
   - **Client IDs**: B-4의 Client ID 붙여넣기
   - **Client Secret (for OAuth)**: B-4의 Client secret 붙여넣기
   - Callback URL이 `https://uzjzvfhbsnmeyagwjgbt.supabase.co/auth/v1/callback` 로 표시되는지 확인(B-4에 넣은 값과 동일해야 함) → **Save**
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (Vercel 배포 후 그 도메인으로 변경/추가)
   - **Redirect URLs** 허용목록에 `http://localhost:3000/**` 추가
3. **스코프는 대시보드가 아니라 코드(P1)에서 요청**한다. Supabase Google 공급자엔 스코프 입력란이 없고, `signInWithOAuth` 호출 시 `options.scopes`로 넘긴다(아래 D 참고).

---

## C-2. 코드에서 처리할 부분 (P1에서 구현) — 토큰 흐름

1. **로그인 시작** (클라이언트):
   ```ts
   supabase.auth.signInWithOAuth({
     provider: "google",
     options: {
       scopes:
         "email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events",
       queryParams: { access_type: "offline", prompt: "consent" }, // refresh token 확보
       redirectTo: `${APP_BASE_URL}/auth/callback`,
     },
   });
   ```
2. **콜백 처리** (서버 Route Handler `/auth/callback`):
   - `exchangeCodeForSession(code)` → 세션 획득.
   - 세션의 `provider_token`(access)·`provider_refresh_token`(refresh)을 읽는다.
   - `provider_refresh_token`을 `TOKEN_ENCRYPTION_KEY`로 **암호화**해 `user_google_connections.refresh_token_enc`에 저장(admin 클라이언트).
   - 부여된 스코프를 보고 `drive_connected` / `calendar_connected` 갱신.
   - owner의 Drive에 `캘박` 루트 폴더 생성 → `drive_folder_id` 저장.
3. **이후 API 호출**: 저장한 refresh token + `GOOGLE_CLIENT_ID/SECRET`으로 Google 토큰 엔드포인트에서 access token 갱신 → Drive/Calendar v3 호출. (Supabase는 Google provider 토큰을 자동 갱신해 주지 않으므로 우리가 직접 갱신)

> 보안: provider_token/refresh_token·secret은 **서버에서만** 다룬다. 클라이언트로 내려보내지 않는다.

---

## D. 스키마 적용 (`supabase/migrations/0001_init.sql`)

택1:
- **간단(권장)**: Supabase → **SQL Editor** → New query → `supabase/migrations/0001_init.sql` 내용 붙여넣기 → Run.
- **CLI**: `npm i -g supabase` → `supabase login` → `supabase link --project-ref <ref>` → `supabase db push`.

적용 후 **Table Editor**에서 11개 테이블 생성 확인. (RLS는 P0-8에서 함께 검증 — 정책 동작 테스트)

---

## E. 동작 확인

1. `web/.env.local` 채운 뒤:
   ```
   cd web
   npm run dev
   ```
2. http://localhost:3000 접속 → 캘박 임시 홈 표시되면 골격 정상.
3. 이후 P1(로그인)부터 코드 작성.

---

## 다 끝나면

`web/.env.local` 채움 완료 + 스키마 적용 완료를 알려주면, **P1(Google 로그인 + Drive/Calendar 연동)** 부터 이어서 구현한다.
필요한 키는 직접 `.env.local`에 넣고, 채팅엔 "다 넣었다"만 알려주면 됨(시크릿 노출 방지).
