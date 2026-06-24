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
import { FramixBadgeStack } from "./FramixBadge";
import { isFramixOriginal } from "../lib/framixBadges";
import { getLiveViewerCount, getReleaseCountdown } from "../lib/premiumStats";

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
// ── 1. DEFAULT Card V4 ── OTT Premium with 3-layer shadows, overlay system ──
// ══════════════════════════════════════════════════════════════════════════

function DefaultCard({ drama, size = "md" }: { drama: Drama; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  const widthClass =
    size === "sm" ? "w-[100px] sm:w-[120px] md:w-[140px]"
    : size === "lg" ? "w-[150px] sm:w-[180px] md:w-[210px]"
    : "w-[125px] sm:w-[155px] md:w-[180px]";

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
      {/* Card Container with 3-layer shadow system */}
      <div
        className={[
          "relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-[#0f0f10]",
          isFramixOriginal(drama) ? "framix-original-card" : "",
          "ring-1 ring-white/10",
          "shadow-[0_2px_8px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.45),0_16px_48px_rgba(0,0,0,0.6)]",
          "transition-[transform,box-shadow,ring-color] duration-[320ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.08]",
          "md:group-hover:-translate-y-[8px]",
          "md:group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.4),0_20px_48px_rgba(0,0,0,0.6),0_32px_80px_rgba(0,0,0,0.75)]",
          "md:group-hover:ring-white/24",
          "group-active:scale-[0.97]",
          "will-change-[transform,box-shadow]",
        ].join(" ")}
      >
        {/* Image with individual hover zoom */}
        {!imgError ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.15] will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a1c] to-[#0a0a0c] p-2 text-center">
            <span className="text-white/30 text-xl mb-1">🎬</span>
            <span className="text-[9px] text-white/40 leading-tight">{drama.title}</span>
          </div>
        )}

        {/* FRAMIX badge system */}
        <FramixBadgeStack drama={drama} size="xs" className="absolute top-2 left-2 z-10" />

        {/* Live viewers + D-Day (top-right) */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {getReleaseCountdown(drama) && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider leading-none"
              style={{
                background:
                  getReleaseCountdown(drama) === "NOW OPEN"
                    ? "linear-gradient(135deg,#ff3e6c,#b91c45)"
                    : "rgba(0,0,0,0.7)",
                color: "#fff",
                border:
                  getReleaseCountdown(drama) === "NOW OPEN"
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(212,175,55,0.55)",
                boxShadow:
                  getReleaseCountdown(drama) === "NOW OPEN"
                    ? "0 4px 12px rgba(255,62,108,0.45)"
                    : "none",
              }}
            >
              {getReleaseCountdown(drama)}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-sm text-[9px] font-bold text-white/95 leading-none">
            <span className="text-[10px] leading-none">🔥</span>
            {getLiveViewerCount(drama).toLocaleString("en-US")}
          </span>
        </div>


        {/* Bottom Overlay: Appears on hover with Play, Save, Details */}
        <div
          className={[
            "absolute inset-0",
            "bg-gradient-to-t from-black/95 via-black/50 to-transparent",
            "opacity-0 md:group-hover:opacity-100",
            "transition-opacity duration-[280ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "flex flex-col items-center justify-end pb-2.5",
            "pointer-events-none md:group-hover:pointer-events-auto",
          ].join(" ")}
        >
          <div
            className="w-full px-2 opacity-0 md:group-hover:opacity-100 translate-y-3 md:group-hover:translate-y-0 transition-[opacity,transform] duration-[240ms]"
            style={{ transitionDelay: "60ms" }}
          >
            {/* Title */}
            <p className="text-white font-bold text-[10px] md:text-[11px] truncate leading-tight mb-1.5">
              {drama.title}
            </p>

            {/* Info: Rating, Genre, Episodes */}
            <div className="flex items-center gap-1 mb-2 flex-wrap text-[9px] font-medium">
              <svg width="7" height="7" viewBox="0 0 10 10" fill="#E0E0E0">
                <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
              </svg>
              <span className="text-white/85 font-semibold">{drama.rating.toFixed(1)}</span>
              <span className="text-white/35">·</span>
              <span className="text-white/65">{drama.genres[0]}</span>
              <span className="text-white/35">·</span>
              <span className="text-white/65">{drama.totalEpisodes}부작</span>
            </div>

            {/* Quick Actions: Play, Save, Details */}
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
          />
        )}
      </div>

      {/* Below-card Info: Title + Genre */}
      <div className="mt-2.5 px-0.5">
        <p className="text-[10px] md:text-[11px] font-semibold text-white/80 truncate leading-snug md:group-hover:text-white transition-colors duration-200">
          {drama.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <svg width="7" height="7" viewBox="0 0 10 10" fill="#999">
            <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
          </svg>
          <span className="text-[8px] text-white/45">{drama.rating.toFixed(1)}</span>
          <span className="text-[8px] text-white/25">·</span>
          {drama.genres.slice(0, 1).map((g) => (
            <span key={g} className="text-[8px] text-white/40">{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── 2. TOP 10 Card V3 ── Netflix Global Top10 style with large rank ────────
// ══════════════════════════════════════════════════════════════════════════

function Top10Card({ drama, rank, size = "md" }: { drama: Drama; rank: number; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  // Card width (standard portrait)
  const widthClass =
    size === "sm" ? "w-[130px] sm:w-[150px] md:w-[170px]"
    : size === "lg" ? "w-[160px] sm:w-[190px] md:w-[220px]"
    : "w-[145px] sm:w-[170px] md:w-[195px]";

  // Rank font: crisp large outline style — 지시서 스펙 150~180px
  const rankSize = rank >= 10 ? "clamp(120px, 16vw, 160px)" : "clamp(130px, 18vw, 180px)";

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
      className="group relative shrink-0 cursor-pointer select-none"
      style={{ isolation: "isolate" }}
      onClick={() => navigate(`/drama/${drama.id}`)}
      onTouchEnd={handleMobileTap}
    >
      {/* Large Rank Number: Behind card, left-aligned, breaking through */}
      <div
        className="absolute pointer-events-none select-none z-0"
        style={{
          left: "0",
          bottom: "-10px",
          lineHeight: 0.82,
          fontSize: rankSize,
          fontWeight: 900,
          color: "transparent",
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          letterSpacing: "-0.08em",
          WebkitTextStroke: rank === 1
            ? "3px rgba(212,175,55,0.85)"
            : rank <= 3
            ? "2.5px rgba(192,192,192,0.65)"
            : "2px rgba(255,255,255,0.18)",
          paintOrder: "stroke fill",
          textShadow: rank === 1
            ? "0 0 40px rgba(212,175,55,0.35), 0 8px 32px rgba(212,175,55,0.25), 0 2px 8px rgba(0,0,0,0.9)"
            : rank <= 3
            ? "0 0 30px rgba(192,192,192,0.20), 0 6px 24px rgba(0,0,0,0.8)"
            : "0 4px 16px rgba(0,0,0,0.8)",
        }}
        aria-hidden="true"
      >
        {rank}
      </div>

      {/* Card Container: Position relative to allow overlap with rank */}
      <div className={`relative ${widthClass} z-[2]`}>
        {/* Poster: 3-layer shadow system */}
        <div
          className={[
            "relative w-full aspect-[9/16] rounded-xl overflow-hidden",
            "bg-[#1a1a1c]",
            "ring-1 ring-white/12",
            "shadow-[0_4px_12px_rgba(0,0,0,0.3),0_12px_32px_rgba(0,0,0,0.5),0_20px_60px_rgba(0,0,0,0.7)]",
            "transition-[transform,box-shadow,ring-color] duration-[320ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "md:group-hover:scale-[1.08]",
            "md:group-hover:-translate-y-[8px]",
            "md:group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.45),0_24px_56px_rgba(0,0,0,0.65),0_36px_84px_rgba(0,0,0,0.8)]",
            "md:group-hover:ring-white/25",
            "group-active:scale-[0.97]",
            "will-change-[transform,box-shadow]",
          ].join(" ")}
        >
          {/* Image with hover zoom */}
          {!imgError ? (
            <img
              src={drama.poster || drama.backdrop}
              alt={drama.title}
              decoding="async"
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-[300ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:group-hover:scale-[1.15] will-change-transform"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#0a0a0c] p-2 text-center">
              <span className="text-white/30 text-2xl mb-2">🎬</span>
              <span className="text-[9px] text-white/40 leading-tight">{drama.title}</span>
            </div>
          )}

          {/* Preview Overlay: Bottom gradient + action buttons */}
          <div
            className={[
              "absolute inset-0",
              "bg-gradient-to-t from-black/90 via-black/40 to-transparent",
              "opacity-0 md:group-hover:opacity-100",
              "transition-opacity duration-[280ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
              "flex flex-col items-center justify-end pb-3",
              "pointer-events-none md:group-hover:pointer-events-auto",
            ].join(" ")}
          >
            {/* Overlay Content: Title, Rating, Actions */}
            <div
              className="w-full px-2.5 opacity-0 md:group-hover:opacity-100 translate-y-4 md:group-hover:translate-y-0 transition-[opacity,transform] duration-[240ms]"
              style={{ transitionDelay: "60ms" }}
            >
              {/* Title */}
              <p className="text-white font-bold text-[11px] md:text-[12px] truncate leading-tight mb-1.5">
                {drama.title}
              </p>

              {/* Info Row: Rating, Episodes, Genre */}
              <div className="flex items-center gap-1 mb-2.5 flex-wrap">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="#E0E0E0">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span className="text-[9px] font-semibold text-white/85">{drama.rating.toFixed(1)}</span>
                <span className="text-[8px] text-white/35">·</span>
                <span className="text-[9px] text-white/60">{drama.totalEpisodes}부작</span>
              </div>

              {/* Quick Actions: Play, Save, Details */}
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
            />
          )}
        </div>

        {/* Below-card: Title + Rank */}
        <div className="mt-3 px-0.5">
          <p className="text-[11px] md:text-[12px] font-semibold text-white/80 truncate leading-tight md:group-hover:text-white transition-colors duration-200">
            {drama.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[8px] font-black text-white/40 tracking-wider">TOP {rank}</span>
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
          isFramixOriginal(drama) ? "framix-original-card" : "",
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

        {/* FRAMIX badge system */}
        <FramixBadgeStack drama={drama} size="sm" max={2} className="absolute top-2.5 left-2.5 z-10" />

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
          isFramixOriginal(drama) ? "framix-original-card" : "",
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

        {/* Resting badges — FRAMIX system */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2.5 z-10">
          <FramixBadgeStack drama={drama} size="sm" max={2} />
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
