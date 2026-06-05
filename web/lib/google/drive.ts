import "server-only";

/**
 * Google Drive 연동 (개발기획서 §5). drive.file 스코프 — 앱이 만든 파일만.
 * 저장된 refresh token + client id/secret으로 access token을 갱신해 사용한다.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`access token 갱신 실패: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("access_token 없음");
  return json.access_token;
}

/** "캘박" 루트 폴더 보장. 없으면 생성하고 새 folderId 반환. */
export async function ensureCalbakFolder(
  accessToken: string,
  existingFolderId: string | null,
): Promise<string> {
  if (existingFolderId) return existingFolderId;
  const res = await fetch(`${DRIVE_API}?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "캘박",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error(`폴더 생성 실패: ${res.status}`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** 멀티파트 업로드 → 생성된 파일 id 반환. */
export async function uploadPhotoToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  mimeType: string,
  bytes: Buffer,
): Promise<string> {
  const boundary = "calbak" + Math.random().toString(16).slice(2);
  const meta = JSON.stringify({ name: filename, parents: [folderId] });
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    "utf8",
  );
  const post = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([pre, bytes, post]);

  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`업로드 실패: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** Drive 파일 원본 스트림(프록시용). */
export function fetchDriveFile(
  accessToken: string,
  fileId: string,
): Promise<Response> {
  return fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
