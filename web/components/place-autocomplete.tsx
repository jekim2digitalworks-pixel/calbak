"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type Place = { name: string; address: string; lat: number; lng: number };

export function PlaceAutocomplete() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onChange(v: string) {
    setQ(v);
    setCoords(null); // 직접 수정하면 이전 좌표 무효
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(v)}`);
        const j = await r.json();
        setResults(j.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }

  function pick(p: Place) {
    setQ(p.name);
    setCoords({ lat: p.lat, lng: p.lng });
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        name="place"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        placeholder="장소 검색 (선택)"
        className="h-12 w-full rounded-2xl border border-border bg-background px-4 outline-none focus:border-accent"
      />
      <input type="hidden" name="place_lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="place_lng" value={coords?.lng ?? ""} />

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(42,38,34,0.12)]">
          {results.map((p, i) => (
            <li key={i} className="border-b border-border/50 last:border-0">
              <button
                type="button"
                onClick={() => pick(p)}
                className="flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent-soft/20"
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  {p.address && (
                    <span className="block truncate text-xs text-muted">
                      {p.address}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
