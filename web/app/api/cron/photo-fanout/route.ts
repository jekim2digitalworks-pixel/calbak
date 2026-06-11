import { retryPendingFanouts } from "@/lib/photos";

/**
 * 사진 팬아웃 재시도 배치(A1 / P4-6). Vercel Cron이 호출.
 * after()로 1차 팬아웃하지만, 일시 오류(other)로 남은 복사본을 주기적으로 보강한다.
 * quota/auth 영구실패는 runFanout 내부에서 자동 skip(무한 재시도 방지).
 * 보안: CRON_SECRET 설정 시 Authorization: Bearer 검증(Vercel Cron이 자동 첨부).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const processed = await retryPendingFanouts(30);
  return Response.json({ ok: true, processed });
}
