import { Link } from "react-router-dom";
import { Play, Info, Sparkles } from "lucide-react";
import HeroBanner from "../components/HeroBanner";
import DramaRow from "../components/DramaRow";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";

export default function Home() {
  const { dramas, loading, error } = useDramas();
  const { items: continueWatchingItems, isLoggedIn } = useContinueWatching();

  // ── 로딩 스켈레톤 ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pb-16 animate-pulse">
        <div className="w-full h-[55vw] min-h-[260px] max-h-[540px] bg-surface-2" />
        <div className="mt-8 space-y-6 px-5">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-surface-2 rounded w-40 mb-3" />
              <div className="flex gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="w-[120px] aspect-[2/3] rounded-lg bg-surface-2 shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Supabase 오류 ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="pb-16">
        <div className="px-5 pt-20 text-center">
          <p className="text-red-400 text-sm mb-1">데이터 로드 오류</p>
          <p className="text-text-muted text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // ── 데이터 없을 때 ─────────────────────────────────────────────────────────
  if (dramas.length === 0) {
    return (
      <div className="pb-16">
        <div className="px-5 pt-28 text-center">
          <p className="text-text-dim font-medium mb-1">등록된 콘텐츠가 없습니다</p>
          <p className="text-text-muted text-sm">
            <Link to="/admin/upload" className="text-gold underline">콘텐츠를 등록</Link>하면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  // ── 카테고리별 분류 ───────────────────────────────────────────────────────
  const heroDramas = dramas.filter((d) => d.isOriginal).slice(0, 5);
  const heroList = heroDramas.length > 0 ? heroDramas : dramas.slice(0, 5);

  const trending = [...dramas].sort((a, b) => b.views - a.views).slice(0, 10);
  const newEpisodes = dramas.filter((d) => d.isNew);
  const recommended = dramas.filter((d) => !d.isNew).slice(0, 10);
  const romance = dramas.filter((d) => d.genres.includes("로맨스"));
  const revenge = dramas.filter((d) => d.genres.includes("복수"));
  const office = dramas.filter((d) => d.genres.includes("오피스"));

  const spotlight = recommended[0];
  const recommendedRow = recommended.slice(1);

  // Continue Watching: dramas 중 continueWatchingItems에 해당하는 것만
  const continueWatchingDramas = continueWatchingItems
    .map((cw) => dramas.find((d) => d.id === cw.dramaId))
    .filter(Boolean) as typeof dramas;

  return (
    <div className="pb-16">
      <HeroBanner dramas={heroList} />

      <div className="mt-6 md:mt-10 space-y-2 md:space-y-3">

        {/* ▶ 이어보기 — 로그인 유저 + 미완료 에피소드 있을 때만 표시 */}
        {isLoggedIn && continueWatchingDramas.length > 0 && (
          <DramaRow
            title="▶ 이어보기"
            subtitle="시청 중인 작품"
            dramas={continueWatchingDramas}
            continueWatching={continueWatchingItems}
          />
        )}

        {trending.length > 0 && (
          <DramaRow
            title="🔥 지금 가장 인기있는 작품"
            subtitle="실시간 TOP 10"
            dramas={trending}
            showRank
            accent
          />
        )}

        {newEpisodes.length > 0 && (
          <DramaRow
            title="🆕 새로운 에피소드"
            subtitle="이번 주 공개된 신작"
            dramas={newEpisodes}
            accent
          />
        )}

        {/* 추천 픽 spotlight */}
        {spotlight && (
          <section className="relative mb-7 md:mb-12 animate-fade-in">
            <div className="flex items-end justify-between px-5 md:px-12 mb-3 md:mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden md:flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold text-black shrink-0">
                  <Sparkles size={18} strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base md:text-2xl font-bold text-text tracking-tight truncate">
                    당신을 위한 추천
                  </h2>
                  <p className="hidden md:block text-xs text-text-muted mt-0.5">
                    최신 등록 콘텐츠를 큐레이션했어요
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 md:px-12">
              <Link
                to={`/drama/${spotlight.id}`}
                className="group relative block overflow-hidden rounded-xl ring-1 ring-border hover:ring-gold/60 transition-all duration-300"
              >
                <div className="relative aspect-[16/9] md:aspect-[21/9]">
                  <img
                    src={spotlight.backdrop}
                    alt={spotlight.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-base/90 via-base/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-10 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
                      <Sparkles size={12} /> 추천 픽
                    </span>
                    <h3 className="text-xl md:text-4xl font-black text-white leading-tight mb-2">
                      {spotlight.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] md:text-sm text-text-dim mb-3 flex-wrap">
                      {spotlight.rating > 0 && (
                        <span className="text-gold font-bold">★ {spotlight.rating.toFixed(1)}</span>
                      )}
                      {spotlight.rating > 0 && <span className="text-text-muted">•</span>}
                      <span>{spotlight.year}</span>
                      <span className="border border-text-muted/60 px-1.5 rounded text-[10px]">
                        {spotlight.ageRating}
                      </span>
                      {spotlight.totalEpisodes > 0 && (
                        <span>{spotlight.totalEpisodes}부작</span>
                      )}
                    </div>
                    <p className="hidden md:block text-sm text-text-dim/90 line-clamp-2 mb-4 max-w-lg">
                      {spotlight.synopsis}
                    </p>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="inline-flex items-center gap-1.5 bg-white text-black font-bold px-4 md:px-6 py-2 md:py-2.5 rounded-md text-xs md:text-sm group-hover:bg-gold transition-colors">
                        <Play size={14} className="fill-black" /> 재생
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white font-bold px-4 md:px-6 py-2 md:py-2.5 rounded-md text-xs md:text-sm border border-white/15">
                        <Info size={14} /> 상세
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {recommendedRow.length > 0 && (
              <div className="mt-5 md:mt-7">
                <DramaRow title="비슷한 작품 더 보기" dramas={recommendedRow} />
              </div>
            )}
          </section>
        )}

        {romance.length > 0 && <DramaRow title="💕 로맨스 인기작" dramas={romance} />}
        {revenge.length > 0 && <DramaRow title="🗡️ 복수 & 사이다" dramas={revenge} />}
        {office.length > 0 && <DramaRow title="🏢 오피스 로맨스" dramas={office} cardSize="sm" />}

        {dramas.filter((d) => d.isOriginal).length > 0 && (
          <DramaRow
            title="FRAMIX 오리지널"
            subtitle="우리만의 독점 작품"
            dramas={dramas.filter((d) => d.isOriginal)}
            accent
          />
        )}

        {dramas.length > 0 && (
          <DramaRow title="전체 콘텐츠" subtitle="등록된 모든 작품" dramas={dramas} />
        )}
      </div>
    </div>
  );
}
