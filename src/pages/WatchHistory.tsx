import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Trash2, Play, History, CheckCircle2 } from "lucide-react";
import { watchHistory, getDramaById, getEpisodeById } from "../data/mockData";

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "오늘";
  if (sameDay(d, yesterday)) return "어제";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export default function WatchHistory() {
  const [history, setHistory] = useState(watchHistory);

  const groups = useMemo(() => {
    return history.reduce<Record<string, typeof history>>((acc, item) => {
      const key = formatDate(item.watchedAt);
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});
  }, [history]);

  const totalMinutes = history.length * 12; // mock
  const completed = history.filter((h) => h.progress === 100).length;

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-2xl mb-6 border border-border bg-gradient-to-br from-surface-2 via-surface to-base px-5 py-5 md:px-7 md:py-6">
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0 shadow-[0_4px_20px_-4px_rgba(212,175,55,0.6)]">
              <History size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gradient-gold leading-tight">시청 기록</h1>
              <p className="text-xs text-text-muted mt-0.5">
                지금까지 <span className="text-gold font-semibold">{history.length}</span>개 에피소드 ·{" "}
                <span className="text-gold font-semibold">{completed}</span>편 완주 ·{" "}
                <span className="text-gold font-semibold">{totalMinutes}</span>분 시청
              </p>
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-xs md:text-sm px-3.5 py-1.5 rounded-full border border-border text-text-dim hover:border-danger hover:text-danger transition-colors"
            >
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <Clock size={26} className="text-text-muted" />
          </div>
          <p className="text-text-dim font-medium">시청 기록이 없습니다</p>
          <p className="text-text-muted text-sm mt-1">작품을 시청하면 여기에 기록돼요.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {Object.entries(groups).map(([date, items]) => (
            <section key={date}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
                <h2 className="text-xs md:text-sm font-semibold text-text-dim uppercase tracking-wide">{date}</h2>
                <span className="text-[10px] text-text-muted">{items.length}편</span>
                <div className="flex-1 h-px bg-border ml-1" />
              </div>
              <div className="space-y-1.5">
                {items.map((item, i) => {
                  const drama = getDramaById(item.dramaId);
                  const episode = getEpisodeById(drama, item.episodeId);
                  if (!drama || !episode) return null;
                  const done = item.progress >= 100;
                  return (
                    <div
                      key={`${item.dramaId}-${item.episodeId}-${item.watchedAt}`}
                      className="group relative flex items-center gap-3 p-2 md:p-2.5 rounded-xl border border-transparent hover:border-gold/30 hover:bg-surface-2/70 transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
                    >
                      <Link
                        to={`/watch/${drama.id}/${episode.id}`}
                        className="relative w-28 md:w-36 aspect-video rounded-lg overflow-hidden shrink-0 bg-surface-2 ring-1 ring-border group-hover:ring-gold/50 transition-all"
                      >
                        <img
                          src={episode.thumbnail}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-9 h-9 rounded-full bg-gold/95 flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(212,175,55,0.7)]">
                            <Play size={15} className="text-black fill-black ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white/90 font-medium flex items-center justify-between">
                          <span>{episode.duration}</span>
                          {done && <CheckCircle2 size={12} className="text-gold" />}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                          <div
                            className={`h-full ${done ? "bg-emerald-400" : "bg-gradient-gold"}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link to={`/drama/${drama.id}`} className="block">
                          <p className="text-sm md:text-base font-semibold text-text truncate group-hover:text-gold transition-colors">
                            {drama.title}
                          </p>
                        </Link>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {episode.number}화 · {done ? "시청 완료" : `${item.progress}% 시청`}
                        </p>
                        <Link
                          to={`/watch/${drama.id}/${episode.id}`}
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-gold hover:text-gold-light transition-colors"
                        >
                          <Play size={11} className="fill-gold" />
                          {done ? "다시 보기" : "이어서 보기"}
                        </Link>
                      </div>

                      <button
                        onClick={() =>
                          setHistory((prev) =>
                            prev.filter(
                              (h) =>
                                !(
                                  h.dramaId === item.dramaId &&
                                  h.episodeId === item.episodeId &&
                                  h.watchedAt === item.watchedAt
                                )
                            )
                          )
                        }
                        className="opacity-0 group-hover:opacity-100 md:opacity-60 md:hover:opacity-100 w-8 h-8 rounded-full bg-surface-2 border border-border hover:border-danger hover:text-danger flex items-center justify-center text-text-muted transition-all"
                        aria-label="기록 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
