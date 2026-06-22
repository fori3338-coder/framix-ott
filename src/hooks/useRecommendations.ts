/**
 * useRecommendations — FRAMIX AI 추천 엔진
 *
 * 추천 기준:
 *  1. 최근 시청 기반 장르 가중치
 *  2. 찜 목록 기반 장르 보정
 *  3. 조회수/평점 기반 인기도
 *  4. 랜덤 가중치 (매 홈 진입 시 다른 결과)
 *  5. 섹션 간 중복 콘텐츠 완전 제거
 */

import { useMemo } from "react";
import type { Drama, ContinueWatchingItem } from "../types";

interface RecommendInput {
  allDramas: Drama[];
  continueWatchingItems: ContinueWatchingItem[];
  favoriteIds: string[];
  watchedDramaIds?: string[];
}

export interface HomeSections {
  top10: Drama[];
  newEpisodes: Drama[];
  risingNow: Drama[]; // 급상승
  aiPick: Drama[];    // AI Pick — 매번 다른 후보
  forYou: Drama[];    // 당신을 위한 추천 (최근 시청 기반)
  romance: Drama[];
  revenge: Drama[];
  chaebol: Drama[];   // 재벌
  contract: Drama[];  // 계약결혼
  timeloop: Drama[];  // 타임루프
  originals: Drama[];
}

/** 간단한 seeded random (매 홈 진입마다 다른 값) */
function seededRandom(seed: number) {
  const x = Math.sin(seed + Date.now() * 0.00001) * 10000;
  return x - Math.floor(x);
}

/**
 * 장르 가중치 맵 계산
 * 최근 시청 드라마의 장르에 높은 가중치 부여 (최근일수록 더 높게)
 */
function buildGenreWeights(
  dramas: Drama[],
  cwItems: ContinueWatchingItem[],
  favoriteIds: string[]
): Map<string, number> {
  const weights = new Map<string, number>();

  // 최근 시청 기반 (최대 7개, 최신=높은 가중치)
  cwItems.slice(0, 7).forEach((item, idx) => {
    const d = dramas.find((x) => x.id === item.dramaId);
    if (!d) return;
    const w = 3 - idx * 0.3; // 최신 3.0, 점점 감소
    d.genres.forEach((g) => weights.set(g, (weights.get(g) ?? 0) + w));
  });

  // 찜 목록 기반 (가중치 1.5)
  favoriteIds.forEach((fid) => {
    const d = dramas.find((x) => x.id === fid);
    if (!d) return;
    d.genres.forEach((g) => weights.set(g, (weights.get(g) ?? 0) + 1.5));
  });

  return weights;
}

/** 드라마 개인화 점수 계산 */
function personalScore(
  drama: Drama,
  genreWeights: Map<string, number>,
  seed: number,
  index: number
): number {
  const genreScore = drama.genres.reduce(
    (acc, g) => acc + (genreWeights.get(g) ?? 0),
    0
  );
  const popularityScore =
    (drama.rating ?? 0) * 1.5 + (drama.views ?? 0) * 0.000001;
  const newBonus = drama.isNew ? 2 : 0;
  const randomBonus = seededRandom(seed + index) * 2; // 0~2 랜덤

  return genreScore + popularityScore + newBonus + randomBonus;
}

/** 중복 없이 N개 뽑기 */
function pickUnique(
  dramas: Drama[],
  usedIds: Set<string>,
  n: number
): Drama[] {
  const result: Drama[] = [];
  for (const d of dramas) {
    if (result.length >= n) break;
    if (!usedIds.has(d.id)) {
      result.push(d);
      usedIds.add(d.id);
    }
  }
  return result;
}

export function useRecommendations({
  allDramas,
  continueWatchingItems,
  favoriteIds,
}: RecommendInput): HomeSections {
  return useMemo(() => {
    if (allDramas.length === 0) {
      const empty: HomeSections = {
        top10: [], newEpisodes: [], risingNow: [], aiPick: [], forYou: [],
        romance: [], revenge: [], chaebol: [], contract: [], timeloop: [], originals: [],
      };
      return empty;
    }

    const seed = Math.floor(Date.now() / (1000 * 60 * 10)); // 10분마다 갱신
    const usedIds = new Set<string>();

    // ── 1. TOP 10 (조회수 기준) ──────────────────────────────────────────────
    const top10 = [...allDramas]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 10);
    top10.forEach((d) => usedIds.add(d.id));

    // ── 2. 신작 (isNew 우선, 없으면 최신 등록순) ───────────────────────────
    const newCandidates = [...allDramas].filter((d) => !usedIds.has(d.id));
    const flaggedNew = newCandidates.filter((d) => d.isNew);
    const newEpisodes = flaggedNew.length >= 6
      ? flaggedNew.slice(0, 10)
      : [...flaggedNew, ...newCandidates.filter((d) => !d.isNew)].slice(0, 10);
    newEpisodes.forEach((d) => usedIds.add(d.id));

    // ── 3. 급상승 (랜덤 가중치 + 평점 기반) ──────────────────────────────
    const risingCandidates = allDramas
      .filter((d) => !usedIds.has(d.id))
      .map((d, i) => ({
        drama: d,
        score: (d.rating ?? 0) * 2 + seededRandom(seed * 3 + i) * 5,
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.drama);
    const risingNow = pickUnique(risingCandidates, usedIds, 10);

    // ── 4. 장르 가중치 계산 ──────────────────────────────────────────────
    const genreWeights = buildGenreWeights(allDramas, continueWatchingItems, favoriteIds);

    // ── 5. AI Pick (매 진입마다 다른 후보, 랜덤 가중치 높음) ─────────────
    const aiCandidates = allDramas
      .filter((d) => !usedIds.has(d.id))
      .map((d, i) => ({
        drama: d,
        score: personalScore(d, genreWeights, seed * 7, i) + seededRandom(seed + i * 13) * 4,
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.drama);
    const aiPick = pickUnique(aiCandidates, usedIds, 10);

    // ── 6. 당신을 위한 추천 (최근 시청 기반, 장르 가중치 중심) ───────────
    const forYouCandidates = allDramas
      .filter((d) => !usedIds.has(d.id))
      .map((d, i) => ({
        drama: d,
        score: personalScore(d, genreWeights, seed * 2, i),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.drama);
    const forYou = pickUnique(forYouCandidates, usedIds, 10);

    // ── 7. 장르 섹션 (usedIds 고려 없이 순수 장르 필터, 단 각 섹션 내 중복 제거) ──
    const genreSection = (keyword: string, limit = 10): Drama[] => {
      const sectionUsed = new Set<string>();
      return allDramas
        .filter((d) => d.genres.some((g) => g.includes(keyword)))
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .filter((d) => {
          if (sectionUsed.has(d.id)) return false;
          sectionUsed.add(d.id);
          return true;
        })
        .slice(0, limit);
    };

    const romance = genreSection("로맨스");
    const revenge = genreSection("복수");
    const chaebol = genreSection("재벌");
    const contract = genreSection("계약");
    const timeloop = genreSection("회귀");

    // ── 8. FRAMIX ORIGINAL ────────────────────────────────────────────────
    const originals = allDramas
      .filter((d) => d.isOriginal)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 10);

    return {
      top10,
      newEpisodes,
      risingNow,
      aiPick,
      forYou,
      romance,
      revenge,
      chaebol,
      contract,
      timeloop,
      originals,
    };
  }, [allDramas, continueWatchingItems, favoriteIds]);
}
