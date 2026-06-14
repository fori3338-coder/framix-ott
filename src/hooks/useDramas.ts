import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Drama } from "../types";

type Series = {
  id: string;
  title: string;
  english_title?: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  logo?: string;
  genres?: string[];
  rating?: number;
  age_rating?: "전체" | "12+" | "15+" | "19+";
  year?: number;
  total_episodes?: number;
  views?: number;
  is_new?: boolean;
  is_original?: boolean;
  is_exclusive?: boolean;
  cast?: string[];
  director?: string;
  tags?: string[];
  episode_length?: string;
  status?: string;
};

// ─── Series(DB) → Drama(Frontend) 변환 ─────────────────────────────────────
function toDrama(s: Series): Drama {
  return {
    id: s.id,
    title: s.title,
    englishTitle: s.english_title,
    synopsis: s.description ?? "",
    poster: s.thumbnail ?? `https://picsum.photos/seed/${s.id}-poster/400/600`,
    backdrop: s.backdrop ?? s.thumbnail ?? `https://picsum.photos/seed/${s.id}-backdrop/1280/720`,
    logo: s.logo,
    genres: s.genres ?? [],
    tags: s.tags ?? [],
    rating: s.rating ?? 0,
    ageRating: s.age_rating ?? "15+",
    year: s.year ?? new Date().getFullYear(),
    totalEpisodes: s.total_episodes ?? 0,
    episodeLength: s.episode_length ?? "",
    cast: s.cast ?? [],
    director: s.director ?? "",
    isOriginal: s.is_original ?? false,
    isNew: s.is_new ?? false,
    isExclusive: s.is_exclusive ?? false,
    views: s.views ?? 0,
    episodes: [],
  };
}

export function useDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("series")
        .select("*")
        .eq("status", "active");

      if (error) {
        setError(error);
        setLoading(false);
        return;
      }

      const normalized = (data || []).map((item: any) =>
        toDrama({
          ...item,
          genres: Array.isArray(item.genres)
            ? item.genres
            : item.genres
            ? [item.genres]
            : [],
        })
      );

      setDramas(normalized);
      setLoading(false);
    };

    fetchData();
  }, []);

  // =========================
  // AUTO CATEGORY SYSTEM
  // =========================

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

  const action = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("액션"))
  );

  const comedy = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("코미디"))
  );

  const recommended = [...dramas]
    .sort((a, b) => {
      const scoreA =
        (a.rating || 0) * 2 +
        (a.views || 0) * 0.000001 +
        (a.isNew ? 2 : 0);

      const scoreB =
        (b.rating || 0) * 2 +
        (b.views || 0) * 0.000001 +
        (b.isNew ? 2 : 0);

      return scoreB - scoreA;
    })
    .slice(0, 10);

  return {
    dramas,
    loading,
    error,
    trending,
    romance,
    revenge,
    office,
    action,
    comedy,
    recommended,
  };
}
