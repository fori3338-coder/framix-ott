/**
 * Home.tsx — FRAMIX Premium OTT Home
 * Structure: Hero → Continue Watching → Top10 → New → Recommended
 *            → Genre: Romance → Genre: Revenge → Editor's Pick (Originals) → Footer
 *
 * Netflix / Apple TV+ / Disney+ level layout & spacing
 */
import { Link } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";

import HeroBanner from "../components/HeroBanner";
import ShowcaseRow from "../components/ShowcaseRow";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";
import { useFavorites } from "../hooks/useFavorites";
import type { Drama } from "../types";

import {
  showcaseTop10,
  showcaseNewEpisodes,
  showcaseRecommended,
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
        {/* Logo */}
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

        {/* Links */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-[11px]">
          {[
            "이용약관",
            "개인정보처리방침",
            "고객센터",
            "공지사항",
            "1:1 문의",
            "콘텐츠 파트너십",
          ].map((item) => (
            <span
              key={item}
              className="text-white/28 hover:text-white/55 cursor-pointer transition-colors duration-150"
            >
              {item}
            </span>
          ))}
        </div>

        {/* Copyright */}
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
        {[1, 2, 3, 4].map((i) => (
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

  if (loading) return <HomeSkeleton />;

  // ── Section Data ──────────────────────────────────────────────────────────
  const bannerPicks = [...dramas]
    .filter((d) => d.isBanner)
    .sort((a, b) => (a.bannerOrder ?? 0) - (b.bannerOrder ?? 0));
  const heroList =
    bannerPicks.length > 0
      ? bannerPicks
      : merge(dramas, showcaseTop10).slice(0, 5);

  const top10List = merge(trending, showcaseTop10);
  const newList = merge(dramas, showcaseNewEpisodes);
  const recommendedList = merge(dramas, showcaseRecommended);
  const romanceList = merge(dramas, showcaseRomance);
  const revengeList = merge(dramas, showcaseRevenge);
  const originalsList = merge(dramas, showcaseOriginals);

  const favoritedList = favoriteIds
    .map((fid) => dramas.find((d) => d.id === fid))
    .filter((d): d is Drama => Boolean(d));

  return (
    <div className="pb-0" style={{ background: "var(--color-base)" }}>
      {/* ── 1. Hero Banner ────────────────────────────────────────────────── */}
      <HeroBanner dramas={heroList} />

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="mt-6 md:mt-10">

        {/* ── 2. Continue Watching — 최상단, 가장 큰 카드 ────────────────── */}
        <div id="continue-watching-section">
          {isLoggedIn && visibleCWItems.length > 0 && (
            <ContinueWatchingRow
              items={visibleCWItems}
              onRemove={handleRemoveCW}
            />
          )}
        </div>

        {/* ── 3. My List ─────────────────────────────────────────────────── */}
        {favLoggedIn && favoritedList.length > 0 && (
          <ShowcaseRow
            title="내 보관함"
            subtitle="찜한 콘텐츠 모음"
            dramas={favoritedList}
            badge="MY LIST"
          />
        )}

        {/* ── 4. TOP 10 Trending — Netflix rank number overlay ───────────── */}
        <ShowcaseRow
          title="실시간 TOP 10"
          subtitle="지금 가장 많이 보는 작품"
          dramas={top10List}
          showRank
          accent
          badge="HOT"
        />

        {/* ── 5. 신작 ────────────────────────────────────────────────────── */}
        <ShowcaseRow
          title="새로운 에피소드"
          subtitle="이번 주 업데이트된 최신 콘텐츠"
          dramas={newList}
          badge="NEW"
        />

        {/* ── 6. 추천 콘텐츠 ─────────────────────────────────────────────── */}
        <ShowcaseRow
          title="당신을 위한 추천"
          subtitle="AI가 분석한 나만의 맞춤 픽"
          dramas={recommendedList}
          badge="AI Pick"
          cardVariant="featured"
        />

        {/* Section separator */}
        <div className="section-separator" />

        {/* ── 7. 장르별 추천: 로맨스 ────────────────────────────────────── */}
        <ShowcaseRow
          title="로맨스 판타지"
          subtitle="설레고 빠져드는 로맨스 모음"
          dramas={romanceList}
        />

        {/* ── 8. 장르별 추천: 재벌 & 복수 ──────────────────────────────── */}
        <ShowcaseRow
          title="재벌 & 복수"
          subtitle="통쾌한 사이다 반전 드라마"
          dramas={revengeList}
          badge="HOT"
        />

        {/* Section separator */}
        <div className="section-separator" />

        {/* ── 9. 에디터 추천: FRAMIX 오리지널 ──────────────────────────── */}
        <ShowcaseRow
          title="에디터 추천"
          subtitle="오직 FRAMIX에서만 볼 수 있는 독점 작품"
          dramas={originalsList}
          accent
          badge="ORIGINAL"
          cardVariant="editor"
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

      {/* ── 10. Footer ──────────────────────────────────────────────────── */}
      <HomeFooter />
    </div>
  );
}
