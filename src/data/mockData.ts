import type { Drama, ContinueWatchingItem, HistoryItem, SubscriptionPlan } from "../types";
import { posterImages, bannerImages } from "./localImages";

const genresPool = [
  "재벌", "복수", "회귀", "로맨스", "오피스", "쌍둥이", "계약결혼", "운명",
  "서스펜스", "성장", "가족", "스릴러",
];

function makeEpisodes(dramaId: string, count: number): Drama["episodes"] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${dramaId}-ep${i + 1}`,
    number: i + 1,
    title: `${i + 1}화`,
    duration: `${10 + (i % 5)}:${(15 + i * 3) % 60 < 10 ? "0" : ""}${(15 + i * 3) % 60}`,
    thumbnail: `https://picsum.photos/seed/${dramaId}-ep${i + 1}/400/225`,
    isFree: i < 3,
    progress: 0,
  }));
}

const titles = [
  { title: "재벌집 그녀의 계약", en: "Contract with a Chaebol", year: 2025 },
  { title: "다시 만난 운명", en: "Fated Encounter", year: 2025 },
  { title: "비서님의 비밀", en: "My Secretary's Secret", year: 2024 },
  { title: "이혼 후 첫사랑", en: "First Love After Divorce", year: 2025 },
  { title: "황제의 신부", en: "The Emperor's Bride", year: 2024 },
  { title: "쌍둥이 재벌가의 음모", en: "Twin Conglomerate Conspiracy", year: 2025 },
  { title: "복수의 여신", en: "Goddess of Revenge", year: 2025 },
  { title: "운명적인 그날 밤", en: "That Fateful Night", year: 2024 },
  { title: "회장님의 숨겨진 딸", en: "The Chairman's Hidden Daughter", year: 2025 },
  { title: "계약 신혼부부", en: "Contract Newlyweds", year: 2024 },
  { title: "사내 비밀 연애", en: "Office Secret Romance", year: 2025 },
  { title: "재회, 그리고 복수", en: "Reunion and Revenge", year: 2025 },
  { title: "버려진 신부의 역습", en: "The Abandoned Bride Strikes Back", year: 2025 },
  { title: "도련님의 사랑법", en: "The Young Master's Way of Love", year: 2024 },
  { title: "타임루프 신혼일기", en: "Time Loop Honeymoon", year: 2025 },
  { title: "재벌 3세는 처음이라", en: "First Time with a Chaebol Heir", year: 2025 },
  { title: "절대 갑, 절대 을", en: "Absolute Power, Absolute Devotion", year: 2024 },
  { title: "그 남자의 정체", en: "His True Identity", year: 2025 },
  { title: "엄마는 재벌이었다", en: "Mom Was a Chaebol", year: 2024 },
  { title: "위장 결혼 24시", en: "24 Hours of Fake Marriage", year: 2025 },
];

function pickGenres(i: number): string[] {
  const g1 = genresPool[i % genresPool.length];
  const g2 = genresPool[(i + 3) % genresPool.length];
  const g3 = genresPool[(i + 7) % genresPool.length];
  return [g1, g2, g3];
}

export const dramas: Drama[] = titles.map((t, i) => {
  const id = `drama-${i + 1}`;
  const episodeCount = 12 + (i % 4) * 4;
  return {
    id,
    title: t.title,
    englishTitle: t.en,
    synopsis:
      "평범한 그녀의 인생을 송두리째 바꿔놓은 하룻밤의 계약. 재벌가의 숨겨진 비밀과 얽히며 시작된 위험한 사랑, 그리고 되돌릴 수 없는 운명의 소용돌이가 펼쳐진다. 매회 반전이 쏟아지는 몰입감 100% 쇼츠 드라마.",
    poster: posterImages[i] ?? `https://picsum.photos/seed/${id}-poster/400/600`,
    backdrop: bannerImages[i] ?? `https://picsum.photos/seed/${id}-backdrop/1280/720`,
    genres: pickGenres(i),
    tags: ["#사이다", "#반전", "#몰입감폭발"],
    rating: Math.round((7 + (i % 30) / 10) * 10) / 10,
    ageRating: (["전체", "12+", "15+", "19+"] as const)[i % 4],
    year: t.year,
    totalEpisodes: episodeCount,
    episodeLength: "10-15분",
    cast: ["배우 A", "배우 B", "배우 C"],
    director: "연출 김감독",
    isOriginal: i < bannerImages.length,
    isNew: i % 4 === 1,
    isExclusive: i % 6 === 0,
    views: 1000000 + i * 137000,
    episodes: makeEpisodes(id, episodeCount),
  };
});

