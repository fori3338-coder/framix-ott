import { Link } from "react-router-dom";
import { Play, Info, Sparkles } from "lucide-react";
import HeroBanner from "../components/HeroBanner";
import DramaRow from "../components/DramaRow";
import { useDramas } from "../hooks/useDramas";
import { useContinueWatching } from "../hooks/useContinueWatching";
import { useFavorites } from "../hooks/useFavorites";

export default function Home() {
  const { dramas, loading } = useDramas();
  const { items: continueWatchingItems, isLoggedIn } = useContinueWatching();
  const { favoriteIds: favorites } = useFavorites();

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

  // ── 섹션별 데이터 ──────────────────────────────────────────────────────────
const heroList = [...dramas].reverse().slice(0, 5);
  const trending = [...dramas].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  const newEpisodes = dramas.filter((d) => d.isNew);
  const romance = dramas.filter((d) =>
  d.genres?.some((g) => g.includes("로맨스"))
);

const revenge = dramas.filter((d) =>
  d.genres?.some((g) => g.includes("복수"))
);

const originals = dramas.filter((d) => d.isOriginal);
  const continueWatchingDramas = continueWatchingItems
    .map((cw) => dramas.find((d) => d.id === cw.dramaId))
    .filter(Boolean) as typeof dramas;

  const myListDramas = favorites
    .map((id) => dramas.find((d) => d.id === id))
    .filter(Boolean) as typeof dramas;

  return (
    <div className="pb-16">
      {/* ① Hero Banner */}
      <HeroBanner dramas={heroList} />

      <div className="mt-6 md:mt-10 space-y-2 md:space-y-3">

        {/* ② 이어보기 */}
        {isLoggedIn && continueWatchingDramas.length > 0 && (
          <DramaRow
            title="▶ 이어보기"
            subtitle="중단한 지점부터 다시 시작하세요"
            dramas={continueWatchingDramas}
            continueWatching={continueWatchingItems}
          />
        )}

        {/* ③ 실시간 TOP 10 */}
        {trending.length > 0 && (
          <DramaRow
            title="🔥 실시간 TOP 10"
            subtitle="지금 가장 인기있는 작품"
            dramas={trending}
            showRank
            accent
          />
        )}

        {/* ④ 새로운 에피소드 */}
        {newEpisodes.length > 0 && (
          <DramaRow
            title="🆕 새로운 에피소드"
            subtitle="이번 주 공개된 신작"
            dramas={newEpisodes}
            accent
          />
        )}

        {/* 장르별 */}
        {romance.length > 0 && <DramaRow title="💕 로맨스 인기작" dramas={romance} />}
        {revenge.length > 0 && <DramaRow title="🗡️ 복수 & 사이다" dramas={revenge} />}

        {/* ⑦ 내가 찜한 작품 */}
        {myListDramas.length > 0 && (
          <DramaRow
            title="🔖 내가 찜한 작품"
            subtitle="보관함에 저장된 작품"
            dramas={myListDramas}
          />
        )}

        {/* ⑧ FRAMIX 오리지널 */}
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
