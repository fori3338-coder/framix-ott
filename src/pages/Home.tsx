/**
 * Home.tsx — FRAMIX Premium OTT Home
 * v3 — Netflix 2025 / Disney+ / Apple TV+ 수준 Content Discovery 재설계
 *
 * 섹션 구조:
 *   Hero
 *   → S1: Continue Watching (유지)
 *   → S2: 실시간 TOP10 (Netflix 스타일)
 *   → S3: 지금 급상승 중 / Today Trending (Disney+ 스타일)
 *   → S4: 당신만을 위한 추천 / AI Pick (Premium Card)
 *   → S5: FRAMIX ORIGINAL (Hero Strip — 별도 컴포넌트)
 *   → S6: Editor's Choice (Apple TV+ Landscape)
 *   → S7: 이번주 화제작
 *   → S8: 정주행 추천
 *   → S9: 장르 허브 (통합 탭 — GenreHub 컴포넌트)
 *   → S10: 오늘의 발견
 *   → My List (찜 보관함, 로그인 시)
 *   → Footer
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

// ── Footer Component ────────────────────────────────────────────────────────
function HomeFooter() {
  return (
    <footer className="framix-footer mt-8 md:mt-16">
      <div className="max-w-5xl mx-auto">
        <p
          className="text-sm font-black tracking-[0.18em] mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FRAMIX
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-[11px]">
          {["이용약관", "개인정보처리방침", "고객센터", "공지사항", "1:1 문의", "콘텐츠 파트너십"].map((item) => (
            <span
              key={item}
              className="text-white/28 hover:text-white/55 cursor-pointer transition-colors duration-150"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-white/20 leading-relaxed">
          © 2025 FRAMIX. All rights reserved.
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          본 서비스의 콘텐츠는 저작권법에 의해 보호됩니다.
        </p>
      </div>
    </footer>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────
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

// ── Main Home Component ─────────────────────────────────────────────────────
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

  // ── 전체 드라마 풀 (DB + showcase 병합) ───────────────────────────────
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

  // ── AI 추천 엔진 ─────────────────────────────────────────────────────
  const sections = useRecommendations({
    allDramas,
    continueWatchingItems,
    favoriteIds,
  });

  if (loading) return <HomeSkeleton />;

  // ── Hero Banner 데이터 ─────────────────────────────────────────────────
  const bannerPicks = [...dramas]
    .filter((d) => d.isBanner)
    .sort((a, b) => (a.bannerOrder ?? 0) - (b.bannerOrder ?? 0));
  const heroList =
    bannerPicks.length > 0
      ? bannerPicks
      : merge(trending, showcaseTop10).slice(0, 5);

  // ── 찜 목록 ────────────────────────────────────────────────────────────
  const favoritedList = favoriteIds
    .map((fid) => allDramas.find((d) => d.id === fid))
    .filter((d): d is Drama => Boolean(d));

  return (
    <div className="pb-0" style={{ background: "var(--color-base)" }}>
      {/* ── Hero Banner ────────────────────────────────────────────────── */}
      <HeroBanner dramas={heroList} />

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="mt-6 md:mt-10">

        {/* ── S1. Continue Watching ──────────────────────────────────── */}
        <div id="continue-watching-section">
          {isLoggedIn && visibleCWItems.length > 0 && (
            <ContinueWatchingRow
              items={visibleCWItems}
              onRemove={handleRemoveCW}
            />
          )}
        </div>

        {/* ── S2. 실시간 TOP 10 — Netflix 스타일 ────────────────────── */}
        <ShowcaseRow
          title="실시간 TOP 10"
          subtitle="지금 가장 많이 보는 작품"
          dramas={sections.top10}
          showRank
          badge="HOT"
        />

        {/* ── S3. 지금 급상승 중 — Disney+ 스타일 (rowVariant=trending) */}
        <ShowcaseRow
          title="지금 급상승 중"
          subtitle="빠르게 치고 올라오는 화제작"
          dramas={sections.risingNow}
          badge="TRENDING"
          rowVariant="trending"
          cardVariant="featured"
        />

        {/* ── S4. 당신만을 위한 추천 — AI Pick Premium ──────────────── */}
        <ShowcaseRow
          title="당신만을 위한 추천"
          subtitle="FRAMIX AI가 오늘 엄선한 맞춤 픽"
          dramas={sections.aiPick}
          badge="AI Pick"
          rowVariant="aipick"
          cardVariant="featured"
        />

        {/* Separator */}
        <div className="section-separator" />

        {/* ── S5. FRAMIX ORIGINAL — Hero Strip ──────────────────────── */}
        <FramixOriginalStrip dramas={sections.originals} />

        {/* ── S6. Editor's Choice — Apple TV+ Landscape ─────────────── */}
        <ShowcaseRow
          title="Editor's Choice"
          subtitle="이 작품만큼은 꼭 보세요 — 에디터 픽"
          dramas={sections.editorChoice}
          badge="PICK"
          cardVariant="editor"
        />

        {/* ── S7. 이번주 화제작 ───────────────────────────────────────── */}
        <ShowcaseRow
          title="이번주 화제작"
          subtitle="이번 주 SNS를 달군 드라마"
          dramas={sections.weeklyHot}
          badge="HOT"
        />

        {/* Separator */}
        <div className="section-separator" />

        {/* ── S8. 정주행 추천 — Binge Watch ─────────────────────────── */}
        <ShowcaseRow
          title="정주행 추천"
          subtitle="한번 시작하면 멈출 수 없는 몰입 드라마"
          dramas={sections.bingeWatch}
          badge="BINGE"
          rowVariant="binge"
          cardSize="lg"
        />

        {/* ── S9. 장르 허브 — 탭 + 그리드 ───────────────────────────── */}
        <GenreHub
          romance={sections.romance}
          revenge={sections.revenge}
          chaebol={sections.chaebol}
          contract={sections.contract}
          timeloop={sections.timeloop}
        />

        {/* ── S10. 오늘의 발견 ────────────────────────────────────────── */}
        <ShowcaseRow
          title="오늘의 발견"
          subtitle="아직 모르는 사람이 더 많은 숨은 명작"
          dramas={sections.todayDiscover}
          badge="HIDDEN GEM"
        />

        {/* ── My List (로그인 + 찜 있을 때) ─────────────────────────── */}
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

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <HomeFooter />
    </div>
  );
}
