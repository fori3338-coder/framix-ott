import { useEffect, useState } from 'react';
import { supabase, type DbDrama, type DbEpisode } from '../lib/supabase';
import type { Drama, Episode } from '../types';

// ─── DbEpisode → Episode 변환 ─────────────────────────────────────────────────
function toFrontendEpisode(e: DbEpisode): Episode {
  return {
    id: e.id,
    number: e.episode_number,
    title: e.title,
    duration: e.duration ?? '00:00',
    thumbnail: e.thumbnail_url ?? `https://picsum.photos/seed/${e.id}/400/225`,
    isFree: e.is_free ?? true,
    videoUrl: e.video_url ?? undefined,
    progress: 0,
  };
}

// ─── DbDrama → Drama (에피소드 포함) ─────────────────────────────────────────
function toFrontendDrama(d: DbDrama, episodes: DbEpisode[]): Drama {
  return {
    id: d.id,
    title: d.title,
    synopsis: d.description ?? '',
    poster: d.thumbnail_url ?? `https://picsum.photos/seed/${d.id}-poster/400/600`,
    backdrop: d.thumbnail_url ?? `https://picsum.photos/seed/${d.id}-backdrop/1280/720`,
    genres: d.genre ? [d.genre] : [],
    tags: [],
    rating: d.rating ?? 0,
    ageRating: '15+',
    year: new Date().getFullYear(),
    totalEpisodes: d.total_episodes,
    episodeLength: '',
    cast: [],
    director: '',
    isOriginal: false,
    isNew: d.status === 'new',
    isExclusive: false,
    views: 0,
    episodes: episodes.map(toFrontendEpisode),
  };
}

// ─── 드라마 상세 + 에피소드 목록 조회 ────────────────────────────────────────
export function useDramaDetail(id: string | undefined) {
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
        // 드라마 + 에피소드 병렬 조회
        const [dramaRes, episodesRes] = await Promise.all([
          supabase.from('series').select('*').eq('id', id).single(),
          supabase
            .from('episodes')
            .select('*')
            .eq('series_id', id)
            .order('episode_number', { ascending: true }),
        ]);

        if (dramaRes.error) throw dramaRes.error;
        if (!cancelled && dramaRes.data) {
          setDrama(
            toFrontendDrama(
              dramaRes.data as DbDrama,
              (episodesRes.data ?? []) as DbEpisode[]
            )
          );
        }
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

// ─── 단일 에피소드 조회 (Player용) ───────────────────────────────────────────
export function useEpisode(episodeId: string | undefined) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!episodeId) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', episodeId)
        .single();

      if (!cancelled && data) setEpisode(toFrontendEpisode(data as DbEpisode));
      if (!cancelled) setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [episodeId]);

  return { episode, loading };
}
