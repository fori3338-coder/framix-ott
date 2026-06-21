import { useEffect, useState } from 'react';
import { supabase, type DbDrama, type DbEpisode, type DbEpisodeFocusPoint } from '../lib/supabase';
import { toFrontendDrama, toFrontendEpisode, groupFocusPointsByEpisodeId } from '../lib/mappers';
import type { Drama, Episode } from '../types';

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

        const episodeIds = ((episodesRes.data ?? []) as DbEpisode[]).map((e) => e.id);
        let focusPointsMap: Map<string, DbEpisodeFocusPoint[]> | undefined;
        if (episodeIds.length > 0) {
          // episode_focus_points 테이블이 없는 환경(마이그레이션 미적용)에서도 안전하게 동작
          const focusRes = await supabase
            .from('episode_focus_points')
            .select('*')
            .in('episode_id', episodeIds);
          if (!focusRes.error && focusRes.data) {
            focusPointsMap = groupFocusPointsByEpisodeId(focusRes.data as DbEpisodeFocusPoint[]);
          }
        }

        if (!cancelled && dramaRes.data) {
          setDrama(
            toFrontendDrama(
              dramaRes.data as DbDrama,
              (episodesRes.data ?? []) as DbEpisode[],
              focusPointsMap
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

      if (!cancelled && data) {
        const ep = data as DbEpisode;
        let seriesFallback: { thumbnail_url?: string | null; poster_url?: string | null } | undefined;
        if (!ep.thumbnail_url && ep.series_id) {
          const { data: seriesData } = await supabase
            .from('series')
            .select('thumbnail_url')
            .eq('id', ep.series_id)
            .single();
          if (seriesData) {
            const s = seriesData as DbDrama;
            seriesFallback = { thumbnail_url: s.thumbnail_url, poster_url: s.thumbnail_url };
          }
        }
        if (!cancelled) setEpisode(toFrontendEpisode(ep, seriesFallback));
      }
      if (!cancelled) setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [episodeId]);

  return { episode, loading };
}
