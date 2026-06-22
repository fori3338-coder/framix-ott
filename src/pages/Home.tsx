/**
 * Home.tsx — FRAMIX Premium OTT Home V4
 *
 * 섹션 구조 (V4):
 *   Hero
 *   → S1: Continue Watching
 *   → S2: 실시간 TOP10
 *   → S3: 당신만을 위한 추천 (AI Pick)
 *   → S4: 지금 급상승 중
 *   → separator
 *   → S5: FRAMIX ORIGINAL
 *   → S6: Editor's Choice
 *   → S7: 장르 허브
 *   → S8: 오늘의 발견
 *   → My List
 *   → Footer V4
 */
import { Link } from "react-router-dom";
import { useState, useCallback, useEffect, useMemo } from "react";

import HeroBanner from "../components/HeroBanner";
import ShowcaseRow from "../components/ShowcaseRow";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import FramixOriginalStrip from "../components/FramixOriginalStrip";
import GenreHub from "../components/GenreHub";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";
import { useFavorites } from "../hooks/useFavorites";
import { useRecommendations } from "../hooks/useRecommendations";
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

// ── Footer V4 ────────────────────────────────────────────────────────────────
function HomeFooter() {
  const serviceLinks = ["이용약관", "개인정보처리방침", "고객센터", "공지사항", "1:1 문의", "콘텐츠 파트너십"];
  return (
    <footer className="framix-footer-v4">
      <div className="framix-footer-v4-inner">
        {/* Logo */}
        <div className="framix-footer-v4-logo">FRAMIX</div>

        {/* Nav links */}
        <nav className="framix-footer-v4-nav">
          {serviceLinks.map((item) => (
            <span key={item} className="framix-footer-v4-link">
              {item}
            </span>
          ))}
        </nav>

        {/* Divider */}
        <div className="framix-footer-v4-divider" />

        {/* Copyright */}
        <p className="framix-footer-v4-copy">
          © 2025 FRAMIX. All rights reserved. · 본 서비스의 콘텐츠는 저작권법에 의해 보호됩니다.
        </p>
      </div>
    </footer>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="w-full h-[68vh] md:h-[88vh] min-h-[460px] bg-surface-2" />
      <div className="mt-10 space-y-14 px-5 md:px-12">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            <div className="h-6 bg-surface-2 rounded-md w-48 mb-2" />
            <div className="h-3 bg-surface-2 rounded w-64 mb-5" />
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div
                  key={j}
                  className="w-[120px] sm:w-[150px] md:w-[170px] aspect-[2/3] rounded-xl bg-surface-2 shrink-0"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Home Component ───────────────────────────────────────────────────────
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

        {/* ── S2. 실시간 TOP 10 ──────────────────────────────────────── */}
        <ShowcaseRow
          title="실시간 TOP 10"
          subtitle="지금 가장 많이 보는 작품"
          dramas={sections.top10}
          showRank
          badge="HOT"
        />

        {/* ── S3. AI 추천 ────────────────────────────────────────────── */}
        <ShowcaseRow
          title="당신만을 위한 추천"
          subtitle="FRAMIX AI가 오늘 엄선한 맞춤 픽"
          dramas={sections.aiPick}
          badge="AI Pick"
          rowVariant="aipick"
          cardVariant="featured"
        />

        {/* ── S4. 급상승 ─────────────────────────────────────────────── */}
        <ShowcaseRow
          title="지금 급상승 중"
          subtitle="빠르게 치고 올라오는 화제작"
          dramas={sections.risingNow}
          badge="TRENDING"
          rowVariant="trending"
          cardVariant="featured"
        />

        {/* Separator */}
        <div className="section-separator" />

        {/* ── S5. FRAMIX ORIGINAL ────────────────────────────────────── */}
        <FramixOriginalStrip dramas={sections.originals} />

        {/* ── S6. Editor's Choice ────────────────────────────────────── */}
        <ShowcaseRow
          title="Editor's Choice"
          subtitle="이 작품만큼은 꼭 보세요 — 에디터 픽"
          dramas={sections.editorChoice}
          badge="PICK"
          cardVariant="editor"
        />

        {/* ── S7. 장르 허브 ──────────────────────────────────────────── */}
        <GenreHub
          romance={sections.romance}
          revenge={sections.revenge}
          chaebol={sections.chaebol}
          contract={sections.contract}
          timeloop={sections.timeloop}
        />

        {/* ── S8. 오늘의 발견 ────────────────────────────────────────── */}
        <ShowcaseRow
          title="오늘의 발견"
          subtitle="아직 모르는 사람이 더 많은 숨은 명작"
          dramas={sections.todayDiscover}
          badge="HIDDEN GEM"
        />

        {/* ── My List ────────────────────────────────────────────────── */}
        {favLoggedIn && favoritedList.length > 0 && (
          <>
            <div className="section-separator" />
            <ShowcaseRow
              title="내 보관함"
              subtitle="찜한 콘텐츠 모음"
              dramas={favoritedList}
              badge="MY LIST"
            />
          </>
        )}

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

      {/* ── Footer V4 ───────────────────────────────────────────────────── */}
      <HomeFooter />
    </div>
  );
}
