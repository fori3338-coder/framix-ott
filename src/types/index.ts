export interface Episode {
  id: string;
  number: number;
  title: string;
  duration: string; // e.g. "12:34"
  thumbnail: string;
  videoUrl?: string; // Supabase Storage URL (실제 영상)
  isFree: boolean;
  progress?: number; // 0-100, watch progress
  subtitles?: Record<string, string>; // { "ko": "url", "en": "url", ... }
  description?: string;
}

export interface Drama {
  id: string;
  title: string;
  englishTitle?: string;
  synopsis: string;
  poster: string; // vertical poster
  backdrop: string; // horizontal hero image
  logo?: string;
  genres: string[];
  tags: string[];
  rating: number; // 0-10
  ageRating: "전체" | "12+" | "15+" | "19+";
  year: number;
  totalEpisodes: number;
  episodeLength: string;
  cast: string[];
  director: string;
  isOriginal?: boolean;
  isNew?: boolean;
  isExclusive?: boolean;
  views: number;
  episodes: Episode[];
  isBanner?: boolean;
  bannerOrder?: number;
  top10Rank?: number | null;
  bannerTitle?: string | null;
  bannerDescription?: string | null;
  bannerVideoUrl?: string | null;
}

export interface ContinueWatchingItem {
  dramaId: string;
  episodeId: string;
  progress: number;         // 0-100 (실제 duration 기반)
  progressSeconds: number;  // 재생 위치 (초)
  durationSeconds: number;  // 전체 길이 (초)
  lastWatched: string;      // ISO date
  // 카드 표시용 메타
  episodeNumber: number;
  episodeTitle: string;
  seriesTitle: string;
  poster: string;
  thumbnail: string;
}

export interface HistoryItem {
  dramaId: string;
  episodeId: string;
  watchedAt: string;
  progress: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: "monthly" | "yearly";
  perks: string[];
  highlight?: boolean;
  badge?: string;
}
