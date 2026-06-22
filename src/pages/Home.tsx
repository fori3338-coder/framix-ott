/**
 * Home.tsx — FRAMIX Premium OTT Home
 * v2 — Search + Recommendation System Upgrade
 *
 * 섹션 구조:
 *   Hero → Continue Watching → My List → 실시간 TOP10 → 신작
 *   → 급상승 → AI Pick → 당신을 위한 추천 → 로맨스 → 복수
 *   → 재벌 → 계약결혼 → 타임루프 → FRAMIX ORIGINAL → Footer
 *
 * 핵심 변경:
 *  - useRecommendations 훅으로 섹션 데이터 생성 (중복 제거 보장)
 *  - 매 홈 진입마다 AI Pick / 추천 후보 변경
 *  - showcaseData와 DB 데이터 병합 로직 유지 (기존 호환)
 */
import { Link } from "react-router-dom";
import { useState, useCallback, useEffect, useMemo } from "react";

import HeroBanner from "../components/HeroBanner";
import ShowcaseRow from "../components/ShowcaseRow";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
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
        {[1, 2, 3, 4, 5].map((i) => (
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
    // 중복 id 제거 (showcaseData 간 중복 있음)
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
      {/* ── 1. Hero Banner ────────────────────────────────────────────────── */}
      <HeroBanner dramas={heroList} />

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="mt-6 md:mt-10">

        {/* ── 2. Continue Watching ─────────────────────────────────────── */}
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

        {/* ── 4. 실시간 TOP 10 (조회수 정렬) ───────────────────────────── */}
        <ShowcaseRow
          title="실시간 TOP 10"
          subtitle="지금 가장 많이 보는 작품"
          dramas={sections.top10}
          showRank
          accent
          badge="HOT"
        />

        {/* ── 5. 신작 ────────────────────────────────────────────────────── */}
        <ShowcaseRow
          title="새로운 에피소드"
          subtitle="이번 주 업데이트된 최신 콘텐츠"
          dramas={sections.newEpisodes}
          badge="NEW"
        />

        {/* ── 6. 급상승 ──────────────────────────────────────────────────── */}
        <ShowcaseRow
          title="지금 급상승 중"
          subtitle="빠르게 인기를 얻고 있는 작품"
          dramas={sections.risingNow}
          badge="RISING"
          accent
        />

        {/* ── 7. AI Pick ─────────────────────────────────────────────────── */}
        <ShowcaseRow
          title="AI PICK"
          subtitle="FRAMIX AI가 엄선한 오늘의 추천"
          dramas={sections.aiPick}
          badge="AI Pick"
          cardVariant="featured"
        />

        {/* ── 8. 당신을 위한 추천 (최근 시청 기반) ──────────────────────── */}
        <ShowcaseRow
          title="당신을 위한 추천"
          subtitle="최근 시청 기록 기반 맞춤 픽"
          dramas={sections.forYou}
          badge="FOR YOU"
          cardVariant="featured"
        />

        {/* Section separator */}
        <div className="section-separator" />

        {/* ── 9. 로맨스 판타지 ───────────────────────────────────────────── */}
        <ShowcaseRow
          title="로맨스 판타지"
          subtitle="설레고 빠져드는 로맨스 모음"
          dramas={sections.romance}
        />

        {/* ── 10. 복수 & 반전 ────────────────────────────────────────────── */}
        <ShowcaseRow
          title="복수 & 반전"
          subtitle="통쾌한 사이다 반전 드라마"
          dramas={sections.revenge}
          badge="HOT"
        />

        {/* ── 11. 재벌 ──────────────────────────────────────────────────── */}
        <ShowcaseRow
          title="재벌 드라마"
          subtitle="화려한 재벌가의 세계로 초대"
          dramas={sections.chaebol}
        />

        {/* ── 12. 계약결혼 ──────────────────────────────────────────────── */}
        <ShowcaseRow
          title="계약결혼 로맨스"
          subtitle="계약으로 시작된 달콤한 위험"
          dramas={sections.contract}
        />

        {/* ── 13. 타임루프 & 회귀 ───────────────────────────────────────── */}
        <ShowcaseRow
          title="타임루프 & 회귀"
          subtitle="다시 돌아간 그날의 두 번째 기회"
          dramas={sections.timeloop}
        />

        {/* Section separator */}
        <div className="section-separator" />

        {/* ── 14. FRAMIX ORIGINAL ───────────────────────────────────────── */}
        <ShowcaseRow
          title="FRAMIX ORIGINAL"
          subtitle="오직 FRAMIX에서만 볼 수 있는 독점 작품"
          dramas={sections.originals}
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

      {/* ── 15. Footer ──────────────────────────────────────────────────── */}
      <HomeFooter />
    </div>
  );
}
