/**
 * GenreHubSection — 장르 버튼 허브
 * 클릭 시 해당 장르 카드만 노출 (전환 애니메이션 포함)
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Swords, Crown, Handshake, Clock, ChevronRight } from "lucide-react";
import type { Drama } from "../../types";

interface GenreHubSectionProps {
  romance: Drama[];
  revenge: Drama[];
  chaebol: Drama[];
  contract: Drama[];
  timeloop: Drama[];
}

type GenreKey = "romance" | "revenge" | "chaebol" | "contract" | "timeloop";

const GENRES = [
  { key: "romance" as GenreKey, label: "로맨스", icon: <Heart size={14} />, accent: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  { key: "revenge" as GenreKey, label: "복수", icon: <Swords size={14} />, accent: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { key: "chaebol" as GenreKey, label: "재벌", icon: <Crown size={14} />, accent: "#ff3e6c", bg: "rgba(212,175,55,0.12)" },
  { key: "contract" as GenreKey, label: "계약결혼", icon: <Handshake size={14} />, accent: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  { key: "timeloop" as GenreKey, label: "타임루프", icon: <Clock size={14} />, accent: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
];

export default function GenreHubSection({ romance, revenge, chaebol, contract, timeloop }: GenreHubSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState<GenreKey>("romance");
  const [animKey, setAnimKey] = useState(0);

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

  const genreMap: Record<GenreKey, Drama[]> = { romance, revenge, chaebol, contract, timeloop };
  const currentDramas = (genreMap[active] ?? []).slice(0, 12);
  const activeCfg = GENRES.find((g) => g.key === active)!;

  const handleGenreChange = (key: GenreKey) => {
    if (key === active) return;
    setActive(key);
    setAnimKey((k) => k + 1);
  };

  const allEmpty = [romance, revenge, chaebol, contract, timeloop].every((a) => a.length === 0);
  if (allEmpty) return null;

  return (
    <section
      ref={sectionRef}
      className={["relative home-section section-reveal", revealed ? "is-visible" : ""].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 md:px-12 mb-5">
        <div className="section-accent-bar" style={{ background: `linear-gradient(to bottom, ${activeCfg.accent}, transparent)`, transition: "background 0.3s" }} />
        <h2 className="section-title-premium">장르 허브</h2>
      </div>

      {/* Genre Button Hub */}
      <div className="px-5 md:px-12 mb-6">
        <div className="flex flex-wrap gap-2">
          {GENRES.map((cfg, i) => {
            const count = genreMap[cfg.key]?.length ?? 0;
            if (count === 0) return null;
            const isActive = active === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => handleGenreChange(cfg.key)}
                className="genre-hub-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] md:text-[13px] font-bold border transition-all duration-250 active:scale-95 focus:outline-none"
                style={{
                  opacity: 0,
                  animation: revealed ? `fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` : "none",
                  background: isActive ? cfg.bg : "rgba(255,255,255,0.04)",
                  borderColor: isActive ? cfg.accent + "55" : "rgba(255,255,255,0.08)",
                  color: isActive ? cfg.accent : "rgba(255,255,255,0.5)",
                  boxShadow: isActive ? `0 4px 20px -6px ${cfg.accent}44` : "none",
                }}
              >
                <span style={{ color: isActive ? cfg.accent : "rgba(255,255,255,0.35)" }}>
                  {cfg.icon}
                </span>
                {cfg.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: isActive ? cfg.accent + "22" : "rgba(255,255,255,0.06)", color: isActive ? cfg.accent : "rgba(255,255,255,0.3)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Grid — animated on genre change */}
      {currentDramas.length > 0 ? (
        <div
          key={animKey}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 px-5 md:px-12"
          style={{ animation: "genreHubIn 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {currentDramas.map((drama, i) => (
            <GenreCard key={drama.id} drama={drama} index={i} accentColor={activeCfg.accent} />
          ))}

          {/* View all button — last cell */}
          {genreMap[active].length > 12 && (
            <ViewAllCell label={`${activeCfg.label} 전체`} accent={activeCfg.accent} count={genreMap[active].length} onClick={() => {}} />
          )}
        </div>
      ) : (
        <p className="px-5 md:px-12 text-[12px] text-white/25">이 장르의 콘텐츠가 없습니다</p>
      )}

      <style>{`
        @keyframes genreHubIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

function GenreCard({ drama, index, accentColor }: { drama: Drama; index: number; accentColor: string }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative cursor-pointer"
      style={{
        opacity: 0,
        animation: `genreHubIn 0.3s cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 35, 280)}ms both`,
      }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          aspectRatio: "9/14",
          transform: hovered ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: hovered ? `0 16px 48px -12px rgba(0,0,0,0.7), 0 0 0 1.5px ${accentColor}44` : "0 4px 16px -4px rgba(0,0,0,0.4)",
        }}
      >
        {!imgErr ? (
          <img src={drama.poster || drama.backdrop} alt={drama.title} loading="lazy" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full bg-[#1a1a1c] flex items-center justify-center">
            <span className="text-[8px] text-white/30 text-center px-1">{drama.title}</span>
          </div>
        )}
        {(drama.isNew || drama.isExclusive) && (
          <div className="absolute top-1.5 left-1.5">
            {drama.isExclusive && <span className="block bg-white text-black text-[7px] font-black px-1.5 py-0.5 rounded mb-0.5 tracking-wide">독점</span>}
            {drama.isNew && <span className="block bg-white/90 text-black text-[7px] font-black px-1.5 py-0.5 rounded tracking-wide">NEW</span>}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-2 transition-opacity duration-200" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)", opacity: hovered ? 1 : 0 }}>
          <p className="text-[9px] md:text-[10px] font-bold text-white truncate">{drama.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <svg width="7" height="7" viewBox="0 0 10 10" fill="#ff3e6c"><path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" /></svg>
            <span className="text-[8px] text-white/50">{drama.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewAllCell({ label, accent, count, onClick }: { label: string; accent: string; count: number; onClick: () => void }) {
  return (
    <div
      className="relative cursor-pointer rounded-xl border flex flex-col items-center justify-center"
      style={{ aspectRatio: "9/14", borderColor: accent + "33", background: accent + "08" }}
      onClick={onClick}
    >
      <ChevronRight size={20} style={{ color: accent }} />
      <p className="text-[10px] md:text-[11px] font-bold mt-2 text-center px-2" style={{ color: accent }}>{label}</p>
      <p className="text-[9px] text-white/30 mt-1">{count}개</p>
    </div>
  );
}
