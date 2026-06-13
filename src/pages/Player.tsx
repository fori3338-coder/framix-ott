import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  MessageCircle,
  Share2,
  List,
  Lock,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { getDramaById, getEpisodeById } from "../data/mockData";

export default function Player() {
  const { id, episodeId } = useParams();
  const navigate = useNavigate();
  const drama = getDramaById(id);
  const episode = getEpisodeById(drama, episodeId);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [prevEpisodeId, setPrevEpisodeId] = useState(episodeId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (episodeId !== prevEpisodeId) {
    setPrevEpisodeId(episodeId);
    setProgress(0);
    setPlaying(true);
  }

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => (p >= 100 ? 100 : p + 0.4));
      }, 200);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  if (!drama || !episode) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-text-dim">에피소드를 찾을 수 없습니다.</p>
        <Link to="/" className="text-gold underline mt-2 inline-block">홈으로 돌아가기</Link>
      </div>
    );
  }

  const currentIndex = drama.episodes.findIndex((e) => e.id === episode.id);
  const prevEp = drama.episodes[currentIndex - 1];
  const nextEp = drama.episodes[currentIndex + 1];

  const isLocked = !episode.isFree;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div
        className="relative flex-1 overflow-hidden"
        onClick={() => setShowControls((s) => !s)}
      >
        <img
          src={`https://picsum.photos/seed/${episode.id}-player/720/1280`}
          alt={episode.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

        {isLocked && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center px-6 text-center gap-4 z-20">
            <div className="w-14 h-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
              <Lock size={26} className="text-gold" />
            </div>
            <h3 className="text-lg font-bold text-white">VIP 전용 에피소드</h3>
            <p className="text-sm text-text-dim max-w-xs">
              이 에피소드는 프리미엄 구독자만 시청할 수 있어요. 구독 후 모든 에피소드를 광고 없이 시청하세요.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/subscription"); }}
              className="bg-gold text-black font-bold px-6 py-2.5 rounded-md text-sm"
            >
              구독하고 계속 보기
            </button>
          </div>
        )}

        <div
          className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 safe-top transition-opacity ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/drama/${drama.id}`); }}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <p className="text-white text-sm font-semibold">{drama.title}</p>
            <p className="text-text-dim text-xs">{episode.number}화 · {episode.title}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowEpisodes(true); }}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
            aria-label="에피소드 목록"
          >
            <List size={20} />
          </button>
        </div>

        {!isLocked && showControls && (
          <div className="absolute inset-0 flex items-center justify-center gap-10">
            <button
              onClick={(e) => { e.stopPropagation(); if (prevEp) navigate(`/watch/${drama.id}/${prevEp.id}`); }}
              disabled={!prevEp}
              className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-white disabled:opacity-30"
              aria-label="이전 화"
            >
              <SkipBack size={22} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }}
              className="w-16 h-16 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white border border-white/30"
              aria-label={playing ? "일시정지" : "재생"}
            >
              {playing ? <Pause size={28} /> : <Play size={28} className="fill-white ml-0.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (nextEp) navigate(`/watch/${drama.id}/${nextEp.id}`); }}
              disabled={!nextEp}
              className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-white disabled:opacity-30"
              aria-label="다음 화"
            >
              <SkipForward size={22} />
            </button>
          </div>
        )}

        <div className="absolute right-3 bottom-28 md:bottom-24 flex flex-col items-center gap-5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setLiked((l) => !l); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${liked ? "bg-gold/20" : "bg-black/30"}`}>
              <Heart size={22} className={liked ? "text-gold fill-gold" : "text-white"} />
            </div>
            <span className="text-xs">{liked ? "12.4K" : "12.3K"}</span>
          </button>
          <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1 text-white">
            <div className="w-11 h-11 rounded-full bg-black/30 flex items-center justify-center">
              <MessageCircle size={22} />
            </div>
            <span className="text-xs">832</span>
          </button>
          <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1 text-white">
            <div className="w-11 h-11 rounded-full bg-black/30 flex items-center justify-center">
              <Share2 size={20} />
            </div>
            <span className="text-xs">공유</span>
          </button>
        </div>

        <div
          className={`absolute bottom-0 left-0 right-0 px-4 pb-4 safe-bottom transition-opacity ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white">
              <Maximize size={16} />
            </button>
          </div>
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-text-dim mt-1">
            <span>{Math.floor((progress / 100) * 720 / 60)}:{String(Math.floor((progress / 100) * 720) % 60).padStart(2, "0")}</span>
            <span>{episode.duration}</span>
          </div>
        </div>
      </div>

      {showEpisodes && (
        <div className="absolute inset-0 z-30 flex">
          <div className="flex-1 bg-black/50" onClick={() => setShowEpisodes(false)} />
          <div className="w-[78%] max-w-sm bg-surface h-full overflow-y-auto p-4 animate-fade-in safe-top safe-bottom">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text">에피소드 ({drama.episodes.length})</h3>
              <button onClick={() => setShowEpisodes(false)} className="text-text-dim text-sm">닫기</button>
            </div>
            <div className="space-y-1.5">
              {drama.episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => { navigate(`/watch/${drama.id}/${ep.id}`); setShowEpisodes(false); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                    ep.id === episode.id ? "bg-gold/10 border border-gold/40" : "hover:bg-surface-2"
                  }`}
                >
                  <div className="relative w-20 aspect-video rounded overflow-hidden shrink-0 bg-surface-2">
                    <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
                    {!ep.isFree && (
                      <span className="absolute top-0.5 left-0.5 bg-black/70 rounded p-0.5">
                        <Lock size={10} className="text-gold" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${ep.id === episode.id ? "text-gold" : "text-text"}`}>
                      {ep.number}화 {ep.title}
                    </p>
                    <p className="text-xs text-text-muted">{ep.duration}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
