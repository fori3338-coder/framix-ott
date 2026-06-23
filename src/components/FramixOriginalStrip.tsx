/**
 * FramixOriginalStrip — FRAMIX ORIGINAL 전용 Hero Strip
 *
 * Netflix Originals / Apple TV+ Originals 스타일의 와이드 배너형 레이아웃.
 * 일반 Row 형태 금지 — 대형 배경 이미지 + 텍스트 오버레이 형식.
 * Scroll Reveal + GPU transform only (60fps)
 * 모바일: 단일 세로 스택, 터치 스와이프 지원
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface FramixOriginalStripProps {
  dramas: Drama[];
}

export default function FramixOriginalStrip({ dramas }: FramixOriginalStripProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Scroll Reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-advance
  useEffect(() => {
    if (dramas.length <= 1) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % Math.min(dramas.length, 5));
    }, 6000);
    return () => clearInterval(t);
  }, [dramas.length]);

  if (dramas.length === 0) return null;

  const items = dramas.slice(0, 5);
  const active = items[activeIdx];

  return (
    <section
      ref={sectionRef}
      className={[
        "relative home-section section-reveal framix-original-strip",
        revealed ? "is-visible" : "",
      ].join(" ")}
    >
      {/* ── Section Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 md:px-12 mb-5 md:mb-7">
        <div className="section-accent-bar" />
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="section-title-premium">FRAMIX ORIGINAL</h2>
          <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-black px-2 py-[3px] rounded-full tracking-widest border bg-[#ff3e6c]/14 text-[#ff7196] border-[#ff3e6c]/30">
            <Sparkles size={8} />
            ORIGINAL
          </span>
        </div>
      </div>

      {/* ── Main Hero Strip ─────────────────────────────────────────────── */}
      <div className="relative mx-5 md:mx-12 rounded-2xl overflow-hidden original-strip-card"
        style={{ minHeight: "clamp(200px, 42vw, 420px)" }}>
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          {items.map((d, i) => (
            <div
              key={d.id}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === activeIdx ? 1 : 0 }}
            >
              <img
                src={d.backdrop || d.poster}
                alt={d.title}
                decoding="async"
                loading="lazy"
                className="w-full h-full object-cover will-change-[opacity]"
              />
            </div>
          ))}
        </div>

        {/* Scrim layers */}
        <div className="absolute inset-0 z-[1]"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.08) 100%), linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)"
          }}
        />

        {/* ORIGINAL badge watermark top-right */}
        <div className="absolute top-4 right-5 z-[3] md:top-6 md:right-8">
          <div className="framix-original-badge">
            <span className="text-[10px] md:text-[11px] font-black tracking-[0.2em] text-[#ff7196]">FRAMIX</span>
            <span className="text-[9px] md:text-[10px] font-bold tracking-[0.3em] text-[#ff7196]/70">ORIGINAL</span>
          </div>
        </div>

        {/* Content overlay */}
        <div className="relative z-[2] flex items-center h-full p-6 md:p-10 lg:p-14"
          style={{ minHeight: "clamp(200px, 42vw, 420px)" }}>
          <div className="max-w-lg">
            {/* Active drama info */}
            <ActiveDramaInfo drama={active} />
          </div>
        </div>

        {/* Nav arrows (desktop) */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx((i) => (i - 1 + items.length) % items.length)}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full items-center justify-center active:scale-95"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.80)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.55)")}
              aria-label="이전"
            >
              <ChevronLeft size={18} className="text-white" />
            </button>
            <button
              onClick={() => setActiveIdx((i) => (i + 1) % items.length)}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full items-center justify-center active:scale-95"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.80)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.55)")}
              aria-label="다음"
            >
              <ChevronRight size={18} className="text-white" />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail Row (smaller cards below) ──────────────────────────── */}
      {items.length > 1 && (
        <div className="flex gap-2.5 md:gap-3 mt-4 px-5 md:px-12 overflow-x-auto scrollbar-hide pb-1">
          {items.map((d, i) => (
            <OriginalThumb
              key={d.id}
              drama={d}
              active={i === activeIdx}
              onClick={() => setActiveIdx(i)}
              index={i}
              revealed={revealed}
            />
          ))}
        </div>
      )}

      <style>{`
        .framix-original-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
        }
        .original-strip-card {
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,62,108,0.16), 0 0 40px -10px rgba(255,62,108,0.10);
          transition: box-shadow 0.4s ease;
        }
        .original-strip-card:hover {
          box-shadow: 0 48px 120px -20px rgba(0,0,0,0.98), 0 0 0 1px rgba(255,62,108,0.28), 0 0 60px -10px rgba(255,62,108,0.18);
        }
      `}</style>
    </section>
  );
}

