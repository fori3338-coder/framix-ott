import { Link } from "react-router-dom";

import HeroBanner from "../components/HeroBanner";
import DramaRow from "../components/DramaRow";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";

export default function Home() {
  const {
    dramas,
    loading,
    trending,
    newEpisodes,
    romance,
    revenge,
    office,
    recommended,
  } = useDramas();
  const { items: continueWatchingItems, isLoggedIn } = useContinueWatching();

  // ── 로딩 스켈레톤 ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pb-16 animate-pulse">
        {/* Hero skeleton */}
        <div className="w-full h-[68vh] md:h-[88vh] min-h-[460px] bg-surface-2" />
        <div className="mt-8 space-y-8 px-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-surface-2 rounded w-48 mb-4" />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div
                    key={j}
                    className="w-[120px] sm:w-[150px] md:w-[170px] aspect-[2/3] rounded-lg bg-surface-2 shrink-0"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 콘텐츠 없음 ───────────────────────────────────────────────────────────
  if (dramas.length === 0) {
    return (
      <div className="pb-16">
        <div className="px-5 pt-28 text-center">
          <p className="text-text-dim font-medium mb-1">등록된 콘텐츠가 없습니다</p>
          <p className="text-text-muted text-sm">
            <Link to="/admin/upload" className="text-gold underline">
              콘텐츠를 등록
            </Link>
            하면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  // ── 섹션별 데이터 계산 ────────────────────────────────────────────────────
  const heroList = dramas.slice(0, 5);

  // 이어보기: Supabase 실제 데이터 (로그인 시) 또는 UI 전용 샘플
  const continueWatchingDramas = isLoggedIn
    ? continueWatchingItems
        .map((cw) => dramas.find((d) => d.id === cw.dramaId))
        .filter(Boolean) as typeof dramas
    : dramas.slice(0, 4); // UI 전용 — 미로그인 시 첫 4개 미리보기

  // 오피스 로맨스: genre 기반, 없으면 제목 기반 fallback
  const officeRomance =
    office.length > 0
      ? office
      : dramas.filter((d) =>
          ["사내", "오피스", "비서", "직장"].some((kw) =>
            d.title.includes(kw)
          )
        );

  // 복수 & 사이다: revenge genre + 제목 기반 보완
  const revengeList =
    revenge.length > 0
      ? revenge
      : dramas.filter((d) =>
          ["복수", "역습", "사이다", "반격"].some((kw) =>
            d.title.includes(kw)
          )
        );

  // 로맨스: romance genre + 제목 기반 보완
  const romanceList =
    romance.length > 0
      ? romance
      : dramas.filter((d) =>
          ["로맨스", "사랑", "연애", "신혼", "결혼", "계약"].some((kw) =>
            d.title.includes(kw)
          )
        );

  // FRAMIX 오리지널
  const originals = dramas.filter((d) => d.isOriginal);

  return (
    <div className="pb-20">
      {/* ① Hero Banner — 수정 금지 */}
      <HeroBanner dramas={heroList} />

      <div className="mt-6 md:mt-10 space-y-0">

        {/* ② 이어보기 */}
        {continueWatchingDramas.length > 0 && (
          <DramaRow
            title="▶ 이어보기"
            subtitle={isLoggedIn ? "중단한 지점부터 다시 시작하세요" : "이런 작품은 어때요?"}
            dramas={continueWatchingDramas}
            continueWatching={isLoggedIn ? continueWatchingItems : undefined}
          />
        )}

        {/* ③ 실시간 TOP 10 — 수정 금지 */}
        {trending.length > 0 && (
          <DramaRow
            title="🔥 실시간 TOP 10"
            subtitle="지금 가장 인기있는 작품"
            dramas={trending}
            showRank
            accent
          />
        )}

        {/* ④ 새로운 에피소드 — isNew 플래그 없으면 최신 등록순으로 항상 표시 */}
        {newEpisodes.length > 0 && (
          <DramaRow
            title="🆕 새로운 에피소드"
            subtitle="이번 주 공개된 신작"
            dramas={newEpisodes}
            accent
          />
        )}

        {/* ⑤ 당신을 위한 추천 */}
        {recommended.length > 0 && (
          <DramaRow
            title="✨ 당신을 위한 추천"
            subtitle="평점과 인기도 기반으로 엄선했어요"
            dramas={recommended}
          />
        )}

        {/* ⑥ 로맨스 인기작 */}
        {romanceList.length > 0 && (
          <DramaRow
            title="💕 로맨스 인기작"
            subtitle="설레는 순간들을 모았어요"
            dramas={romanceList}
          />
        )}

        {/* ⑦ 복수 & 사이다 */}
        {revengeList.length > 0 && (
          <DramaRow
            title="🗡️ 복수 & 사이다"
            subtitle="통쾌한 반전이 기다려요"
            dramas={revengeList}
            accent
          />
        )}

        {/* ⑧ 오피스 로맨스 */}
        {officeRomance.length > 0 && (
          <DramaRow
            title="🏢 오피스 로맨스"
            subtitle="직장에서 싹튼 설레는 감정"
            dramas={officeRomance}
          />
        )}

        {/* ⑨ FRAMIX 오리지널 */}
        {originals.length > 0 && (
          <DramaRow
            title="FRAMIX 오리지널"
            subtitle="우리만의 독점 작품"
            dramas={originals}
            accent
          />
        )}

      </div>
    </div>
  );
}
