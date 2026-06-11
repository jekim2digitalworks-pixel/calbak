"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";

export function PhotoUploader({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/memories/${memoryId}/photos`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.message || `업로드 실패 (${res.status})`);
      }
      // 팬아웃은 백그라운드(A1). 내 드라이브 복사본이 준비되면 사진이 뜬다(PhotoImg가 재시도).
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/50 bg-accent-soft/20 font-medium text-accent transition-colors hover:bg-accent-soft/40 disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ImagePlus size={18} />
        )}
        {uploading ? "내 드라이브에 박제 중…" : "사진 추가"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      {msg && <p className="mt-2 text-center text-xs text-sunday">{msg}</p>}
    </div>
  );
}
