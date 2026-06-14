import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { ContinueWatchingItem } from "../types";

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
          episodes ( id, series_id, episode_number )
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
          const DURATION_SEC = 720; // 기본 12분 기준
          const progress = Math.min(
            Math.round((row.progress_seconds / DURATION_SEC) * 100),
            99
          );
          return {
            dramaId: ep.series_id as string,
            episodeId: ep.id as string,
            progress,
            lastWatched: row.watched_at as string,
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

  return { items, loading, isLoggedIn: !!userId };
}
