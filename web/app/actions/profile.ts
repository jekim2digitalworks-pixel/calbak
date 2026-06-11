"use server";

import { revalidatePath } from "next/cache";
import { updateMyProfile } from "@/lib/profile";

/** 프로필(닉네임/이름/전화/이메일) 저장. */
export async function updateProfileAction(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  await updateMyProfile({
    nickname: nickname || "친구",
    name: name || null,
    phone: phone || null,
    email: email || null,
  });
  revalidatePath("/space");
}
