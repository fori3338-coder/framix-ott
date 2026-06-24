/**
 * Home.tsx — FRAMIX Home V11 FINAL
 *
 * 섹션 구조 (6개 고정):
 *   Hero
 *   → S1: Continue Watching
 *   → S2: TOP 10
 *   → S3: FRAMIX ORIGINAL
 *   → S4: My List
 *   → Footer
 */
import { Link } from "react-router-dom";
import { useState, useCallback, useEffect, useMemo } from "react";

import HeroBanner from "../components/HeroBanner";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import FramixOriginalStrip from "../components/FramixOriginalStrip";
import Top10Section from "../components/home/Top10Section";
import MyListSection from "../components/home/MyListSection";
import Footer from "../components/layout/Footer";
import ShowcaseRow from "../components/ShowcaseRow";
import GenreHubSection from "../components/home/GenreHubSection";

import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";
import { useFavorites } from "../hooks/useFavorites";
import { useRecommendations } from "../hooks/useRecommendations";
import { getRecommendationReason } from "../lib/premiumStats";
import type { Drama } from "../types";

import {
  showcaseTop10,
  showcaseNewEpisodes,
  showcaseRomance,
  showcaseRevenge,
  showcaseOriginals,
} from "../data/showcaseData";

function merge(dbDramas: Drama[], showcase: Drama[]): Drama[] {
  const dbIds = new Set(dbDramas.map((d) => d.id));
  return [...dbDramas, ...showcase.filter((s) => !dbIds.has(s.id))];
}

// ── Loading Skeleton ─────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="w-full hero-v11-root bg-surface-2" />
      <div className="mt-10 space-y-14 px-5 md:px-12">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-6 bg-surface-2 rounded-md w-48 mb-2" />
            <div className="h-3 bg-surface-2 rounded w-64 mb-5" />
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="w-[120px] sm:w-[150px] md:w-[170px] aspect-[2/3] rounded-xl bg-surface-2 shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Home Component ───────────────────────────────────────────────────
export default function Home() {
  const { dramas, loading, trending } = useDramas();
  const { items: continueWatchingItems, isLoggedIn, reload: reloadCW } = useContinueWatching();
  const { favoriteIds, isLoggedIn: favLoggedIn } = useFavorites();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  const [removedEpisodeIds, setRemovedEpisodeIds] = useState<Set<string>>(new Set());
  const handleRemoveCW = useCallback(
    (episodeId: string) => {
      setRemovedEpisodeIds((prev) => new Set(prev).add(episodeId));
      setTimeout(() => reloadCW(), 800);
    },
    [reloadCW]
  );

  const visibleCWItems = continueWatchingItems.filter(
    (item) => !removedEpisodeIds.has(item.episodeId)
  );

  const allDramas = useMemo(() => {
    const base = merge(dramas, [
      ...showcaseTop10,
      ...showcaseNewEpisodes,
      ...showcaseRomance,
      ...showcaseRevenge,
      ...showcaseOriginals,
    ]);
    const seen = new Set<string>();
    return base.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [dramas]);

  const sections = useRecommendations({
    allDramas,
    continueWatchingItems,
    favoriteIds,
  });

  if (loading) return <HomeSkeleton />;

  const bannerPicks = [...dramas]
    .filter((d) => d.isBanner)
    .sort((a, b) => (a.bannerOrder ?? 0) - (b.bannerOrder ?? 0));
  const heroList =
    bannerPicks.length > 0
      ? bannerPicks
      : merge(trending, showcaseTop10).slice(0, 5);

  const favoritedList = favoriteIds
    .map((fid) => allDramas.find((d) => d.id === fid))
    .filter((d): d is Drama => Boolean(d));

  // 추천 이유 (Because you watched / liked ...)
  const recommendationReason = getRecommendationReason(
    continueWatchingItems,
    favoritedList,
    allDramas
  );

  return (
    <div className="pb-0 home-v4-root">
      {/* ── Hero Banner ────────────────────────────────────────────────── */}
      <HeroBanner dramas={heroList} />

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="home-v4-content">

        {/* ── S1. Continue Watching ──────────────────────────────────── */}
        <div id="continue-watching-section">
          {isLoggedIn && visibleCWItems.length > 0 && (
            <ContinueWatchingRow
              items={visibleCWItems}
              onRemove={handleRemoveCW}
            />
          )}
        </div>

        {/* ── S2. TOP 10 ────────────────────────────────────────────── */}
        <Top10Section dramas={sections.top10} />

        {/* ── S3. FRAMIX ORIGINAL ───────────────────────────────────── */}
        <FramixOriginalStrip dramas={sections.originals} />

        {/* ── S4. Discovery: 급상승 (CMD-01) ──────────────────────── */}
        <ShowcaseRow
          title="급상승 중"
          subtitle="지금 이 순간 가장 뜨거운 작품"
          dramas={sections.risingNow}
          rowVariant="trending"
          badge="TODAY"
          cardVariant="default"
        />

        {/* ── S5. Discovery: AI Pick (CMD-01) ──────────────────── */}
        <ShowcaseRow
          title="AI Pick"
          subtitle="프레믹스 AI가 엄선한 오늘의 추천"
          dramas={sections.aiPick}
          rowVariant="aipick"
          badge="AI"
          cardVariant="default"
          reason={recommendationReason ?? undefined}
        />

        {/* ── S6. Discovery: 당신을 위한 추천 (CMD-01) ─────────── */}
        <ShowcaseRow
          title="당신을 위한 추천"
          subtitle="시청 기록 기반 맞춤 추천"
          dramas={sections.forYou}
          cardVariant="default"
          reason={recommendationReason ?? undefined}
        />


        {/* ── S7. GenreHub (CMD-04) ─────────────────────────────── */}
        <GenreHubSection
          romance={sections.romance}
          revenge={sections.revenge}
          chaebol={sections.chaebol}
          contract={sections.contract}
          timeloop={sections.timeloop}
        />

        {/* ── S8. My List ───────────────────────────────────────── */}
        <MyListSection
          favoritedList={favoritedList}
          continueWatchingItems={continueWatchingItems}
          allDramas={allDramas}
          isLoggedIn={favLoggedIn}
        />

        {dramas.length === 0 && (
          <div className="px-5 md:px-12 pb-8 text-center">
            <p className="text-xs text-white/25">
              <Link
                to="/admin/upload"
                className="text-white/50 underline underline-offset-2 hover:text-white/70"
              >
                콘텐츠를 등록
              </Link>
              하면 실제 작품이 상단에 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
