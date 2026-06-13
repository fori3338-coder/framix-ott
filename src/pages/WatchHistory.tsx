import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Trash2, Play } from "lucide-react";
import { watchHistory, getDramaById, getEpisodeById } from "../data/mockData";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export default function WatchHistory() {
  const [history, setHistory] = useState(watchHistory);

  const groups = history.reduce<Record<string, typeof history>>((acc, item) => {
    const key = formatDate(item.watchedAt);
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Clock size={22} className="text-gold" />
          시청 기록
        </h1>
        {history.length > 0 && (
          <button onClick={() => setHistory([])} className="text-sm text-text-dim hover:text-gold transition-colors">
            전체 삭제
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-dim">시청 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-text-muted mb-2">{date}</h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const drama = getDramaById(item.dramaId);
                  const episode = getEpisodeById(drama, item.episodeId);
                  if (!drama || !episode) return null;
                  return (
                    <div
                      key={`${item.dramaId}-${item.episodeId}-${item.watchedAt}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group"
                    >
                      <Link to={`/watch/${drama.id}/${episode.id}`} className="relative w-24 md:w-32 aspect-video rounded-md overflow-hidden shrink-0 bg-surface-2">
                        <img src={episode.thumbnail} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                          <Play size={18} className="text-white opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div className="h-full bg-gold" style={{ width: `${item.progress}%` }} />
                        </div>
                      </Link>
                      <Link to={`/drama/${drama.id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{drama.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {episode.number}화 · {item.progress === 100 ? "시청 완료" : `${item.progress}% 시청`}
                        </p>
                      </Link>
                      <button
                        onClick={() =>
                          setHistory((prev) =>
                            prev.filter(
                              (h) => !(h.dramaId === item.dramaId && h.episodeId === item.episodeId && h.watchedAt === item.watchedAt)
                            )
                          )
                        }
                        aria-label="기록 삭제"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-gold transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
