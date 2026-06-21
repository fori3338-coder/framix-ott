import { Link } from "react-router-dom";
import { useState, useCallback } from "react";

import HeroBanner from "../components/HeroBanner";
import ShowcaseRow from "../components/ShowcaseRow";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";
import type { Drama } from "../types";

import {
  showcaseTop10,
  showcaseNewEpisodes,
  showcaseRecommended,
  showcaseRomance,
  showcaseRevenge,
  showcaseOriginals,
} from "../data/showcaseData";

// DB dramas를 showcase 앞에 병합 (중복 id 제거)
function merge(dbDramas: Drama[], showcase: Drama[]): Drama[] {
  const dbIds = new Set(dbDramas.map((d) => d.id));
  return [...dbDramas, ...showcase.filter((s) => !dbIds.has(s.id))];
}

export default function Home() {
  const { dramas, loading, trending } = useDramas();
  const { items: continueWatchingItems, isLoggedIn, reload: reloadCW } = useContinueWatching();

  // 이어보기 항목 삭제 시 로컬 state에서도 즉시 제거
  const [removedEpisodeIds, setRemovedEpisodeIds] = useState<Set<string>>(new Set());
  const handleRemoveCW = useCallback((episodeId: string) => {
    setRemovedEpisodeIds((prev) => new Set(prev).add(episodeId));
    // 약간 지연 후 서버 데이터 재조회
    setTimeout(() => reloadCW(), 800);
  }, [reloadCW]);

  const visibleCWItems = continueWatchingItems.filter(
    (item) => !removedEpisodeIds.has(item.episodeId)
  );
  if (loading) {
    return (
      <div className="pb-16 animate-pulse">
        <div className="w-full h-[68vh] md:h-[88vh] min-h-[460px] bg-surface-2" />
        <div className="mt-8 space-y-10 px-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-5 bg-surface-2 rounded-md w-52 mb-4" />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5, 6].map((j) => (
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

  // ── 각 섹션 데이터: DB 작품 항상 앞에 병합 ─────────────────────────────────
  // ── 배너 관리: banner_enabled로 지정된 작품을 banner_order 순으로 노출.
  //    관리자가 지정한 작품이 없으면 기존 동작(TOP10 상위 5개)으로 폴백.
  const bannerPicks = [...dramas]
    .filter((d) => d.isBanner)
    .sort((a, b) => (a.bannerOrder ?? 0) - (b.bannerOrder ?? 0));
  const heroList =
    bannerPicks.length > 0
      ? bannerPicks
      : merge(dramas, showcaseTop10).slice(0, 5);

  // ── TOP10 관리: 수동 지정(top10_rank) 우선 + views 자동 집계로 채움.
  const top10List = merge(trending, showcaseTop10);
  const newList = merge(dramas, showcaseNewEpisodes);
  const recommendedList = merge(dramas, showcaseRecommended);
  const romanceList = merge(dramas, showcaseRomance);
  const revengeList = merge(dramas, showcaseRevenge);
  const originalsList = merge(dramas, showcaseOriginals);

  return (
    <div className="pb-24" style={{ background: "var(--color-base)" }}>
      {/* Hero Banner */}
      <HeroBanner dramas={heroList} />

      <div className="mt-2 md:mt-4 space-y-0">
        {/* 이어보기 — 로그인 사용자 + 미완료 항목 존재 시만 표시 */}
        {isLoggedIn && visibleCWItems.length > 0 && (
          <ContinueWatchingRow
            items={visibleCWItems}
            onRemove={handleRemoveCW}
          />
        )}

        {/* 실시간 TOP 10 */}
        <ShowcaseRow
          title="🔥 실시간 TOP 10"
          subtitle="지금 가장 많이 보는 작품"
          dramas={top10List}
          showRank
          accent
          badge="HOT"
        />

        {/* 새로운 에피소드 */}
        <ShowcaseRow
          title="🆕 새로운 에피소드"
          subtitle="이번 주 업데이트된 최신 콘텐츠"
          dramas={newList}
          accent
          badge="NEW"
        />

        {/* 당신을 위한 추천 */}
        <ShowcaseRow
          title="✨ 당신을 위한 추천"
          subtitle="AI가 분석한 나만의 맞춤 픽"
          dramas={recommendedList}
          badge="AI Pick"
        />

        {/* 로맨스 판타지 */}
        <ShowcaseRow
          title="💕 로맨스 판타지"
          subtitle="설레고 빠져드는 로맨스 모음"
          dramas={romanceList}
        />

        {/* 재벌 & 복수 */}
        <ShowcaseRow
          title="⚔️ 재벌 & 복수"
          subtitle="통쾌한 사이다 반전 드라마"
          dramas={revengeList}
          accent
          badge="HOT"
        />

        {/* FRAMIX 오리지널 */}
        <ShowcaseRow
          title="🎬 FRAMIX 오리지널"
          subtitle="오직 FRAMIX에서만 볼 수 있는 독점 작품"
          dramas={originalsList}
          accent
          badge="ORIGINAL"
        />

        {dramas.length === 0 && (
          <div className="px-5 md:px-12 pt-4 pb-2 text-center">
            <p className="text-xs text-text-muted">
              <Link to="/admin/upload" className="text-gold/80 underline underline-offset-2 hover:text-gold">
                콘텐츠를 등록
              </Link>
              하면 실제 작품이 상단에 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
