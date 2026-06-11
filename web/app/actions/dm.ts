"use server";

import { sendMessage, type DmMessage } from "@/lib/dm";

/** DM 전송. 실시간(Realtime)으로 양쪽에 도착하므로 반환값은 보낸이 낙관적 표시용. */
export async function sendMessageAction(
  threadId: string,
  content: string,
): Promise<DmMessage | null> {
  const trimmed = content.trim();
  if (!threadId || !trimmed) return null;
  return sendMessage(threadId, trimmed.slice(0, 2000));
}
