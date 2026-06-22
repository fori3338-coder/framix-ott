/**
 * ShowcaseCard — FRAMIX Premium Card System v2.0
 *
 * Card variants:
 *   default  → Standard portrait card (Hover: scale 1.06 + floating info)
 *   top10    → Netflix-style: large rank number behind card, white/silver stroke
 *   editor   → Apple TV+-style: landscape card, glass overlay, Editor Pick badge
 *   featured → Disney+-style: landscape card, hover info expansion
 *
 * Mobile: 1tap → info overlay, 2tap → play (all variants)
 */
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check, Info } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

export type CardVariant = "default" | "top10" | "editor" | "featured";

interface ShowcaseCardProps {
  drama: Drama;
  rank?: number;
  size?: "sm" | "md" | "lg";
  variant?: CardVariant;
}

// ── Shared Hooks / Utils ───────────────────────────────────────────────────

function useMobileTap(onInfo: () => void, onPlay: () => void) {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMobileTap = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      tapCountRef.current += 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (tapCountRef.current === 1) {
        onInfo();
        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
        }, 400);
      } else if (tapCountRef.current >= 2) {
        tapCountRef.current = 0;
        onPlay();
      }
    },
    [onInfo, onPlay]
  );

  return handleMobileTap;
}

// ── Quick Action Buttons (shared) ─────────────────────────────────────────

interface QuickActionsProps {
  dramaId: string;
  firstEpisodeId?: string;
  compact?: boolean;
  onPlay: (e: React.MouseEvent) => void;
  onAdd: (e: React.MouseEvent) => void;
  onDetail: (e: React.MouseEvent) => void;
  favorited: boolean;
}

function QuickActions({
  compact = false,
  onPlay,
  onAdd,
  onDetail,
  favorited,
}: QuickActionsProps) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "justify-start" : "justify-center"}`}>
      {/* Play */}
      <button
        onClick={onPlay}
        className={[
          "flex items-center gap-1 rounded-lg",
          "bg-white text-black font-bold",
          "hover:bg-white/90 active:scale-90",
          "transition-colors duration-150 shadow-md",
          compact ? "px-2 py-1.5 text-[10px]" : "px-2.5 py-1.5 text-[10px]",
        ].join(" ")}
        aria-label="재생"
      >
        <Play size={10} className="fill-black text-black" />
        재생
      </button>

      {/* Library */}
      <button
        onClick={onAdd}
        className={[
          "rounded-full border flex items-center justify-center",
          "transition-colors duration-150 active:scale-90",
          compact ? "w-7 h-7" : "w-7 h-7",
          favorited
            ? "bg-white/20 border-white text-white"
            : "bg-white/10 border-white/40 text-white hover:border-white/70 hover:text-white",
        ].join(" ")}
        aria-label={favorited ? "찜 해제" : "보관함 추가"}
      >
        {favorited ? <Check size={12} /> : <Plus size={12} />}
      </button>

      {/* Detail */}
      <button
        onClick={onDetail}
        className="w-7 h-7 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white hover:border-white/60 transition-colors duration-150 active:scale-90"
        aria-label="상세보기"
      >
        <Info size={12} />
      </button>
    </div>
  );
}

// ── Mobile Overlay (shared) ───────────────────────────────────────────────

interface MobileOverlayProps {
  drama: Drama;
  firstEpisodeId?: string;
  onClose: (e: React.TouchEvent) => void;
  favorited: boolean;
  toggleFavorite: (id: string) => void;
  landscape?: boolean;
}

function MobileOverlay({
  drama,
  firstEpisodeId,
  onClose,
  favorited,
  toggleFavorite,
  landscape = false,
}: MobileOverlayProps) {
  const navigate = useNavigate();

  return (
    <div
      className="absolute inset-0 z-20 md:hidden flex flex-col justify-end"
      style={{
        background:
          "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
        animation: "mobileOverlayIn 220ms cubic-bezier(0.22,1,0.36,1) forwards",
      }}
      onTouchEnd={onClose}
    >
      <div className="flex-1" />
      <div
        className="px-2.5 pb-3"
        style={{ animation: "mobileSlideUp 220ms cubic-bezier(0.22,1,0.36,1) forwards" }}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <p className={`text-white font-bold truncate leading-tight mb-0.5 ${landscape ? "text-[12px]" : "text-[11px]"}`}>
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mb-2">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="#E8E8E8">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[10px] text-white/85 font-semibold">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/40">·</span>
          <span className="text-[10px] text-white/60">{drama.totalEpisodes}부작</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
              else navigate(`/drama/${drama.id}`);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold active:opacity-70"
          >
            <Play size={10} className="fill-black text-black" />
            재생
          </button>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(drama.id); }}
            className={["w-7 h-7 rounded-full border flex items-center justify-center", favorited ? "bg-white/20 border-white text-white" : "bg-white/10 border-white/35 text-white"].join(" ")}
          >
            {favorited ? <Check size={12} /> : <Plus size={12} />}
          </button>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/drama/${drama.id}`); }}
            className="w-7 h-7 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white"
          >
            <Info size={12} />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes mobileOverlayIn { from{opacity:0}to{opacity:1} }
        @keyframes mobileSlideUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── 1. DEFAULT Card ── Standard portrait, hover float info ───────────────
