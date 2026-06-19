// ─────────────────────────────────────────────────────────────────────────
// DB → Frontend 타입 변환 (단일 진실 공급원)
//
// ⚠️ 이 파일이 만들어진 이유:
// useDramas.ts 와 useDramaDetail.ts 가 각자 자기만의 toDrama() 함수를 가지고
// 있었고, useDramas.ts 쪽은 episodes를 채우지 않아 Hero Banner "재생" 버튼이
// `/watch/{seriesId}/undefined` 로 이동해버리는 버그가 있었다.
// 변환 로직을 한 곳으로 모아두면, 한쪽만 고치고 다른 쪽을 까먹는 일을 막을 수 있다.
// ─────────────────────────────────────────────────────────────────────────
import type { DbDrama, DbEpisode } from "./supabase";
import type { Drama, Episode } from "../types";

const VALID_AGE_RATINGS = ["전체", "12+", "15+", "19+"] as const;
type AgeRating = (typeof VALID_AGE_RATINGS)[number];

function toAgeRating(val: string | null | undefined): AgeRating {
  if (val && (VALID_AGE_RATINGS as readonly string[]).includes(val)) {
    return val as AgeRating;
  }
  return "15+";
}

export function toFrontendEpisode(e: DbEpisode): Episode {
  return {
    id: e.id,
    number: e.episode_number,
    title: e.title,
    duration: e.duration ?? "00:00",
    thumbnail: e.thumbnail_url ?? `https://picsum.photos/seed/${e.id}/400/225`,
    isFree: e.is_free ?? true,
    videoUrl: e.video_url ?? undefined,
    progress: 0,
    subtitles: e.subtitles ?? {},
  };
}

// episodes는 항상 episode_number 순으로 정렬해서 넣어준다.
// (episodes[0] = 1화 라는 가정을 HeroBanner, DramaDetail 등 여러 곳에서 쓰고 있음)
export function toFrontendDrama(d: DbDrama, episodes: DbEpisode[] = []): Drama {
  const sortedEpisodes = [...episodes].sort((a, b) => a.episode_number - b.episode_number);

  return {
    id: d.id,
    title: d.title,
    englishTitle: d.english_title ?? undefined,
    synopsis: d.description ?? "",
    poster: d.thumbnail_url ?? `https://picsum.photos/seed/${d.id}-poster/400/600`,
    backdrop:
      d.backdrop_url ?? d.thumbnail_url ?? `https://picsum.photos/seed/${d.id}-backdrop/1280/720`,
    genres: d.genres ?? (d.genre ? [d.genre] : []),
    tags: d.tags ?? [],
    rating: d.rating ?? 0,
    ageRating: toAgeRating(d.age_rating),
    year: new Date().getFullYear(),
    totalEpisodes: d.total_episodes ?? sortedEpisodes.length,
    episodeLength: "10-15분",
    cast: [],
    director: "",
    isOriginal: d.is_original ?? false,
    isNew: d.is_new ?? d.status === "new",
    isExclusive: d.is_exclusive ?? false,
    views: d.views ?? 0,
    episodes: sortedEpisodes.map(toFrontendEpisode),
    isBanner: d.banner_enabled ?? false,
    bannerOrder: d.banner_order ?? 0,
    top10Rank: d.top10_rank ?? null,
  };
}

// series id 목록으로 episodes를 한 번에 불러와 series_id별로 묶어주는 헬퍼.
// (목록 화면에서 시리즈마다 매번 따로 쿼리를 보내는 N+1 문제를 피하기 위함)
export function groupEpisodesBySeriesId(episodes: DbEpisode[]): Map<string, DbEpisode[]> {
  const map = new Map<string, DbEpisode[]>();
  for (const ep of episodes) {
    const list = map.get(ep.series_id) ?? [];
    list.push(ep);
    map.set(ep.series_id, list);
  }
  return map;
}
