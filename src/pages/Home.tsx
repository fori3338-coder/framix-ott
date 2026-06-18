import { Link } from "react-router-dom";

import HeroBanner from "../components/HeroBanner";
import DramaRow from "../components/DramaRow";
import ShowcaseRow from "../components/ShowcaseRow";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";

// UI 전용 Showcase 데이터 — DB와 완전 무관
import {
  showcaseTop10,
  showcaseNewEpisodes,
  showcaseRecommended,
  showcaseRomance,
  showcaseRevenge,
  showcaseOriginals,
} from "../data/showcaseData";

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

  // ── 로딩 스켈레톤 ───────────────────────────────────────────────────────────
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

  // ── Hero용 데이터: DB 작품 + showcase 보완 ──────────────────────────────────
  // DB 데이터 있으면 앞에 배치, 부족하면 showcase로 채움
  const heroSourcePool = [
    ...dramas,
    ...showcaseTop10.filter((s) => !dramas.some((d) => d.id === s.id)),
  ];
  const heroList = heroSourcePool.slice(0, 5);

  // 이어보기
  const continueWatchingDramas = isLoggedIn
    ? continueWatchingItems
        .map((cw) => dramas.find((d) => d.id === cw.dramaId))
        .filter(Boolean) as typeof dramas
    : dramas.slice(0, 4);

  // DB 기반 섹션 (작품 있을 때만 표시)
  const officeRomance =
    office.length > 0
      ? office
      : dramas.filter((d) =>
          ["사내", "오피스", "비서", "직장"].some((kw) => d.title.includes(kw))
        );

  const revengeList =
    revenge.length > 0
      ? revenge
      : dramas.filter((d) =>
          ["복수", "역습", "사이다", "반격"].some((kw) => d.title.includes(kw))
        );

  const romanceList =
    romance.length > 0
      ? romance
      : dramas.filter((d) =>
          ["로맨스", "사랑", "연애", "신혼", "결혼", "계약"].some((kw) =>
            d.title.includes(kw)
          )
        );

  const originals = dramas.filter((d) => d.isOriginal);

  return (
    <div className="pb-24" style={{ background: "var(--color-base)" }}>
      {/* ① Hero Banner */}
      <HeroBanner dramas={heroList.length > 0 ? heroList : showcaseTop10.slice(0, 5)} />

      <div
        className="mt-2 md:mt-4 space-y-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, #050505 80px)",
        }}
      >
        {/* ── DB 섹션: 이어보기 (로그인 시) ── */}
        {continueWatchingDramas.length > 0 && (
          <DramaRow
            title="▶ 이어보기"
            subtitle={isLoggedIn ? "중단한 지점부터 다시 시작하세요" : "이런 작품은 어때요?"}
            dramas={continueWatchingDramas}
            continueWatching={isLoggedIn ? continueWatchingItems : undefined}
          />
        )}

        {/* ── DB 섹션: trending (있을 때만) ── */}
        {trending.length > 0 && (
          <DramaRow
            title="🔥 실시간 TOP 10"
            subtitle="지금 가장 인기있는 작품"
            dramas={trending}
            showRank
            accent
          />
        )}

        {/* ② Showcase: 실시간 TOP 10 ─────────────────────────────────── */}
        <ShowcaseRow
          title="🔥 실시간 TOP 10"
          subtitle="지금 가장 많이 보는 작품"
          dramas={showcaseTop10}
          showRank
          accent
          badge="HOT"
        />

        {/* ── DB 섹션: 새 에피소드 (있을 때만) ── */}
        {newEpisodes.length > 0 && (
          <DramaRow
            title="🆕 새로운 에피소드"
            subtitle="이번 주 공개된 신작"
            dramas={newEpisodes}
            accent
          />
        )}

        {/* ③ Showcase: 새로운 에피소드 ────────────────────────────────── */}
        <ShowcaseRow
          title="🆕 새로운 에피소드"
          subtitle="이번 주 업데이트된 최신 콘텐츠"
          dramas={showcaseNewEpisodes}
          accent
          badge="NEW"
        />

        {/* ④ Showcase: 당신을 위한 추천 ───────────────────────────────── */}
        {recommended.length > 0 && (
          <DramaRow
            title="✨ 당신을 위한 추천"
            subtitle="평점과 인기도 기반으로 엄선했어요"
            dramas={recommended}
          />
        )}
        <ShowcaseRow
          title="✨ 당신을 위한 추천"
          subtitle="AI가 분석한 나만의 맞춤 픽"
          dramas={showcaseRecommended}
          badge="AI Pick"
        />

        {/* ── DB 섹션: 로맨스 (있을 때만) ── */}
        {romanceList.length > 0 && (
          <DramaRow
            title="💕 로맨스 인기작"
            subtitle="설레는 순간들을 모았어요"
            dramas={romanceList}
          />
        )}

        {/* ⑤ Showcase: 로맨스 판타지 ──────────────────────────────────── */}
        <ShowcaseRow
          title="💕 로맨스 판타지"
          subtitle="설레고 빠져드는 로맨스 모음"
          dramas={showcaseRomance}
        />

        {/* ── DB 섹션: 복수 (있을 때만) ── */}
        {revengeList.length > 0 && (
          <DramaRow
            title="🗡️ 복수 & 사이다"
            subtitle="통쾌한 반전이 기다려요"
            dramas={revengeList}
            accent
          />
        )}

        {/* ⑥ Showcase: 재벌/복수 ──────────────────────────────────────── */}
        <ShowcaseRow
          title="⚔️ 재벌 &amp; 복수"
          subtitle="통쾌한 사이다 반전 드라마"
          dramas={showcaseRevenge}
          accent
          badge="HOT"
        />

        {/* ── DB 섹션: 오피스 (있을 때만) ── */}
        {officeRomance.length > 0 && (
          <DramaRow
            title="🏢 오피스 로맨스"
            subtitle="직장에서 싹튼 설레는 감정"
            dramas={officeRomance}
          />
        )}

        {/* ── DB 섹션: 오리지널 (있을 때만) ── */}
        {originals.length > 0 && (
          <DramaRow
            title="FRAMIX 오리지널"
            subtitle="우리만의 독점 작품"
            dramas={originals}
            accent
          />
        )}

        {/* ⑦ Showcase: FRAMIX 오리지널 ────────────────────────────────── */}
        <ShowcaseRow
          title="🎬 FRAMIX 오리지널"
          subtitle="오직 FRAMIX에서만 볼 수 있는 독점 작품"
          dramas={showcaseOriginals}
          accent
          badge="ORIGINAL"
        />

        {/* ── DB가 비어 있을 때 안내 (섹션 모두 숨음 방지) ── */}
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