// ── Active Drama Info (hero overlay content) ──────────────────────────────
function ActiveDramaInfo({ drama }: { drama: Drama }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  const handlePlay = () => {
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };

  return (
    <div
      className="animate-original-in"
      key={drama.id}
      style={{ animation: "originalContentIn 0.55s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      {/* Exclusive tag */}
      {drama.isExclusive && (
        <div className="inline-flex items-center gap-1 mb-3 px-2.5 py-1 rounded bg-[#ff3e6c]/14 border border-[#ff3e6c]/30">
          <Sparkles size={9} className="text-[#ff7196]" />
          <span className="text-[9px] md:text-[10px] font-black tracking-widest text-[#ff7196]">독점 공개</span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-white font-black leading-[1.1] mb-2"
        style={{ fontSize: "clamp(1.25rem, 3.5vw, 2.2rem)", textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}>
        {drama.title}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#ff3e6c">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[11px] md:text-[13px] text-white font-bold">{drama.rating.toFixed(1)}</span>
        </div>
        <span className="text-[10px] text-white/40">·</span>
        <span className="text-[10px] md:text-[12px] text-white/60">{drama.totalEpisodes}부작</span>
        <span className="text-[10px] text-white/40">·</span>
        {drama.genres.slice(0, 2).map((g) => (
          <span key={g} className="text-[10px] md:text-[11px] text-white/55">{g}</span>
        ))}
      </div>

      {/* Synopsis — desktop only */}
      {drama.synopsis && (
        <p className="hidden md:block text-[12px] lg:text-[13px] text-white/55 leading-relaxed mb-4 clamp-2 max-w-sm">
          {drama.synopsis}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handlePlay}
          className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-lg bg-white text-black font-bold text-[12px] md:text-[13px] hover:bg-white/90 active:scale-95 transition-all duration-150 shadow-lg"
        >
          <Play size={12} className="fill-black text-black" />
          지금 시청
        </button>
        <button
          onClick={() => toggleFavorite(drama.id)}
          className={[
            "flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-150 active:scale-90",
            favorited ? "bg-white/20 border-white text-white" : "bg-black/40 border-white/35 text-white hover:border-white/65",
          ].join(" ")}
          aria-label={favorited ? "찜 해제" : "보관함 추가"}
        >
          {favorited ? <Check size={14} /> : <Plus size={14} />}
        </button>
        <button
          onClick={() => navigate(`/drama/${drama.id}`)}
          className="text-[11px] md:text-[12px] text-white/50 hover:text-white/80 transition-colors duration-150 underline underline-offset-2"
        >
          상세보기
        </button>
      </div>

      <style>{`
        @keyframes originalContentIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Original Thumbnail (bottom row) ──────────────────────────────────────
function OriginalThumb({
  drama,
  active,
  onClick,
  index,
  revealed,
}: {
  drama: Drama;
  active: boolean;
  onClick: () => void;
  index: number;
  revealed: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 rounded-xl overflow-hidden focus:outline-none"
      style={{
        width: "clamp(90px, 16vw, 140px)",
        aspectRatio: "16/9",
        opacity: 0,
        animation: revealed ? `fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 80}ms both` : "none",
        boxShadow: active
          ? "0 0 0 2px var(--color-brand), 0 8px 32px -8px rgba(255,62,108,0.55), 0 0 20px -4px rgba(255,62,108,0.35)"
          : "0 0 0 1px rgba(255,255,255,0.08)",
        transition: "all 0.32s cubic-bezier(0.22,1,0.36,1)",
        transform: active ? "scale(1.04)" : "scale(1)",
      }}
      aria-label={drama.title}
    >
      {!imgErr ? (
        <img
          src={drama.backdrop || drama.poster}
          alt={drama.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: active ? "scale(1.06)" : "scale(1)" }}
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-[#1a1a1c] flex items-center justify-center">
          <span className="text-[9px] text-white/30">{drama.title}</span>
        </div>
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <p className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-semibold text-white/80 truncate text-left">
        {drama.title}
      </p>
      {/* Active indicator */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3e6c]" />
      )}
    </button>
  );
}