export const continueWatching: ContinueWatchingItem[] = [
  { dramaId: "drama-1", episodeId: "drama-1-ep4", progress: 62, lastWatched: "2026-06-12T20:00:00Z" },
  { dramaId: "drama-3", episodeId: "drama-3-ep2", progress: 30, lastWatched: "2026-06-12T10:00:00Z" },
  { dramaId: "drama-7", episodeId: "drama-7-ep8", progress: 85, lastWatched: "2026-06-11T22:00:00Z" },
  { dramaId: "drama-10", episodeId: "drama-10-ep1", progress: 12, lastWatched: "2026-06-10T18:00:00Z" },
];

export const watchHistory: HistoryItem[] = [
  { dramaId: "drama-1", episodeId: "drama-1-ep3", watchedAt: "2026-06-12T19:00:00Z", progress: 100 },
  { dramaId: "drama-1", episodeId: "drama-1-ep2", watchedAt: "2026-06-12T18:30:00Z", progress: 100 },
  { dramaId: "drama-3", episodeId: "drama-3-ep1", watchedAt: "2026-06-12T09:00:00Z", progress: 100 },
  { dramaId: "drama-7", episodeId: "drama-7-ep7", watchedAt: "2026-06-11T21:00:00Z", progress: 100 },
  { dramaId: "drama-10", episodeId: "drama-10-ep1", watchedAt: "2026-06-10T17:30:00Z", progress: 45 },
  { dramaId: "drama-5", episodeId: "drama-5-ep1", watchedAt: "2026-06-09T13:00:00Z", progress: 100 },
  { dramaId: "drama-12", episodeId: "drama-12-ep2", watchedAt: "2026-06-08T22:00:00Z", progress: 100 },
];

export const myListIds: string[] = ["drama-2", "drama-4", "drama-7", "drama-9", "drama-13", "drama-16"];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "베이직",
    price: 4900,
    currency: "KRW",
    period: "monthly",
    perks: ["광고 포함 시청", "HD 720p 화질", "1개 기기 동시 시청", "신작 드라마 7일 후 시청"],
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 9900,
    currency: "KRW",
    period: "monthly",
    highlight: true,
    badge: "가장 인기",
    perks: [
      "광고 없이 무제한 시청",
      "Full HD 1080p 화질",
      "4개 기기 동시 시청",
      "신작 드라마 출시 즉시 시청",
      "FRAMIX 오리지널 전체 시청",
      "다운로드 오프라인 시청",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    price: 14900,
    currency: "KRW",
    period: "monthly",
    badge: "프리미엄+",
    perks: [
      "광고 없이 무제한 시청",
      "4K UHD + Dolby Atmos",
      "6개 기기 동시 시청",
      "독점 콘텐츠 최우선 공개",
      "FRAMIX 오리지널 전체 시청",
      "다운로드 오프라인 시청",
      "VIP 전용 굿즈 & 이벤트",
    ],
  },
];

export function getDramaById(id: string | undefined): Drama | undefined {
  return dramas.find((d) => d.id === id);
}

export function getEpisodeById(drama: Drama | undefined, episodeId: string | undefined) {
  return drama?.episodes.find((e) => e.id === episodeId);
}
