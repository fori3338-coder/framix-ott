/**
 * GenreHub — 장르 허브 컴포넌트
 *
 * 로맨스 · 복수 · 재벌 · 계약결혼 · 타임루프 5개 장르를
 * 탭 + 그리드 형태로 통합 표시.
 * 모바일: 2열 Grid, 데스크톱: 5열 카드
 * Scroll Reveal 적용
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Swords, Crown, Handshake, Clock } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface GenreHubProps {
  romance: Drama[];
  revenge: Drama[];
  chaebol: Drama[];
  contract: Drama[];
  timeloop: Drama[];
}

type GenreKey = "romance" | "revenge" | "chaebol" | "contract" | "timeloop";

const GENRE_CONFIG: { key: GenreKey; label: string; icon: React.ReactNode; color: string; accent: string }[] = [
  {
    key: "romance",
    label: "로맨스",
    icon: <Heart size={13} />,
    color: "rgba(236,72,153,0.15)",
    accent: "#ec4899",
  },
  {
    key: "revenge",
    label: "복수",
    icon: <Swords size={13} />,
    color: "rgba(239,68,68,0.15)",
    accent: "#ef4444",
  },
  {
    key: "chaebol",
    label: "재벌",
    icon: <Crown size={13} />,
    color: "rgba(212,175,55,0.15)",
    accent: "#ff3e6c",
  },
  {
    key: "contract",
    label: "계약결혼",
    icon: <Handshake size={13} />,
    color: "rgba(168,85,247,0.15)",
    accent: "#a855f7",
  },
  {
    key: "timeloop",
    label: "타임루프",
    icon: <Clock size={13} />,
    color: "rgba(59,130,246,0.15)",
    accent: "#3b82f6",
  },
];

export default function GenreHub({ romance, revenge, chaebol, contract, timeloop }: GenreHubProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeGenre, setActiveGenre] = useState<GenreKey>("romance");

  const genreMap: Record<GenreKey, Drama[]> = { romance, revenge, chaebol, contract, timeloop };
  const currentConfig = GENRE_CONFIG.find((g) => g.key === activeGenre)!;
  const currentDramas = genreMap[activeGenre].slice(0, 10);

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

  // hide if all empty
  if ([romance, revenge, chaebol, contract, timeloop].every((a) => a.length === 0)) return null;

  return (
    <section
      ref={sectionRef}
      className={["relative home-section section-reveal", revealed ? "is-visible" : ""].join(" ")}
    >
      {/* ── Section Header ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between px-5 md:px-12 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="section-accent-bar" />
          <h2 className="section-title-premium">장르 허브</h2>
        </div>
      </div>

      {/* ── Genre Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-5 md:px-12 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {GENRE_CONFIG.map((cfg, i) => (
          <button
            key={cfg.key}
            onClick={() => setActiveGenre(cfg.key)}
            className="genre-hub-tab flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] md:text-[12px] font-bold border transition-all duration-200 active:scale-95 focus:outline-none"
            style={{
              opacity: 0,
              animation: revealed ? `fade-in-up 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 55}ms both` : "none",
              background: activeGenre === cfg.key ? cfg.color : "rgba(255,255,255,0.05)",
              borderColor: activeGenre === cfg.key ? cfg.accent + "55" : "rgba(255,255,255,0.1)",
              color: activeGenre === cfg.key ? cfg.accent : "rgba(255,255,255,0.55)",
              boxShadow: activeGenre === cfg.key ? `0 4px 16px -4px ${cfg.accent}33` : "none",
            }}
          >
            <span style={{ color: activeGenre === cfg.key ? cfg.accent : "rgba(255,255,255,0.4)" }}>
              {cfg.icon}
            </span>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* ── Genre Grid ─────────────────────────────────────────────────── */}
      {currentDramas.length > 0 ? (
        <div
          key={activeGenre}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 px-5 md:px-12"
          style={{ animation: "genreGridIn 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {currentDramas.map((drama, i) => (
            <GenreCard
              key={drama.id}
              drama={drama}
              index={i}
              accentColor={currentConfig.accent}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 md:px-12 py-12 text-center">
          <p className="text-[12px] text-white/25">이 장르의 콘텐츠가 없습니다</p>
        </div>
      )}

      <style>{`
        @keyframes genreGridIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

// ── Genre Card ─────────────────────────────────────────────────────────────
function GenreCard({ drama, index, accentColor }: { drama: Drama; index: number; accentColor: string }) {
  const [imgErr, setImgErr] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative cursor-pointer select-none"
      style={{ transitionDelay: `${Math.min(index * 30, 180)}ms` }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster */}
      <div
        className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#1a1a1c] ring-1 ring-white/8 transition-all duration-350 will-change-transform"
        style={{
          transform: hovered ? "scale(1.05)" : "scale(1)",
          boxShadow: hovered ? `0 18px 48px -12px rgba(0,0,0,0.65), 0 0 0 1.5px ${accentColor}44` : "none",
          transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
          transitionDuration: "320ms",
        }}
      >
        {!imgErr ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-350 will-change-transform"
            style={{
              transform: hovered ? "scale(1.1)" : "scale(1)",
              transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
            }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111113]">
            <span className="text-[10px] text-white/40">{drama.title}</span>
          </div>
        )}

        {/* Badges */}
        {(drama.isNew || drama.isExclusive) && (
          <div className="absolute top-2 left-2 flex gap-1 z-10">
            {drama.isExclusive && (
              <span className="bg-white text-black text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide">독점</span>
            )}
            {drama.isNew && (
              <span className="bg-white/90 text-black text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide">NEW</span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col justify-end pb-3 px-2.5 transition-opacity duration-250"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)",
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <div
            className="transition-all duration-250"
            style={{ transform: hovered ? "translateY(0)" : "translateY(10px)", opacity: hovered ? 1 : 0 }}
          >
            <p className="text-white font-bold text-[11px] md:text-[12px] truncate mb-1.5">{drama.title}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
                  else navigate(`/drama/${drama.id}`);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white text-black text-[9px] font-bold hover:bg-white/90 active:scale-90 transition-all duration-150"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="black"><path d="M5 3l14 9-14 9V3z"/></svg>
                재생
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(drama.id); }}
                className={[
                  "w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-150 active:scale-90",
                  favorited ? "bg-white/20 border-white text-white" : "bg-white/10 border-white/35 text-white",
                ].join(" ")}
              >
                {favorited
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" fill="none"><path d="M12 5v14M5 12h14"/></svg>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Below text */}
      <div className="mt-2 px-0.5">
        <p className="text-[10px] md:text-[11px] font-semibold text-white/80 truncate leading-snug">{drama.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="#aaa">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[9px] text-white/40">{drama.rating.toFixed(1)}</span>
          <span className="text-[9px] text-white/22">·</span>
          <span className="text-[9px] text-white/38">{drama.totalEpisodes}부작</span>
        </div>
      </div>
    </div>
  );
}
