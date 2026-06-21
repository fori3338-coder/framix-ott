import { useEffect, useState } from 'react';
import { supabase, type DbDrama, type DbEpisode } from '../lib/supabase';
import { toFrontendDrama, toFrontendEpisode } from '../lib/mappers';
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
