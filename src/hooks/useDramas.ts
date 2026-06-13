import { useEffect, useState } from 'react';
import { supabase, type DbDrama } from '../lib/supabase';
import type { Drama } from '../types';

// ─── DbDrama → Drama 변환 ─────────────────────────────────────────────────────
function toFrontendDrama(d: DbDrama): Drama {
  return {
    id: d.id,
    title: d.title,
    englishTitle: d.english_title ?? undefined,
    synopsis: d.synopsis ?? '',
    poster: d.poster_url ?? `https://picsum.photos/seed/${d.id}-poster/400/600`,
    backdrop: d.backdrop_url ?? `https://picsum.photos/seed/${d.id}-backdrop/1280/720`,
    genres: d.genres ?? [],
    tags: d.tags ?? [],
    rating: d.rating ?? 0,
    ageRating: (d.age_rating as Drama['ageRating']) ?? '15+',
    year: d.year,
    totalEpisodes: d.total_episodes,
    episodeLength: d.episode_length ?? '',
    cast: d.cast ?? [],
    director: d.director ?? '',
    isOriginal: d.is_original,
    isNew: d.is_new,
    isExclusive: d.is_exclusive,
    views: d.views,
    episodes: [],
  };
}

// ─── 전체 드라마 목록 (Realtime 구독 포함) ───────────────────────────────────
export function useDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('dramas')
          .select('*')
          .order('created_at', { ascending: false });

        if (err) throw err;
        if (!cancelled) setDramas((data ?? []).map(toFrontendDrama));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    // ── Realtime 구독: dramas 테이블 INSERT/UPDATE/DELETE 시 즉시 반영 ──────
    const channel = supabase
      .channel('dramas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dramas' },
        () => {
          // 변경 감지 시 전체 목록 재조회 (단순 재페치가 안정적)
          if (!cancelled) fetchAll();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { dramas, loading, error };
}

// ─── 단일 드라마 조회 (ID 기반) ───────────────────────────────────────────────
export function useDramaById(id: string | undefined) {
  const [drama, setDrama] = useState<Drama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('dramas')
          .select('*')
          .eq('id', id)
          .single();

        if (err) throw err;
        if (!cancelled && data) setDrama(toFrontendDrama(data as DbDrama));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [id]);

  return { drama, loading, error };
}

// ─── 검색 ─────────────────────────────────────────────────────────────────────
export function useSearchDramas(query: string) {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setDramas([]); return; }
    let cancelled = false;
    setLoading(true);

    async function fetch() {
      try {
        const { data } = await supabase
          .from('dramas')
          .select('*')
          .or(`title.ilike.%${query}%,english_title.ilike.%${query}%`)
          .limit(20);

        if (!cancelled) setDramas((data ?? []).map(toFrontendDrama));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(fetch, 300); // debounce
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return { dramas, loading };
}
