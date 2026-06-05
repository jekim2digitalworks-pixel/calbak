"use server";

import { revalidatePath } from "next/cache";
import { addComment } from "@/lib/comments";

export async function addCommentAction(formData: FormData) {
  const memoryId = String(formData.get("memoryId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!memoryId || !content) return;
  await addComment(memoryId, content);
  revalidatePath(`/memory/${memoryId}`);
}
