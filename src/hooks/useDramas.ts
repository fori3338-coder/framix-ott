import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  year?: number;
  total_episodes?: number;
  views?: number;
  is_new?: boolean;
  is_original?: boolean;
  is_exclusive?: boolean;
  cast?: string[];
  director?: string;
  tags?: string[];
  episode_length?: number;
  status?: string;
};

export function useDramas() {
  const [dramas, setDramas] = useState<Series[]>([]);
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

      const normalized = (data || []).map((item: any) => ({
        ...item,
        genres: Array.isArray(item.genres)
          ? item.genres
          : item.genres
          ? [item.genres]
          : [],
      }));

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
        (a.is_new ? 2 : 0);

      const scoreB =
        (b.rating || 0) * 2 +
        (b.views || 0) * 0.000001 +
        (b.is_new ? 2 : 0);

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
