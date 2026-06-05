"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * 사진 프록시 이미지. 업로드 직후 복제가 막 끝난 타이밍의 404는
 * 캐시버스터를 붙여 최대 2회 재시도하고, 그래도 실패하면 플레이스홀더.
 */
export function PhotoImg({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-accent-soft/20 text-accent/40">
        <ImageOff size={20} />
      </div>
    );
  }

  const src =
    attempt === 0 ? `/api/photos/${id}` : `/api/photos/${id}?r=${attempt}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="박제된 사진"
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => {
        if (attempt < 2) {
          setTimeout(() => setAttempt((a) => a + 1), 1200);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
