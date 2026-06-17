import { useEffect, useState } from "react";
import { supabase, type DbDrama, type DbEpisode } from "../lib/supabase";
import { dramas as mockDramas } from "../data/mockData";
import { toFrontendDrama, groupEpisodesBySeriesId } from "../lib/mappers";
import type { Drama } from "../types";

export function useDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  // error state removed

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("series")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (error || !data || data.length < 5) {
          // Supabase 실패 또는 데이터 없음 → mockData fallback
          setDramas(mockDramas);
          setLoading(false);
          return;
        }

        // ── 에피소드 일괄 조회 ────────────────────────────────────────────
        // ⚠️ 과거 버그: 이 부분이 없어서 모든 Drama.episodes가 항상 []였음.
        // 그 결과 Hero Banner의 "재생" 버튼이 drama.episodes[0]?.id를
        // 찾지 못해 /watch/{id}/undefined 로 이동 → Not Found 발생.
        // (DramaDetail 페이지는 useDramaDetail에서 별도로 episodes를
        //  불러오기 때문에 TOP10 → 상세페이지 → 에피소드 클릭 흐름은 정상이었음)
        const seriesIds = data.map((s: DbDrama) => s.id);
        const { data: episodesData, error: episodesError } = await supabase
          .from("episodes")
          .select("*")
          .in("series_id", seriesIds)
          .order("episode_number", { ascending: true });

        if (episodesError) {
          console.error("[useDramas] 에피소드 조회 실패:", episodesError);
        }

        const episodesBySeriesId = groupEpisodesBySeriesId(
          (episodesData ?? []) as DbEpisode[]
        );

        setDramas(
          data.map((item: DbDrama) =>
            toFrontendDrama(item, episodesBySeriesId.get(item.id) ?? [])
          )
        );
      } catch (e) {
        // 네트워크 오류 등 → mockData fallback
        console.error("[useDramas] 조회 실패:", e);
        setDramas(mockDramas);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const trending = [...dramas]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  // 신작: isNew=true인 항목 우선, 없으면 전체 dramas에서 최신 등록순(배열 역순)으로 최대 10개
  // → Supabase에서 is_new 미설정 작품도 반드시 노출
  const newEpisodes = (() => {
    const flagged = dramas.filter((d) => d.isNew);
    if (flagged.length > 0) return flagged;
    return [...dramas].reverse().slice(0, 10);
  })();

  const romance = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("로맨스"))
  );

  const revenge = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("복수"))
  );

  const office = dramas.filter((d) =>
    d.genres?.some((g) => g.includes("오피스"))
  );

  const recommended = [...dramas]
    .sort((a, b) => {
      const scoreA = (a.rating || 0) * 2 + (a.views || 0) * 0.000001 + (a.isNew ? 2 : 0);
      const scoreB = (b.rating || 0) * 2 + (b.views || 0) * 0.000001 + (b.isNew ? 2 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  return {
    dramas,
    loading,

    trending,
    newEpisodes,
    romance,
    revenge,
    office,
    recommended,
  };
}
