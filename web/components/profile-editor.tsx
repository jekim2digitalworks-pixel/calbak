"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Check } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { updateProfileAction } from "@/app/actions/profile";
import type { MyProfile } from "@/lib/profile";

export function ProfileEditor({ initial }: { initial: MyProfile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(initial.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok)
        throw new Error(json.message || `업로드 실패 (${res.status})`);
      setAvatar(json.url);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setErr(null);
    try {
      await updateProfileAction(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch {
      setErr("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6">
      {/* 프로필 이미지 */}
      <div className="mb-5 flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative rounded-full"
          aria-label="프로필 사진 변경"
        >
          <Avatar name={initial.nickname} src={avatar} size={88} />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-accent text-white">
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Camera size={16} />
            )}
          </span>
        </button>
        <p className="mt-2 text-xs text-muted">사진을 눌러 변경</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
      </div>

      {/* 텍스트 필드 */}
      <form onSubmit={onSave} className="space-y-3">
        <Field label="닉네임">
          <input
            name="nickname"
            defaultValue={initial.nickname}
            required
            maxLength={20}
            placeholder="닉네임"
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 outline-none focus:border-accent"
          />
        </Field>
        <Field label="이름">
          <input
            name="name"
            defaultValue={initial.name ?? ""}
            maxLength={40}
            placeholder="이름 (선택)"
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 outline-none focus:border-accent"
          />
        </Field>
        <Field label="전화번호">
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={initial.phone ?? ""}
            maxLength={20}
            placeholder="010-0000-0000 (선택)"
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 outline-none focus:border-accent"
          />
        </Field>
        <Field label="이메일">
          <input
            name="email"
            type="email"
            inputMode="email"
            defaultValue={initial.email ?? ""}
            maxLength={120}
            placeholder="email@example.com (선택)"
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 outline-none focus:border-accent"
          />
        </Field>

        {err && <p className="text-center text-xs text-sunday">{err}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
        >
          {saved ? (
            <>
              <Check size={18} /> 저장됨
            </>
          ) : saving ? (
            "저장 중…"
          ) : (
            "프로필 저장"
          )}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-xs font-semibold text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
