import { Link } from "react-router-dom";
import { Play, Info, Sparkles } from "lucide-react";
import HeroBanner from "../components/HeroBanner";
import DramaRow from "../components/DramaRow";
import { dramas, continueWatching, myListIds } from "../data/mockData";

export default function Home() {
  const heroDramas = dramas.filter((d) => d.isOriginal).slice(0, 5);
  const trending = [...dramas].sort((a, b) => b.views - a.views).slice(0, 10);
  const newEpisodes = dramas.filter((d) => d.isNew);
  const recommended = dramas.filter((d) => !d.isNew).slice(0, 10);
  const continueList = dramas.filter((d) =>
    continueWatching.some((c) => c.dramaId === d.id),
  );
  const myList = dramas.filter((d) => myListIds.includes(d.id));
  const romance = dramas.filter((d) => d.genres.includes("로맨스"));
  const revenge = dramas.filter((d) => d.genres.includes("복수"));
  const office = dramas.filter((d) => d.genres.includes("오피스"));

  // Recommended For You spotlight pick
  const spotlight = recommended[0];
  const recommendedRow = recommended.slice(1);

  return (
    <div className="pb-16">
      <HeroBanner dramas={heroDramas} />

      <div className="mt-6 md:mt-10 space-y-2 md:space-y-3">
        {continueList.length > 0 && (
          <DramaRow
            title="이어보기"
            subtitle="중단한 지점부터 다시 시청하세요"
            dramas={continueList}
            continueWatching={continueWatching}
            accent
          />
        )}

        <DramaRow
          title="🔥 지금 가장 인기있는 작품"
          subtitle="실시간 TOP 10"
          dramas={trending}
          showRank
          accent
        />

        {newEpisodes.length > 0 && (
          <DramaRow
            title="🆕 새로운 에피소드"
            subtitle="이번 주 공개된 신작"
            dramas={newEpisodes}
            accent
          />
        )}

        {/* Recommended For You — spotlight + row */}
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
                    시청 기록을 바탕으로 큐레이션했어요
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
                      <span className="text-gold font-bold">★ {spotlight.rating.toFixed(1)}</span>
                      <span className="text-text-muted">•</span>
                      <span>{spotlight.year}</span>
                      <span className="border border-text-muted/60 px-1.5 rounded text-[10px]">
                        {spotlight.ageRating}
                      </span>
                      <span>{spotlight.totalEpisodes}부작</span>
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

        {myList.length > 0 && (
          <DramaRow title="내가 찜한 작품" dramas={myList} cardSize="sm" />
        )}

        <DramaRow title="💕 로맨스 인기작" dramas={romance} />
        <DramaRow title="🗡️ 복수 & 사이다" dramas={revenge} />
        <DramaRow title="🏢 오피스 로맨스" dramas={office} cardSize="sm" />
        <DramaRow
          title="FRAMIX 오리지널"
          subtitle="우리만의 독점 작품"
          dramas={dramas.filter((d) => d.isOriginal)}
          accent
        />
      </div>
    </div>
  );
}
