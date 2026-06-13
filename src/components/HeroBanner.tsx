import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import type { Drama } from "../types";

interface HeroBannerProps {
  dramas: Drama[];
}

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % dramas.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [dramas.length, index]);

  const drama = dramas[index];
  if (!drama) return null;

  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[85vh] min-h-[440px] max-h-[820px] overflow-hidden">
      {dramas.map((d, i) => (
        <img
          key={d.id}
          src={d.backdrop}
          alt={d.title}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 gpu ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-8 md:pb-16">
        <div className="max-w-xl animate-fade-in" key={drama.id}>
          {drama.isOriginal && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-gold font-black text-sm md:text-base tracking-wider">FRAMIX</span>
              <span className="text-text-dim text-xs md:text-sm font-semibold uppercase tracking-widest">Original</span>
            </div>
          )}
          <h1 className="text-2xl md:text-5xl font-black text-white leading-tight mb-2 drop-shadow-lg">
            {drama.title}
          </h1>
          <div className="flex items-center gap-2 text-xs md:text-sm text-text-dim mb-3 flex-wrap">
            <span className="text-gold font-bold">★ {drama.rating.toFixed(1)}</span>
            <span>{drama.year}</span>
            <span className="border border-text-muted px-1 rounded text-[10px] md:text-xs">{drama.ageRating}</span>
            <span>{drama.totalEpisodes}부작</span>
            <span className="hidden sm:inline">· {drama.episodeLength}</span>
          </div>
          <p className="hidden md:block text-sm text-text-dim line-clamp-2 mb-4 max-w-md">
            {drama.synopsis}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4 md:mb-5">
            {drama.genres.map((g) => (
              <span key={g} className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-dim border border-white/10">
                {g}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/watch/${drama.id}/${drama.episodes[0]?.id}`)}
              className="flex items-center gap-2 bg-white text-black font-bold px-5 md:px-7 py-2.5 md:py-3 rounded-md text-sm md:text-base hover:bg-white/85 transition-colors"
            >
              <Play size={18} className="fill-black" />
              재생
            </button>
            <button
              onClick={() => navigate(`/drama/${drama.id}`)}
              className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white font-bold px-5 md:px-7 py-2.5 md:py-3 rounded-md text-sm md:text-base hover:bg-white/25 transition-colors border border-white/20"
            >
              <Info size={18} />
              상세정보
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label="음소거 토글"
              className="ml-auto w-9 h-9 md:w-11 md:h-11 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-2 right-4 md:right-8 flex gap-1.5">
        {dramas.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={`h-1 rounded-full transition-all ${
              i === index ? "w-6 bg-gold" : "w-2.5 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
