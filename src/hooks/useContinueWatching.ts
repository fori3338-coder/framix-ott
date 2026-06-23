import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { ContinueWatchingItem } from "../types";

// "12:34" → 초
function parseDuration(d: string | null): number {
  if (!d) return 720; // 기본 12분
  const parts = d.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 720;
}

export function useContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("watch_history")
        .select(`
          episode_id,
          progress_seconds,
          completed,
          watched_at,
          episodes (
            id,
            series_id,
            episode_number,
            title,
            duration,
            thumbnail_url,
            series ( id, title, thumbnail_url )
          )
        `)
        .eq("user_id", userId)
        .eq("completed", false)
        .order("watched_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const mapped: ContinueWatchingItem[] = (data ?? [])
        .filter((row: any) => row.episodes && !row.completed)
        .map((row: any) => {
          const ep = row.episodes;
          const series = ep?.series ?? null;
          const durationSec = parseDuration(ep?.duration ?? null);
          const progressSec = row.progress_seconds ?? 0;
          const progress = Math.min(Math.round((progressSec / durationSec) * 100), 99);

          const FALLBACK = "/content/fallback-poster.svg";
          const poster = series?.thumbnail_url ?? FALLBACK;
          const thumbnail = ep?.thumbnail_url ?? poster;

          return {
            dramaId: ep.series_id as string,
            episodeId: ep.id as string,
            progress,
            progressSeconds: progressSec,
            durationSeconds: durationSec,
            lastWatched: row.watched_at as string,
            episodeNumber: ep.episode_number as number,
            episodeTitle: ep.title as string,
            seriesTitle: series?.title ?? "",
            poster,
            thumbnail,
          };
        });

      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, isLoggedIn: !!userId, reload: load };
}
