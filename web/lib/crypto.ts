import "server-only";
import crypto from "node:crypto";

/**
 * Google refresh token 등 민감 문자열을 AES-256-GCM으로 암호화/복호화.
 * 키: TOKEN_ENCRYPTION_KEY (base64, 32바이트). 서버 전용.
 * 저장 포맷: "<iv-b64>:<authTag-b64>:<ciphertext-b64>"
 */
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? "", "base64");

function assertKey() {
  if (KEY.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY가 32바이트(base64)가 아닙니다. .env.local 확인.",
    );
  }
}

export function encryptToken(plain: string): string {
  assertKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptToken(payload: string): string {
  assertKey();
  const [ivB64, tagB64, encB64] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    KEY,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
