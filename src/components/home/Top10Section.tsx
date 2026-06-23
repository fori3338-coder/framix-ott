/**
 * Top10Section — Netflix-style TOP 10 섹션
 * 번호 크게, 포스터 겹침, 2열 그리드 (모바일: 스크롤)
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import type { Drama } from "../../types";
import { useFavorites } from "../../hooks/useFavorites";

interface Top10SectionProps {
  dramas: Drama[];
}

export default function Top10Section({ dramas }: Top10SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

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

  if (dramas.length === 0) return null;
  const items = dramas.slice(0, 10);

  return (
    <section
      ref={sectionRef}
      className={["relative home-section section-reveal", revealed ? "is-visible" : ""].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 md:px-12 mb-6">
        <div className="flex items-center gap-3">
          <div className="section-accent-bar" style={{ background: "linear-gradient(to bottom, #ef4444, #b91c1c)" }} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="section-title-premium">실시간 TOP 10</h2>
              <span className="flex items-center gap-1 text-[9px] font-black px-2 py-[3px] rounded-full tracking-widest border bg-red-500/15 text-red-400 border-red-500/25">
                <Flame size={8} />HOT
              </span>
            </div>
            <p className="section-subtitle-premium hidden md:block">지금 가장 많이 보는 작품</p>
          </div>
        </div>
      </div>

      {/* 2-col grid — desktop / horizontal scroll — mobile */}
      <div className="px-5 md:px-12">
        {/* Desktop: 2열 5행 */}
        <div className="hidden md:grid grid-cols-2 gap-x-6 gap-y-3">
          {items.map((drama, i) => (
            <Top10Row key={drama.id} drama={drama} rank={i + 1} revealed={revealed} index={i} />
          ))}
        </div>

        {/* Mobile: 가로 스크롤, 번호 카드 */}
        <div className="flex md:hidden gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
          {items.map((drama, i) => (
            <Top10MobileCard key={drama.id} drama={drama} rank={i + 1} revealed={revealed} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Desktop row item ── */
function Top10Row({ drama, rank, revealed, index }: { drama: Drama; rank: number; revealed: boolean; index: number }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const firstEp = drama.episodes[0]?.id;

  return (
    <div
      className="flex items-center gap-0 cursor-pointer group/row"
      style={{
        opacity: 0,
        animation: revealed ? `fade-in-up 0.45s cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 60, 480)}ms both` : "none",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/drama/${drama.id}`)}
    >
      {/* Rank number */}
      <div
        className="relative flex-shrink-0 select-none"
        style={{ width: "clamp(52px, 7vw, 80px)" }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: "clamp(52px, 7.5vw, 88px)",
            display: "block",
            background: rank === 1
              ? "linear-gradient(135deg, #FFD700 0%, #FFA500 30%, #FFD700 60%, #B8860B 100%)"
              : rank <= 3
              ? "linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 30%, #F0F0F0 60%, #A8A8A8 100%)"
              : "linear-gradient(135deg, #888 0%, #bbb 40%, #888 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            filter: rank === 1
              ? "drop-shadow(0 0 12px rgba(255,215,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
              : rank <= 3
              ? "drop-shadow(0 0 6px rgba(192,192,192,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          }}
        >
          {rank}
        </span>
      </div>

      {/* Poster */}
      <div
        className="relative flex-shrink-0 rounded-lg overflow-hidden"
        style={{
          width: "clamp(52px, 7vw, 76px)",
          aspectRatio: "2/3",
          transform: hovered ? "scale(1.07)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: hovered ? "0 12px 40px -8px rgba(0,0,0,0.7)" : "0 4px 16px -4px rgba(0,0,0,0.5)",
        }}
      >
        {!imgErr ? (
          <img src={drama.poster || drama.backdrop} alt={drama.title} loading="lazy" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full bg-[#1a1a1c] flex items-center justify-center">
            <span className="text-[8px] text-white/30 text-center px-1">{drama.title}</span>
          </div>
        )}
        {rank <= 3 && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-yellow-400 to-transparent" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 px-3">
        <p className="font-bold text-[13px] text-white/90 truncate">{drama.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="#ff3e6c"><path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" /></svg>
          <span className="text-[11px] text-white/55">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/25">·</span>
          <span className="text-[11px] text-white/40">{drama.totalEpisodes}부작</span>
        </div>
        {/* hover actions */}
        <div
          className="flex items-center gap-2 mt-1.5 transition-all duration-200"
          style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(4px)" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (firstEp) navigate(`/watch/${drama.id}/${firstEp}`); else navigate(`/drama/${drama.id}`); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-black text-[10px] font-bold hover:bg-white/90 active:scale-95 transition-all"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="black"><path d="M5 3l14 9-14 9V3z" /></svg>
            재생
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(drama.id); }}
            className={["w-6 h-6 rounded-full border flex items-center justify-center text-[9px] transition-all", favorited ? "bg-white/20 border-white" : "bg-white/8 border-white/30"].join(" ")}
          >
            {favorited ? "✓" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile card ── */
function Top10MobileCard({ drama, rank, revealed, index }: { drama: Drama; rank: number; revealed: boolean; index: number }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer"
      style={{
        width: "clamp(90px, 26vw, 120px)",
        opacity: 0,
        animation: revealed ? `fade-in-up 0.45s cubic-bezier(0.22,1,0.36,1) ${index * 50}ms both` : "none",
      }}
      onClick={() => navigate(`/drama/${drama.id}`)}
    >
      {/* Poster */}
      <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "2/3" }}>
        {!imgErr ? (
          <img src={drama.poster || drama.backdrop} alt={drama.title} loading="lazy" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full bg-[#1a1a1c] flex items-center justify-center">
            <span className="text-[8px] text-white/30">{drama.title}</span>
          </div>
        )}
        {rank <= 3 && <div className="absolute top-0 left-0 right-0 h-[2px] bg-yellow-400" />}
      </div>
      {/* Rank number below-left overlapping */}
      <div className="flex items-end gap-0 -mt-1">
        <span
          className="font-black leading-none select-none"
          style={{
            fontSize: "clamp(40px, 12vw, 56px)",
            display: "block",
            background: rank === 1
              ? "linear-gradient(135deg, #FFD700 0%, #FFA500 30%, #FFD700 60%, #B8860B 100%)"
              : rank <= 3
              ? "linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 30%, #F0F0F0 60%, #A8A8A8 100%)"
              : "linear-gradient(135deg, #777 0%, #aaa 40%, #777 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: rank === 1
              ? "drop-shadow(0 0 8px rgba(255,215,0,0.5)) drop-shadow(0 2px 3px rgba(0,0,0,0.6))"
              : "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
          }}
        >
          {rank}
        </span>
        <p className="text-[9px] text-white/60 truncate flex-1 pb-1 px-1">{drama.title}</p>
      </div>
    </div>
  );
}
