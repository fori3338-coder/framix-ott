/**
 * premiumStats.ts — FRAMIX Premium UX helpers
 *
 * 추가된 OTT UX 기능 유틸리티:
 *   - formatViews()           : 누적 조회수 포맷 (1.24M / 24.5K)
 *   - getLiveViewerCount()    : 실시간 시청자 수 (deterministic per drama)
 *   - formatLiveCount()       : "2,341 Watching" 포맷
 *   - getReleaseCountdown()   : FRAMIX Original D-Day 카운트다운
 *   - getRecommendationReason(): 추천 이유 문구 생성
 *   - getFreeEpisodeLimit()   : Soft paywall 무료 시청 제한
 */
import type { Drama, ContinueWatchingItem } from "../types";

/** 누적 조회수 포맷: 1240000 → "1.24M Views" */
export function formatViews(views: number): string {
  if (!views || views < 0) return "0 Views";
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(2)}M Views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K Views`;
  return `${views} Views`;
}

/** 간단한 hash 함수 */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 실시간 시청자 수 (작품별 deterministic + 시간대별 변동)
 * 인기 작품일수록 더 많은 시청자. 10분마다 자연스럽게 변동.
 */
export function getLiveViewerCount(drama: Pick<Drama, "id" | "views" | "rating">): number {
  const base = Math.max(120, Math.min(8500, Math.floor((drama.views || 50_000) / 600)));
  const ratingBoost = Math.floor((drama.rating || 7) * 80);
  const seed = hashStr(drama.id);
  const timeWindow = Math.floor(Date.now() / (10 * 60 * 1000)); // 10분
  const variance = ((seed + timeWindow * 17) % 600) - 300; // -300 ~ +300
  return Math.max(80, base + ratingBoost + variance);
}

/** "2,341 Watching" 포맷 */
export function formatLiveCount(n: number): string {
  return `${n.toLocaleString("en-US")} Watching`;
}

/**
 * FRAMIX Original 출시 카운트다운
 * Original 작품 중 isNew일 때만 D-Day 표시 (mock: drama.id 기반 deterministic)
 * 반환값: "D-7" | "D-3" | "NOW OPEN" | null
 */
export function getReleaseCountdown(drama: Drama): string | null {
  if (!drama.isOriginal) return null;
  // mock: drama id로 출시일 결정 (-3 ~ +14일 범위)
  const seed = hashStr(drama.id);
  const offsetDays = (seed % 18) - 3; // -3 ~ +14
  if (offsetDays <= 0) {
    // 이미 출시됨 — 출시 후 3일 이내면 "NOW OPEN"
    return offsetDays >= -2 ? "NOW OPEN" : null;
  }
  return `D-${offsetDays}`;
}

/** Soft paywall — 무료 시청 가능 회차 수 */
export const FREE_EPISODE_LIMIT = 3;

export function getFreeEpisodeLimit(): number {
  return FREE_EPISODE_LIMIT;
}

/**
 * 추천 이유 문구 생성
 *   - "Because you watched <장르>"
 *   - "Because you liked <장르>"
 *   - fallback: null
 */
export function getRecommendationReason(
  cwItems: ContinueWatchingItem[],
  favoriteDramas: Drama[],
  allDramas: Drama[]
): string | null {
  // 최근 시청 기반
  const latest = cwItems[0];
  if (latest) {
    const d = allDramas.find((x) => x.id === latest.dramaId);
    const genre = d?.genres?.[0];
    if (genre) return `Because you watched ${genre}`;
  }
  // 찜 목록 기반
  const fav = favoriteDramas[0];
  const favGenre = fav?.genres?.[0];
  if (favGenre) return `Because you liked ${favGenre}`;
  return null;
}
