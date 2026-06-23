import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface FavoriteItem {
  id: string;         // user_favorites.id
  drama_id: string;
  created_at: string;
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 로그인 유저 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // 즐겨찾기 목록 로드
  const load = useCallback(async () => {
    if (!userId) {
      setFavoriteIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("user_favorites")
        .select("drama_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setFavoriteIds((data ?? []).map((r: any) => r.drama_id as string));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // 즐겨찾기 추가
  const addFavorite = useCallback(async (seriesId: string) => {
    if (!userId) return;
    // 낙관적 업데이트
    setFavoriteIds((prev) => [seriesId, ...prev]);
    const { error: err } = await supabase
      .from("user_favorites")
      .insert({ user_id: userId, drama_id: seriesId });
    if (err) {
      // 롤백
      setFavoriteIds((prev) => prev.filter((id) => id !== seriesId));
      setError(err.message);
    }
  }, [userId]);

  // 즐겨찾기 제거
  const removeFavorite = useCallback(async (seriesId: string) => {
    if (!userId) return;
    // 낙관적 업데이트
    setFavoriteIds((prev) => prev.filter((id) => id !== seriesId));
    const { error: err } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("drama_id", seriesId);
    if (err) {
      // 롤백
      setFavoriteIds((prev) => [seriesId, ...prev]);
      setError(err.message);
    }
  }, [userId]);

  // 토글
  const toggleFavorite = useCallback(async (seriesId: string) => {
    if (favoriteIds.includes(seriesId)) {
      await removeFavorite(seriesId);
    } else {
      await addFavorite(seriesId);
    }
  }, [favoriteIds, addFavorite, removeFavorite]);

  const isFavorite = useCallback(
    (seriesId: string) => favoriteIds.includes(seriesId),
    [favoriteIds]
  );

  return {
    favoriteIds,
    loading,
    error,
    isLoggedIn: !!userId,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    reload: load,
  };
}
