import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Volume2, VolumeX, Plus } from "lucide-react";
import type { Drama } from "../types";

interface HeroBannerProps {
  dramas: Drama[];
}

const SLIDE_MS = 6000;

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % dramas.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [dramas.length, paused, index]);

  const drama = dramas[index];
  if (!drama) return null;

  // ── 디버그 로그 (요청에 따라 추가) ────────────────────────────────────
  // 운영 중에는 콘솔에 노출되므로 문제가 재발하지 않는 게 확인되면 제거해도 됨.
  console.log("FEATURED_CONTENT", drama);

  const firstEpisode = drama.episodes?.[0];
  const playRoute = firstEpisode ? `/watch/${drama.id}/${firstEpisode.id}` : null;
  console.log("PLAY_ROUTE", playRoute, {
    seriesId: drama.id,
    usingEpisodeId: firstEpisode?.id, // series.id가 아니라 episode.id를 쓰고 있는지 확인용
  });

  const handlePlay = () => {
    if (!playRoute) {
      // episodes가 비어있으면 절대 "/watch/{id}/undefined" 로 이동하지 않는다.
      console.warn("[HeroBanner] 재생 가능한 에피소드가 없어 이동을 막았습니다:", drama.id);
      return;
    }
    navigate(playRoute);
  };

  return (
    <div
      className="relative w-full h-[68vh] md:h-[88vh] min-h-[460px] overflow-hidden bg-base"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrops with Ken Burns */}
      {dramas.map((d, i) => (
        <div
          key={d.id}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={d.backdrop}
            alt={d.title}
            className={`w-full h-full object-cover ${i === index ? "animate-ken-burns" : ""}`}
            style={{ willChange: "transform" }}
          />
        </div>
      ))}

      {/* Premium scrim */}
      <div className="absolute inset-0 bg-hero-scrim pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-base pointer-events-none" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-5 md:px-12 pb-10 md:pb-20 safe-bottom">
        <div className="max-w-2xl" key={drama.id}>
          {drama.isOriginal && (
            <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
              <span className="text-gradient-gold font-black text-sm md:text-base tracking-[0.2em]">
                FRAMIX
              </span>
              <span className="h-3 w-px bg-gold/40" />
              <span className="text-text-dim text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em]">
                Original Series
              </span>
            </div>
          )}

          <h1
            className="text-3xl md:text-6xl font-black text-white leading-[1.05] mb-3 drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] animate-fade-in-up"
            style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
          >
            {drama.title}
          </h1>

          <div
            className="flex items-center gap-2.5 text-xs md:text-sm text-text-dim mb-4 flex-wrap animate-fade-in-up"
            style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
          >
            <span className="text-gold font-bold">★ {drama.rating.toFixed(1)}</span>
            <span className="text-text-muted">•</span>
            <span>{drama.year}</span>
            <span className="border border-text-muted/60 px-1.5 rounded text-[10px] md:text-xs">
              {drama.ageRating}
            </span>
            <span>{drama.totalEpisodes}부작</span>
            <span className="hidden sm:inline text-text-muted">•</span>
            <span className="hidden sm:inline">{drama.episodeLength}</span>
          </div>

          <p
            className="hidden md:block text-[15px] text-text-dim/90 leading-relaxed line-clamp-2 mb-5 max-w-xl animate-fade-in-up"
            style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
          >
            {drama.synopsis}
          </p>

          <div
            className="flex flex-wrap gap-1.5 mb-5 md:mb-7 animate-fade-in-up"
            style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
          >
            {drama.genres.map((g) => (
              <span
                key={g}
                className="text-[10px] md:text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-text-dim border border-white/10 backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>

          <div
            className="flex items-center gap-2.5 md:gap-3 animate-fade-in-up"
            style={{ animationDelay: "280ms", animationFillMode: "backwards" }}
          >
            <button
              onClick={handlePlay}
              disabled={!playRoute}
              className="flex items-center gap-2 bg-white text-black font-bold px-5 md:px-8 py-3 md:py-3.5 rounded-md text-sm md:text-base hover:bg-gold transition-all duration-200 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={18} className="fill-black" />
              재생
            </button>
            <button
              onClick={() => navigate(`/drama/${drama.id}`)}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white font-bold px-5 md:px-8 py-3 md:py-3.5 rounded-md text-sm md:text-base hover:bg-white/20 transition-all duration-200 active:scale-95 border border-white/15"
            >
              <Info size={18} />
              <span className="hidden sm:inline">상세정보</span>
              <span className="sm:hidden">정보</span>
            </button>
            <button
              aria-label="찜하기"
              className="hidden sm:flex w-11 h-11 rounded-full border border-white/25 items-center justify-center text-white hover:border-gold hover:text-gold transition-colors active:scale-95"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label="음소거 토글"
              className="ml-auto w-10 h-10 md:w-11 md:h-11 rounded-full border border-white/25 flex items-center justify-center text-white hover:border-gold hover:text-gold transition-colors active:scale-95"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Slide indicators with progress */}
      <div className="absolute bottom-3 md:bottom-6 right-5 md:right-12 flex items-center gap-2">
        {dramas.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={`relative h-[3px] rounded-full overflow-hidden transition-all duration-300 ${
              i === index ? "w-10 md:w-14 bg-white/20" : "w-3 md:w-4 bg-white/25 hover:bg-white/40"
            }`}
          >
            {i === index && !paused && (
              <span
                key={`${drama.id}-${i}`}
                className="absolute inset-0 bg-gradient-gold origin-left animate-[hero-progress_6s_linear_forwards]"
              />
            )}
            {i === index && paused && <span className="absolute inset-0 bg-gradient-gold" />}
          </button>
        ))}
      </div>
    </div>
  );
}
