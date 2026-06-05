import Link from "next/link";
import { MessageCircle, ImagePlus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PhotoImg } from "@/components/photo-img";
import type { FeedItem } from "@/lib/feed";

const WD = "일월화수목금토";

function relDate(date: string, today: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = WD[new Date(y, m - 1, d).getDay()];
  const diff = Math.round(
    (Date.parse(date) - Date.parse(today)) / 86400000,
  );
  if (diff === 0) return "오늘";
  if (diff === -1) return "어제";
  if (diff === 1) return "내일";
  return `${m}월 ${d}일 ${wd}`;
}

function Photo({ id }: { id: string }) {
  return <PhotoImg id={id} />;
}

function PhotoArea({ item }: { item: FeedItem }) {
  const { photoIds, photoCount } = item;

  if (photoCount === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent-soft/40 to-accent-soft/10 text-accent/70">
        <ImagePlus size={26} strokeWidth={1.8} />
        <span className="text-xs font-medium">사진을 더해보세요</span>
      </div>
    );
  }
  if (photoCount === 1) {
    return (
      <div className="aspect-[4/3] w-full bg-background">
        <Photo id={photoIds[0]} />
      </div>
    );
  }
  if (photoCount === 2) {
    return (
      <div className="grid aspect-[2/1] grid-cols-2 gap-0.5 bg-background">
        {photoIds.slice(0, 2).map((id) => (
          <Photo key={id} id={id} />
        ))}
      </div>
    );
  }
  // 3개: 큰 1 + 작은 2 / 4개+: 2x2 (+N)
  if (photoCount === 3) {
    return (
      <div className="grid aspect-[3/2] grid-cols-3 grid-rows-2 gap-0.5 bg-background">
        <div className="col-span-2 row-span-2">
          <Photo id={photoIds[0]} />
        </div>
        <Photo id={photoIds[1]} />
        <Photo id={photoIds[2]} />
      </div>
    );
  }
  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 bg-background">
      {photoIds.slice(0, 4).map((id, i) => (
        <div key={id} className="relative">
          <Photo id={id} />
          {i === 3 && photoCount > 4 && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/45 text-xl font-bold text-white">
              +{photoCount - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FeedCard({ item, today }: { item: FeedItem; today: string }) {
  return (
    <Link
      href={`/memory/${item.id}`}
      className="block overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_4px_24px_rgba(42,38,34,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_34px_rgba(42,38,34,0.09)]"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar
          name={item.author?.nickname ?? "친구"}
          src={item.author?.avatar_url}
          size={38}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {item.author?.nickname ?? "친구"}
          </p>
          <p className="truncate text-xs text-muted">
            {relDate(item.date, today)}
            {item.place ? ` · ${item.place}` : ""}
          </p>
        </div>
      </header>

      <PhotoArea item={item} />

      <div className="px-4 py-3">
        <p className="font-semibold leading-snug">{item.title}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={14} /> {item.commentCount}
          </span>
          {item.photoCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImagePlus size={14} /> {item.photoCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
