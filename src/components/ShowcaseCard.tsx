/**
 * ShowcaseCard — Premium OTT Card (Netflix / Apple TV+ / Disney+ Level)
 * Desktop/Tablet: Hover Scale 1.06 + Shadow + Image Scale + Floating Info Layer
 * Mobile: Netflix tap → info layer, 2nd tap → play
 */
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check, Info } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface ShowcaseCardProps {
  drama: Drama;
  rank?: number;
  size?: "sm" | "md" | "lg";
}

export default function ShowcaseCard({ drama, rank, size = "md" }: ShowcaseCardProps) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);

  const widthClass =
    size === "sm"
      ? "w-[90px] sm:w-[108px] md:w-[130px]"
      : size === "lg"
      ? "w-[140px] sm:w-[168px] md:w-[196px] lg:w-[210px]"
      : "w-[110px] sm:w-[140px] md:w-[164px] lg:w-[180px]";

  const rankOffset = rank !== undefined ? "ml-4 md:ml-6" : "";
  const firstEpisodeId = drama.episodes[0]?.id;

  const handleDesktopCardClick = () => {
    navigate(`/drama/${drama.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstEpisodeId) {
      navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    } else {
      navigate(`/drama/${drama.id}`);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(drama.id);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/drama/${drama.id}`);
  };

  // Mobile: Netflix-style tap behavior
  const handleMobileTap = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      tapCountRef.current += 1;

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

      if (tapCountRef.current === 1) {
        // 1st tap → show overlay
        setMobileOverlay(true);
        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
        }, 400);
      } else if (tapCountRef.current >= 2) {
        // 2nd tap → play immediately
        tapCountRef.current = 0;
        setMobileOverlay(false);
        if (firstEpisodeId) {
          navigate(`/watch/${drama.id}/${firstEpisodeId}`);
        } else {
          navigate(`/drama/${drama.id}`);
        }
      }
    },
    [navigate, drama.id, firstEpisodeId]
  );

  // Close mobile overlay on outside touch
  const handleMobileOverlayClose = (e: React.TouchEvent) => {
    e.stopPropagation();
    setMobileOverlay(false);
  };

  return (
    <div
      className={`group relative shrink-0 ${widthClass} ${rankOffset} cursor-pointer select-none`}
      style={{ isolation: "isolate" }}
      onClick={handleDesktopCardClick}
      onTouchEnd={handleMobileTap}
    >
      {/* ── Poster Wrapper ─────────────────────────────────────────────────── */}
      <div
        className={[
          "relative aspect-[9/16] rounded-xl overflow-hidden",
          "bg-[#1a1a1c]",
          "ring-1 ring-white/8",
          // Desktop hover: scale 1.06, shadow, transition 350ms cubic-bezier
          "transition-[transform,box-shadow] duration-[350ms]",
          "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.06]",
          "md:group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
          "md:group-hover:ring-white/15",
          "group-active:scale-[0.97]",
          // GPU acceleration: transform + opacity only
          "will-change-[transform,opacity]",
        ].join(" ")}
      >
        {/* Poster Image */}
        {!imgError ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className={[
              "w-full h-full object-cover",
              // Image scale on hover (desktop)
              "transition-transform duration-[350ms]",
              "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
              "md:group-hover:scale-[1.12]",
              "will-change-transform",
            ].join(" ")}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111113] p-3 text-center">
            <span className="text-white/40 text-2xl mb-2">🎬</span>
            <span className="text-[10px] text-white/50 leading-snug">{drama.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {drama.isExclusive && (
            <span className="bg-[#D4AF37] text-black text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow">
              독점
            </span>
          )}
          {drama.isNew && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow">
              NEW
            </span>
          )}
          {drama.isOriginal && !drama.isExclusive && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow bg-black/60 text-[#D4AF37] border border-[#D4AF37]/40">
              ORIGINAL
            </span>
          )}
        </div>

        {/* Rank Number (TOP 10) */}
        {rank !== undefined && (
          <div className="absolute -left-5 md:-left-7 bottom-0 leading-none pointer-events-none select-none z-10">
            <span
              className="font-black italic"
              style={{
                fontSize: rank <= 9 ? "5rem" : "4rem",
                lineHeight: "0.82",
                color: "transparent",
                WebkitTextStroke:
                  rank === 1
                    ? "2.5px #D4AF37"
                    : "2px rgba(212,175,55,0.7)",
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))",
              }}
            >
              {rank}
            </span>
          </div>
        )}

        {/* ── Desktop Hover: Dark Gradient Overlay + Floating Info Layer ── */}
        <div
          className={[
            "absolute inset-0",
            // Dark gradient overlay
            "bg-gradient-to-t from-black/80 via-black/30 to-transparent",
            "opacity-0 md:group-hover:opacity-100",
            "transition-opacity duration-[350ms]",
            "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "flex flex-col items-center justify-end pb-3 gap-2",
            "pointer-events-none md:group-hover:pointer-events-auto",
          ].join(" ")}
        >
          {/* Floating Info: title, rating, episodes */}
          <div
            className={[
              "w-full px-2.5",
              "opacity-0 md:group-hover:opacity-100",
              "translate-y-3 md:group-hover:translate-y-0",
              "transition-[opacity,transform] duration-[250ms]",
              "will-change-[opacity,transform]",
            ].join(" ")}
            style={{ transitionDelay: "60ms" }}
          >
            <p className="text-white font-bold text-[11px] md:text-[13px] truncate leading-tight mb-1">
              {drama.title}
            </p>
            <div className="flex items-center gap-1.5 mb-2.5">
              {/* Star rating */}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="#D4AF37">
                <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
              </svg>
              <span className="text-[10px] text-white/90 font-semibold">
                {drama.rating.toFixed(1)}
              </span>
              <span className="text-[10px] text-white/50">·</span>
              <span className="text-[10px] text-white/70">{drama.totalEpisodes}부작</span>
            </div>

            {/* Quick Actions: Play, Library, Detail */}
            <div className="flex items-center gap-1.5 justify-center">
              {/* Play */}
              <button
                onClick={handlePlayClick}
                className={[
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg",
                  "bg-white text-black text-[10px] font-bold",
                  "hover:bg-[#D4AF37] transition-colors duration-150",
                  "active:scale-90",
                  "shadow-md",
                ].join(" ")}
                aria-label="재생"
              >
                <Play size={10} className="fill-black text-black" />
                재생
              </button>

              {/* Library */}
              <button
                onClick={handleAddClick}
                className={[
                  "w-7 h-7 rounded-full border flex items-center justify-center",
                  "transition-colors duration-150 active:scale-90",
                  favorited
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]"
                    : "bg-white/10 border-white/30 text-white hover:border-[#D4AF37] hover:text-[#D4AF37]",
                ].join(" ")}
                aria-label={favorited ? "찜 해제" : "보관함 추가"}
              >
                {favorited ? <Check size={13} /> : <Plus size={13} />}
              </button>

              {/* Detail */}
              <button
                onClick={handleDetailClick}
                className="w-7 h-7 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white hover:border-white/60 transition-colors duration-150 active:scale-90"
                aria-label="상세보기"
              >
                <Info size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Overlay (Netflix-style tap) ─────────────────────────── */}
        {mobileOverlay && (
          <div
            className="absolute inset-0 z-20 md:hidden flex flex-col justify-end"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
              animation: "mobileOverlayIn 250ms cubic-bezier(0.22,1,0.36,1) forwards",
            }}
            onTouchEnd={handleMobileOverlayClose}
          >
            {/* Outside close area */}
            <div className="flex-1" />

            {/* Info content */}
            <div
              className="px-2.5 pb-3"
              style={{
                animation:
                  "mobileSlideUp 250ms cubic-bezier(0.22,1,0.36,1) forwards",
              }}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <p className="text-white font-bold text-[11px] truncate leading-tight mb-1">
                {drama.title}
              </p>
              <div className="flex items-center gap-1 mb-2.5">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="#D4AF37">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span className="text-[10px] text-white/90 font-semibold">
                  {drama.rating.toFixed(1)}
                </span>
                <span className="text-[10px] text-white/50">·</span>
                <span className="text-[10px] text-white/70">
                  {drama.totalEpisodes}부작
                </span>
              </div>

              <div className="flex items-center gap-1.5 justify-center">
                {/* Play */}
                <button
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setMobileOverlay(false);
                    if (firstEpisodeId) {
                      navigate(`/watch/${drama.id}/${firstEpisodeId}`);
                    } else {
                      navigate(`/drama/${drama.id}`);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold active:opacity-70"
                >
                  <Play size={10} className="fill-black text-black" />
                  재생
                </button>

                {/* Library */}
                <button
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFavorite(drama.id);
                  }}
                  className={[
                    "w-7 h-7 rounded-full border flex items-center justify-center",
                    favorited
                      ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]"
                      : "bg-white/10 border-white/30 text-white",
                  ].join(" ")}
                >
                  {favorited ? <Check size={13} /> : <Plus size={13} />}
                </button>

                {/* Detail */}
                <button
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setMobileOverlay(false);
                    navigate(`/drama/${drama.id}`);
                  }}
                  className="w-7 h-7 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white"
                >
                  <Info size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Card Text (below poster) ───────────────────────────────────────── */}
      <div className="mt-2.5 px-0.5">
        <p
          className={[
            "text-[11px] md:text-[13px] font-semibold text-white/90 truncate leading-snug",
            "transition-colors duration-200",
            "md:group-hover:text-white",
          ].join(" ")}
        >
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="#D4AF37">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[10px] text-white/50">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/50">{drama.totalEpisodes}부작</span>
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {drama.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8 leading-none"
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes mobileOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
