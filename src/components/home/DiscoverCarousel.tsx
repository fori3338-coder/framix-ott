/**
 * DiscoverCarousel — 오늘의 발견
 * Apple TV+ 스타일: 가운데 카드 100%, 양옆 카드 70% (center-focused)
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Drama } from "../../types";
import { useFavorites } from "../../hooks/useFavorites";

interface DiscoverCarouselProps {
  dramas: Drama[];
}

export default function DiscoverCarousel({ dramas }: DiscoverCarouselProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const items = dramas.slice(0, 7);
  const total = items.length;

  const startAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (total <= 1) return;
    autoRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % total);
    }, 5000);
  }, [total]);

  useEffect(() => {
    startAuto();
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [startAuto]);

  const goTo = (idx: number) => {
    setActiveIdx((idx + total) % total);
    startAuto();
  };

  if (items.length === 0) return null;

  // visible items: prev, active, next
  const getItem = (offset: number) => items[(activeIdx + offset + total) % total];

  return (
    <section
      ref={sectionRef}
      className={["relative home-section section-reveal", revealed ? "is-visible" : ""].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 md:px-12 mb-6">
        <div className="section-accent-bar" style={{ background: "linear-gradient(to bottom, #34d399, #059669)" }} />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="section-title-premium">오늘의 발견</h2>
            <span className="flex items-center gap-1 text-[9px] font-black px-2 py-[3px] rounded-full tracking-widest border bg-emerald-500/12 text-emerald-400 border-emerald-500/22">
              <Sparkles size={8} />HIDDEN GEM
            </span>
          </div>
          <p className="section-subtitle-premium hidden md:block">아직 모르는 사람이 더 많은 숨은 명작</p>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative flex items-center justify-center gap-3 md:gap-5 px-4 md:px-12 overflow-hidden">

        {/* Prev nav arrow */}
        <button
          onClick={() => goTo(activeIdx - 1)}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/15 items-center justify-center hover:bg-black/90 hover:border-white/35 transition-all duration-200 active:scale-95"
          aria-label="이전"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>

        {/* Cards: prev (left) */}
        {total > 1 && (
          <div
            className="hidden sm:block flex-shrink-0 cursor-pointer"
            style={{ width: "clamp(120px, 22vw, 220px)" }}
            onClick={() => goTo(activeIdx - 1)}
          >
            <CarouselCard drama={getItem(-1)} scale={0.7} active={false} />
          </div>
        )}

        {/* Center card — 100% */}
        <div
          className="flex-shrink-0 cursor-pointer"
          style={{ width: "clamp(200px, 46vw, 420px)" }}
        >
          <CarouselCard drama={getItem(0)} scale={1} active={true} />
        </div>

        {/* Cards: next (right) */}
        {total > 1 && (
          <div
            className="hidden sm:block flex-shrink-0 cursor-pointer"
            style={{ width: "clamp(120px, 22vw, 220px)" }}
            onClick={() => goTo(activeIdx + 1)}
          >
            <CarouselCard drama={getItem(1)} scale={0.7} active={false} />
          </div>
        )}

        {/* Next nav arrow */}
        <button
          onClick={() => goTo(activeIdx + 1)}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/15 items-center justify-center hover:bg-black/90 hover:border-white/35 transition-all duration-200 active:scale-95"
          aria-label="다음"
        >
          <ChevronRight size={18} className="text-white" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300 focus:outline-none"
            style={{
              width: i === activeIdx ? "20px" : "6px",
              height: "6px",
              background: i === activeIdx ? "#34d399" : "rgba(255,255,255,0.2)",
            }}
            aria-label={`${i + 1}번째`}
          />
        ))}
      </div>
    </section>
  );
}

function CarouselCard({ drama, scale, active }: { drama: Drama; scale: number; active: boolean }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const [imgErr, setImgErr] = useState(false);
  const firstEp = drama.episodes[0]?.id;

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-400"
      style={{
        aspectRatio: "3/4",
        opacity: scale === 1 ? 1 : 0.55,
        transform: `scale(${scale})`,
        transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
        boxShadow: active ? "0 32px 80px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(52,211,153,0.15)" : "none",
        cursor: active ? "default" : "pointer",
      }}
      onClick={() => { if (!active) return; navigate(`/drama/${drama.id}`); }}
    >
      {/* Image */}
      {!imgErr ? (
        <img src={drama.poster || drama.backdrop} alt={drama.title} loading="lazy" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
      ) : (
        <div className="w-full h-full bg-[#1a1a1c] flex items-center justify-center">
          <span className="text-[11px] text-white/30 text-center px-4">{drama.title}</span>
        </div>
      )}

      {/* Scrim */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />

      {/* Info — only on active */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10">
          {(drama.isNew || drama.isExclusive) && (
            <span className="inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[8px] font-black px-2 py-0.5 rounded-full tracking-widest mb-2">
              {drama.isExclusive ? "독점" : "NEW"}
            </span>
          )}
          <h3 className="font-black text-white text-[15px] md:text-[20px] mb-1 leading-tight">{drama.title}</h3>
          <div className="flex items-center gap-2 mb-3">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="#34d399"><path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" /></svg>
            <span className="text-[12px] text-white font-bold">{drama.rating.toFixed(1)}</span>
            <span className="text-[10px] text-white/35">·</span>
            <span className="text-[11px] text-white/50">{drama.totalEpisodes}부작</span>
            {drama.genres.slice(0, 1).map((g) => (
              <span key={g} className="text-[10px] text-white/40">· {g}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); if (firstEp) navigate(`/watch/${drama.id}/${firstEp}`); else navigate(`/drama/${drama.id}`); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black font-bold text-[11px] md:text-[12px] hover:bg-white/90 active:scale-95 transition-all"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="black"><path d="M5 3l14 9-14 9V3z" /></svg>
              지금 시청
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(drama.id); }}
              className={["w-8 h-8 rounded-full border flex items-center justify-center text-[12px] transition-all", favorited ? "bg-white/20 border-white text-white" : "bg-black/40 border-white/30 text-white hover:border-white/60"].join(" ")}
            >
              {favorited ? "✓" : "+"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/drama/${drama.id}`); }}
              className="text-[10px] text-white/45 hover:text-white/70 transition-colors underline underline-offset-2"
            >
              상세보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
