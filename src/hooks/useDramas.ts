import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { dramas as mockDramas } from "../data/mockData";
import type { Drama } from "../types";

type Series = {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  backdrop_url?: string;
  genre?: string | null;
  genres?: string[] | null;
  total_episodes?: number;
  status?: string;
  rating?: number;
  views?: number;
  is_original?: boolean | null;
  is_exclusive?: boolean | null;
  is_new?: boolean | null;
  age_rating?: string | null;
};

function toDrama(s: Series): Drama {
  return {
    id: s.id,
    title: s.title,
    synopsis: s.description ?? "",
    poster: s.thumbnail_url ?? `https://picsum.photos/seed/${s.id}-poster/400/600`,
    backdrop:
      s.backdrop_url ??
      s.thumbnail_url ??
      `https://picsum.photos/seed/${s.id}-backdrop/1280/720`,
    genres: s.genres ?? (s.genre ? [s.genre] : []),
    tags: [],
    rating: s.rating ?? 0,
    ageRating: (s.age_rating as Drama["ageRating"]) ?? "15+",
    year: new Date().getFullYear(),
    totalEpisodes: s.total_episodes ?? 0,
    episodeLength: "10-15분",
    cast: [],
    director: "",
    isOriginal: s.is_original ?? false,
    isNew: s.is_new ?? s.status === "new",
    isExclusive: s.is_exclusive ?? false,
    views: s.views ?? 0,
    episodes: [],
  };
}

export function useDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  // error state removed

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("series")
          .select("*")
          .eq("status", "active");

        if (error || !data || data.length === 0) {
          // Supabase 실패 또는 데이터 없음 → mockData fallback
          setDramas(mockDramas);
        } else {
          setDramas(data.map((item: any) => toDrama(item)));
        }
      } catch (e) {
        // 네트워크 오류 등 → mockData fallback
        setDramas(mockDramas);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const trending = [...dramas]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  const romance = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("로맨스"))
  );

  const revenge = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("복수"))
  );

  const office = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("오피스"))
  );

  const recommended = [...dramas]
    .sort((a, b) => {
      const scoreA = (a.rating || 0) * 2 + (a.views || 0) * 0.000001 + (a.isNew ? 2 : 0);
      const scoreB = (b.rating || 0) * 2 + (b.views || 0) * 0.000001 + (b.isNew ? 2 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  return {
    dramas,
    loading,

    trending,
    romance,
    revenge,
    office,
    recommended,
  };
}
