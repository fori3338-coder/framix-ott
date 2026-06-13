import HeroBanner from "../components/HeroBanner";
import DramaRow from "../components/DramaRow";
import { dramas, continueWatching, myListIds } from "../data/mockData";

export default function Home() {
  const heroDramas = dramas.filter((d) => d.isOriginal).slice(0, 5);
  const trending = [...dramas].sort((a, b) => b.views - a.views).slice(0, 10);
  const newEpisodes = dramas.filter((d) => d.isNew);
  const recommended = dramas.filter((d) => !d.isNew).slice(0, 10);
  const continueList = dramas.filter((d) => continueWatching.some((c) => c.dramaId === d.id));
  const myList = dramas.filter((d) => myListIds.includes(d.id));
  const romance = dramas.filter((d) => d.genres.includes("로맨스"));
  const revenge = dramas.filter((d) => d.genres.includes("복수"));
  const office = dramas.filter((d) => d.genres.includes("오피스"));

  return (
    <div>
      <HeroBanner dramas={heroDramas} />

      <div className="mt-4 md:mt-8 space-y-1">
        {continueList.length > 0 && (
          <DramaRow title="이어보기" dramas={continueList} continueWatching={continueWatching} />
        )}

        <DramaRow title="🔥 지금 가장 인기있는 작품" dramas={trending} showRank />

        {newEpisodes.length > 0 && <DramaRow title="🆕 새로운 에피소드" dramas={newEpisodes} />}

        <DramaRow title="당신을 위한 추천" dramas={recommended} />

        {myList.length > 0 && <DramaRow title="내가 찜한 작품" dramas={myList} cardSize="sm" />}

        <DramaRow title="💕 로맨스 인기작" dramas={romance} />

        <DramaRow title="🗡️ 복수 & 사이다" dramas={revenge} />

        <DramaRow title="🏢 오피스 로맨스" dramas={office} cardSize="sm" />

        <DramaRow title="FRAMIX 오리지널" dramas={dramas.filter((d) => d.isOriginal)} />
      </div>
    </div>
  );
}
