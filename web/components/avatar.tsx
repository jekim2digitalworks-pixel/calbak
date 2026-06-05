const COLORS = [
  "#C57B57", // 테라코타
  "#7A9E7E", // 세이지
  "#9E7AA0", // 모브
  "#6E8BA3", // 더스티블루
  "#C29B4E", // 머스터드
  "#B5705B", // 클레이
];

function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  name,
  src,
  size = 36,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name.trim().slice(0, 1) || "?";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: colorFor(name),
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </span>
  );
}
