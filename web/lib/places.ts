import "server-only";

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * 장소 검색. KAKAO_REST_KEY가 있으면 카카오 장소검색(한국 최적),
 * 없거나 실패하면 OSM Nominatim(무료·키 불필요)로 폴백.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (kakaoKey) {
    try {
      const r = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?size=8&query=${encodeURIComponent(q)}`,
        { headers: { Authorization: `KakaoAK ${kakaoKey}` } },
      );
      if (r.ok) {
        const j = (await r.json()) as {
          documents?: {
            place_name: string;
            address_name?: string;
            road_address_name?: string;
            x: string;
            y: string;
          }[];
        };
        return (j.documents ?? []).map((d) => ({
          name: d.place_name,
          address: d.road_address_name || d.address_name || "",
          lat: parseFloat(d.y),
          lng: parseFloat(d.x),
        }));
      }
    } catch {
      // OSM으로 폴백
    }
  }

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=ko&countrycodes=kr&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "calbak/0.1 (calbak memory app)" } },
    );
    if (!r.ok) return [];
    const arr = (await r.json()) as {
      name?: string;
      display_name?: string;
      lat: string;
      lon: string;
    }[];
    return (arr ?? []).map((d) => ({
      name: d.name && d.name.trim() ? d.name : (d.display_name?.split(",")[0] ?? q),
      address: d.display_name ?? "",
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
  } catch {
    return [];
  }
}