// ══════════════════════════════════════════════════════════════════════════

function DefaultCard({ drama, size = "md" }: { drama: Drama; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  const widthClass =
    size === "sm" ? "w-[90px] sm:w-[108px] md:w-[130px]"
    : size === "lg" ? "w-[140px] sm:w-[168px] md:w-[196px] lg:w-[210px]"
    : "w-[110px] sm:w-[140px] md:w-[164px] lg:w-[180px]";

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); toggleFavorite(drama.id); };
  const handleDetail = (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drama/${drama.id}`); };

  const handleMobileTap = useMobileTap(
    () => setMobileOverlay(true),
    () => {
      setMobileOverlay(false);
      if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
      else navigate(`/drama/${drama.id}`);
    }
  );

  return (
    <div
      className={`group relative shrink-0 ${widthClass} cursor-pointer select-none`}
      style={{ isolation: "isolate" }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onTouchEnd={handleMobileTap}
    >
      {/* Poster */}
      <div
        className={[
          "relative aspect-[9/16] rounded-xl overflow-hidden bg-[#1a1a1c]",
          "ring-1 ring-white/8",
          "transition-[transform,box-shadow] duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.06] md:group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:group-hover:ring-white/18",
          "group-active:scale-[0.97] will-change-[transform]",
        ].join(" ")}
      >
        {!imgError ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.12] will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111113] p-3 text-center">
            <span className="text-white/40 text-2xl mb-2">🎬</span>
            <span className="text-[10px] text-white/50 leading-snug">{drama.title}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {drama.isExclusive && (
            <span className="bg-white text-black text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">독점</span>
          )}
          {drama.isNew && (
            <span className="bg-white/90 text-black text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">NEW</span>
          )}
        </div>

        {/* Desktop hover overlay */}
        <div
          className={[
            "absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent",
            "opacity-0 md:group-hover:opacity-100 transition-opacity duration-[350ms]",
            "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "flex flex-col items-center justify-end pb-3 gap-2",
            "pointer-events-none md:group-hover:pointer-events-auto",
          ].join(" ")}
        >
          <div
            className="w-full px-2.5 opacity-0 md:group-hover:opacity-100 translate-y-3 md:group-hover:translate-y-0 transition-[opacity,transform] duration-[250ms] will-change-[opacity,transform]"
            style={{ transitionDelay: "55ms" }}
          >
            <p className="text-white font-bold text-[12px] md:text-[13px] truncate leading-tight mb-1">{drama.title}</p>
            <div className="flex items-center gap-1.5 mb-2.5">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="#E0E0E0">
                <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
              </svg>
              <span className="text-[10px] text-white/90 font-semibold">{drama.rating.toFixed(1)}</span>
              <span className="text-[10px] text-white/45">·</span>
              <span className="text-[10px] text-white/65">{drama.totalEpisodes}부작</span>
            </div>
            <QuickActions
              dramaId={drama.id}
              firstEpisodeId={firstEpisodeId}
              onPlay={handlePlay}
              onAdd={handleAdd}
              onDetail={handleDetail}
              favorited={favorited}
            />
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileOverlay && (
          <MobileOverlay
            drama={drama}
            firstEpisodeId={firstEpisodeId}
            onClose={(e: React.TouchEvent) => { e.stopPropagation(); setMobileOverlay(false); }}
            favorited={favorited}
            toggleFavorite={toggleFavorite}
          />
        )}
      </div>

      {/* Below-card text */}
      <div className="mt-2.5 px-0.5">
        <p className="text-[11px] md:text-[13px] font-semibold text-white/85 truncate leading-snug transition-colors duration-200 md:group-hover:text-white">
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="#aaa">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[10px] text-white/45">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/25">·</span>
          <span className="text-[10px] text-white/45">{drama.totalEpisodes}부작</span>
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {drama.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/35 border border-white/8 leading-none">{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── 2. TOP 10 Card ── Netflix-style large rank + portrait ────────────────
// ══════════════════════════════════════════════════════════════════════════

function Top10Card({ drama, rank, size = "md" }: { drama: Drama; rank: number; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  // Width: wider to accommodate rank number
  const widthClass =
    size === "sm" ? "w-[100px] sm:w-[118px] md:w-[140px]"
    : size === "lg" ? "w-[148px] sm:w-[178px] md:w-[206px] lg:w-[220px]"
    : "w-[118px] sm:w-[148px] md:w-[172px] lg:w-[188px]";

  // Rank font size: 1-digit vs 2-digit
  const rankSize = rank >= 10 ? "clamp(3.8rem,7.5vw,6rem)" : "clamp(4.8rem,9vw,7.5rem)";
  const rankStroke = rank === 1 ? "3px #ffffff" : rank <= 3 ? "2.5px #d4d4d4" : "2px #888888";
  const rankShadow = rank <= 3 ? "0 2px 20px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.5)" : "0 2px 14px rgba(0,0,0,0.85)";

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); toggleFavorite(drama.id); };
  const handleDetail = (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drama/${drama.id}`); };

  const handleMobileTap = useMobileTap(
    () => setMobileOverlay(true),
    () => {
      setMobileOverlay(false);
      if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
      else navigate(`/drama/${drama.id}`);
    }
  );

  return (
    <div
      className={`group relative shrink-0 cursor-pointer select-none`}
      style={{ isolation: "isolate" }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onTouchEnd={handleMobileTap}
    >
      {/* Rank number — behind card, left offset */}
      <div
        className="absolute pointer-events-none select-none z-0"
        style={{
          left: "-0.15em",
          bottom: "36px", // above below-card text area
          lineHeight: 0.85,
          fontSize: rankSize,
          fontWeight: 900,
          fontStyle: "italic",
          color: "transparent",
          WebkitTextStroke: rankStroke,
          filter: `drop-shadow(${rankShadow})`,
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          letterSpacing: "-0.04em",
        }}
        aria-hidden="true"
      >
        {rank}
      </div>

      {/* Card — offset right to reveal rank */}
      <div className={`relative ${widthClass} ml-7 md:ml-9`}>
        {/* Poster */}
        <div
          className={[
            "relative aspect-[9/16] rounded-xl overflow-hidden bg-[#1a1a1c]",
            "ring-1 ring-white/10",
            "transition-[transform,box-shadow] duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "md:group-hover:scale-[1.06] md:group-hover:shadow-[0_20px_56px_rgba(0,0,0,0.55)] md:group-hover:ring-white/22",
            "group-active:scale-[0.97] will-change-[transform]",
          ].join(" ")}
        >
          {!imgError ? (
            <img
              src={drama.poster || drama.backdrop}
              alt={drama.title}
              decoding="async"
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.12] will-change-transform"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111113] p-3 text-center">
              <span className="text-white/40 text-2xl mb-2">🎬</span>
              <span className="text-[10px] text-white/50 leading-snug">{drama.title}</span>
            </div>
          )}

          {/* Desktop hover overlay */}
          <div
            className={[
              "absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent",
              "opacity-0 md:group-hover:opacity-100 transition-opacity duration-[350ms]",
              "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
              "flex flex-col items-center justify-end pb-3",
              "pointer-events-none md:group-hover:pointer-events-auto",
            ].join(" ")}
          >
            <div
              className="w-full px-2.5 opacity-0 md:group-hover:opacity-100 translate-y-3 md:group-hover:translate-y-0 transition-[opacity,transform] duration-[250ms]"
              style={{ transitionDelay: "55ms" }}
            >
              <p className="text-white font-bold text-[11px] md:text-[12px] truncate leading-tight mb-1">{drama.title}</p>
              {/* Rank badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] font-black text-white/60 tracking-widest uppercase">TOP {rank}</span>
                <span className="text-[9px] text-white/35">·</span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="#ccc">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span className="text-[10px] text-white/80 font-semibold">{drama.rating.toFixed(1)}</span>
              </div>
              <QuickActions
                dramaId={drama.id}
                firstEpisodeId={firstEpisodeId}
                onPlay={handlePlay}
                onAdd={handleAdd}
                onDetail={handleDetail}
                favorited={favorited}
              />
            </div>
          </div>

          {/* Mobile overlay */}
          {mobileOverlay && (
            <MobileOverlay
              drama={drama}
              firstEpisodeId={firstEpisodeId}
              onClose={(e: React.TouchEvent) => { e.stopPropagation(); setMobileOverlay(false); }}
              favorited={favorited}
              toggleFavorite={toggleFavorite}
            />
          )}
        </div>

        {/* Below-card text */}
        <div className="mt-2.5 px-0.5">
          <p className="text-[11px] md:text-[12px] font-semibold text-white/80 truncate leading-snug md:group-hover:text-white transition-colors duration-200">
            {drama.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] font-bold text-white/35 tracking-wider">#{rank} TODAY</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── 3. EDITOR PICK Card ── Apple TV+-style landscape + glass badge ────────
// ══════════════════════════════════════════════════════════════════════════

function EditorCard({ drama, size = "md" }: { drama: Drama; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  // Landscape: wider card
  const widthClass =
    size === "sm" ? "w-[200px] sm:w-[240px] md:w-[280px]"
    : size === "lg" ? "w-[280px] sm:w-[340px] md:w-[400px]"
    : "w-[240px] sm:w-[290px] md:w-[340px]";

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); toggleFavorite(drama.id); };
  const handleDetail = (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drama/${drama.id}`); };

  const handleMobileTap = useMobileTap(
    () => setMobileOverlay(true),
    () => {
      setMobileOverlay(false);
      if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
      else navigate(`/drama/${drama.id}`);
    }
  );

  return (
    <div
      className={`group relative shrink-0 ${widthClass} cursor-pointer select-none`}
      style={{ isolation: "isolate" }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onTouchEnd={handleMobileTap}
    >
      {/* Landscape Thumbnail 16:9 */}
      <div
        className={[
          "relative w-full rounded-xl overflow-hidden bg-[#1a1a1c]",
          "ring-1 ring-white/8",
          "transition-[transform,box-shadow] duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.04] md:group-hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)] md:group-hover:ring-white/20",
          "group-active:scale-[0.97] will-change-[transform]",
        ].join(" ")}
        style={{ aspectRatio: "16/9" }}
      >
        {!imgError ? (
          <img
            src={drama.backdrop || drama.poster}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.08] will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111] text-white/30 text-[11px]">
            {drama.title}
          </div>
        )}

        {/* Always-on dark bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        {/* Editor Pick badge — top left, glass */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={[
              "flex items-center gap-1 px-2 py-1 rounded-md",
              "text-[9px] font-black tracking-widest text-white/90 uppercase",
              "border border-white/20",
            ].join(" ")}
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.5 3.2 3.5.5-2.5 2.4.6 3.4L6 8.9l-3.1 1.6.6-3.4L1 4.7l3.5-.5z" fill="#fff" fillOpacity=".85" />
            </svg>
            Editor Pick
          </div>
        </div>

        {/* Original badge — top right */}
        {drama.isOriginal && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="text-[8px] font-black text-white/55 tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border border-white/15 bg-black/40">
              ORIGINAL
            </span>
          </div>
        )}

        {/* Hover overlay — full glass info expansion */}
        <div
          className={[
            "absolute inset-0",
            "opacity-0 md:group-hover:opacity-100 transition-opacity duration-[300ms]",
            "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "flex flex-col justify-end pb-3 px-3",
            "pointer-events-none md:group-hover:pointer-events-auto",
          ].join(" ")}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.22) 60%, transparent 100%)" }}
        >
          <div
            className="opacity-0 md:group-hover:opacity-100 translate-y-2 md:group-hover:translate-y-0 transition-[opacity,transform] duration-[240ms]"
            style={{ transitionDelay: "50ms" }}
          >
            <p className="text-white font-bold text-[13px] truncate leading-tight mb-1">{drama.title}</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="#ddd">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span className="text-[11px] text-white/85 font-semibold">{drama.rating.toFixed(1)}</span>
              </div>
              <span className="text-[10px] text-white/40">·</span>
              <span className="text-[10px] text-white/60">{drama.totalEpisodes}부작</span>
              <span className="text-[10px] text-white/40">·</span>
              <span className="text-[10px] text-white/55">{drama.genres[0]}</span>
            </div>
            <QuickActions
              dramaId={drama.id}
              firstEpisodeId={firstEpisodeId}
              compact
              onPlay={handlePlay}
              onAdd={handleAdd}
              onDetail={handleDetail}
              favorited={favorited}
            />
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileOverlay && (
          <MobileOverlay
            drama={drama}
            firstEpisodeId={firstEpisodeId}
            onClose={(e: React.TouchEvent) => { e.stopPropagation(); setMobileOverlay(false); }}
            favorited={favorited}
            toggleFavorite={toggleFavorite}
            landscape
          />
        )}
      </div>

      {/* Below-card text — minimal */}
      <div className="mt-2 px-0.5">
        <p className="text-[12px] font-semibold text-white/80 truncate leading-snug md:group-hover:text-white transition-colors duration-200">
          {drama.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {drama.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[9px] text-white/35">{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── 4. FEATURED Card ── Disney+-style landscape, hover info expansion ─────
// ══════════════════════════════════════════════════════════════════════════

function FeaturedCard({ drama, size = "md" }: { drama: Drama; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  const widthClass =
    size === "sm" ? "w-[220px] sm:w-[260px] md:w-[300px]"
    : size === "lg" ? "w-[300px] sm:w-[360px] md:w-[420px]"
    : "w-[260px] sm:w-[310px] md:w-[360px]";

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); toggleFavorite(drama.id); };
  const handleDetail = (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/drama/${drama.id}`); };

  const handleMobileTap = useMobileTap(
    () => setMobileOverlay(true),
    () => {
      setMobileOverlay(false);
      if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
      else navigate(`/drama/${drama.id}`);
    }
  );

  return (
    <div
      className={`group relative shrink-0 ${widthClass} cursor-pointer select-none`}
      style={{ isolation: "isolate" }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onTouchEnd={handleMobileTap}
    >
      {/* Landscape 16:9 container — expands on hover */}
      <div
        className={[
          "relative w-full overflow-hidden bg-[#111] rounded-xl",
          "ring-1 ring-white/6",
          // Hover: scale + shadow + height reveal
          "transition-[transform,box-shadow] duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.04] md:group-hover:shadow-[0_18px_52px_rgba(0,0,0,0.65)] md:group-hover:ring-white/18",
          "group-active:scale-[0.97] will-change-[transform]",
        ].join(" ")}
        style={{ aspectRatio: "16/9" }}
      >
        {!imgError ? (
          <img
            src={drama.backdrop || drama.poster}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.10] will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/25 text-[11px]">{drama.title}</div>
        )}

        {/* Resting gradient — subtle bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Resting badges */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2.5 z-10">
          <div className="flex gap-1.5">
            {drama.isNew && (
              <span className="text-[8px] font-black text-white/80 tracking-widest uppercase px-1.5 py-0.5 rounded border border-white/20 bg-black/40">NEW</span>
            )}
            {drama.isExclusive && (
              <span className="text-[8px] font-black text-white/80 tracking-widest uppercase px-1.5 py-0.5 rounded border border-white/20 bg-black/40">독점</span>
            )}
          </div>
          <span className="text-[8px] font-bold text-white/35 tracking-wider">{drama.year}</span>
        </div>

        {/* Hover — full info expansion */}
        <div
          className={[
            "absolute inset-0",
            "opacity-0 md:group-hover:opacity-100",
            "transition-opacity duration-[300ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "flex flex-col justify-end",
            "pointer-events-none md:group-hover:pointer-events-auto",
          ].join(" ")}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.30) 55%, transparent 100%)" }}
        >
          <div
            className="pb-3 px-3 opacity-0 md:group-hover:opacity-100 translate-y-3 md:group-hover:translate-y-0 transition-[opacity,transform] duration-[260ms]"
            style={{ transitionDelay: "45ms" }}
          >
            <p className="text-white font-bold text-[14px] leading-tight truncate mb-1">{drama.title}</p>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center gap-1">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="#ddd">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span className="text-[11px] text-white/90 font-semibold">{drama.rating.toFixed(1)}</span>
              </div>
              <span className="text-[10px] text-white/38">·</span>
              <span className="text-[10px] text-white/65">{drama.totalEpisodes}부작</span>
              <span className="text-[10px] text-white/38">·</span>
              {drama.genres.slice(0, 1).map((g) => (
                <span key={g} className="text-[10px] text-white/55">{g}</span>
              ))}
            </div>
            <QuickActions
              dramaId={drama.id}
              firstEpisodeId={firstEpisodeId}
              compact
              onPlay={handlePlay}
              onAdd={handleAdd}
              onDetail={handleDetail}
              favorited={favorited}
            />
          </div>
        </div>

        {/* Resting title (bottom, faint) — hidden on hover */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 md:group-hover:opacity-0 transition-opacity duration-200">
          <p className="text-white/65 font-semibold text-[12px] truncate">{drama.title}</p>
        </div>

        {/* Mobile overlay */}
        {mobileOverlay && (
          <MobileOverlay
            drama={drama}
            firstEpisodeId={firstEpisodeId}
            onClose={(e: React.TouchEvent) => { e.stopPropagation(); setMobileOverlay(false); }}
            favorited={favorited}
            toggleFavorite={toggleFavorite}
            landscape
          />
        )}
      </div>

      {/* Below-card text */}
      <div className="mt-2 px-0.5">
        <p className="text-[12px] font-semibold text-white/75 truncate leading-snug md:group-hover:text-white transition-colors duration-200">
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="#999">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[10px] text-white/40">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/22">·</span>
          <span className="text-[10px] text-white/40">{drama.totalEpisodes}부작</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Main Export ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

export default function ShowcaseCard({ drama, rank, size = "md", variant = "default" }: ShowcaseCardProps) {
  if (variant === "top10" && rank !== undefined) {
    return <Top10Card drama={drama} rank={rank} size={size} />;
  }
  if (variant === "editor") {
    return <EditorCard drama={drama} size={size} />;
  }
  if (variant === "featured") {
    return <FeaturedCard drama={drama} size={size} />;
  }
  // Legacy: showRank passed via rank prop without variant → still render Top10Card
  if (rank !== undefined) {
    return <Top10Card drama={drama} rank={rank} size={size} />;
  }
  return <DefaultCard drama={drama} size={size} />;
}
