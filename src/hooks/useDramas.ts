import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Drama } from "../types";

type Series = {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  genre?: string | null;
  total_episodes?: number;
  status?: string;
  rating?: number;
};

// ─── Series(DB) → Drama(Frontend) 변환 ─────────────────────────────────────
function toDrama(s: Series): Drama {
  return {
    id: s.id,
    title: s.title,
    synopsis: s.description ?? "",
    poster: s.thumbnail_url ?? `https://picsum.photos/seed/${s.id}-poster/400/600`,
    backdrop: s.thumbnail_url ?? `https://picsum.photos/seed/${s.id}-backdrop/1280/720`,
    genres: s.genre ? [s.genre] : [],
    tags: [],
    rating: s.rating ?? 0,
    ageRating: "15+",
    year: new Date().getFullYear(),
    totalEpisodes: s.total_episodes ?? 0,
    episodeLength: "",
    cast: [],
    director: "",
    isOriginal: false,
    isNew: s.status === "new",
    isExclusive: false,
    views: 0,
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

      const normalized = (data || []).map((item: any) => toDrama(item));

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
