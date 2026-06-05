/** Google OAuth 스코프 (개발기획서 §4.1) */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/** 로그인 시 요청할 전체 스코프 문자열 */
export const GOOGLE_LOGIN_SCOPES = [
  "email",
  "profile",
  DRIVE_SCOPE,
  CALENDAR_SCOPE,
].join(" ");
