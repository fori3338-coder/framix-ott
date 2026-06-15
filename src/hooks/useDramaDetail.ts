import { useEffect, useState } from 'react';
import { supabase, type DbDrama, type DbEpisode } from '../lib/supabase';
import type { Drama, Episode } from '../types';

// Drama.ageRating 허용 리터럴 유니언
const VALID_AGE_RATINGS = ["전체", "12+", "15+", "19+"] as const;
type AgeRating = typeof VALID_AGE_RATINGS[number];

function toAgeRating(val: string | null | undefined): AgeRating {
  if (val && (VALID_AGE_RATINGS as readonly string[]).includes(val)) {
    return val as AgeRating;
  }
  return '15+';
}

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

function toFrontendDrama(d: DbDrama, episodes: DbEpisode[]): Drama {
  return {
    id: d.id,
    title: d.title,
    synopsis: d.description ?? '',
    poster: d.thumbnail_url ?? `https://picsum.photos/seed/${d.id}-poster/400/600`,
    backdrop: d.backdrop_url ?? d.thumbnail_url ?? `https://picsum.photos/seed/${d.id}-backdrop/1280/720`,
    genres: d.genres ?? (d.genre ? [d.genre] : []),
    tags: d.tags ?? [],
    rating: d.rating ?? 0,
    ageRating: toAgeRating(d.age_rating),
    year: new Date().getFullYear(),
    totalEpisodes: d.total_episodes,
    episodeLength: '',
    cast: [],
    director: '',
    isOriginal: d.is_original ?? false,
    isNew: d.is_new ?? false,
    isExclusive: d.is_exclusive ?? false,
    views: d.views ?? 0,
    episodes: episodes.map(toFrontendEpisode),
  };
}

export function useDramaDetail(id: string | undefined) {
  const [drama, setDrama] = useState<Drama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
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

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  return { drama, loading, error };
}

export function useEpisode(episodeId: string | undefined) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!episodeId) { setLoading(false); return; }
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const { data } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', episodeId)
        .single();

      if (!cancelled && data) setEpisode(toFrontendEpisode(data as DbEpisode));
      if (!cancelled) setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [episodeId]);

  return { episode, loading };
}
