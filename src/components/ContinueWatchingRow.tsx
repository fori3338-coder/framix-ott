/**
 * ContinueWatchingRow — Premium 이어보기 섹션
 * - 카드 30% 더 크게 (cw-card-lg)
 * - Scroll Reveal (IntersectionObserver)
 * - Premium section typography
 * - Dark theme optimized
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContinueWatchingItem } from "../types";
import { supabase } from "../lib/supabase";

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function formatLastWatched(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 시청";
  if (diffMin < 60) return `${diffMin}분 전 시청`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전 시청`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "어제 시청";
  return `${diffDay}일 전 시청`;
}

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onRemove?: (episodeId: string) => void;
}

export default function ContinueWatchingRow({ items, onRemove }: ContinueWatchingRowProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [revealed, setRevealed] = useState(false);

  // Scroll Reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [items.length, updateScroll]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleRemove = async (e: React.MouseEvent, item: ContinueWatchingItem) => {
    e.stopPropagation();
    onRemove?.(item.episodeId);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (uid) {
      await supabase
        .from("watch_history")
        .delete()
        .eq("user_id", uid)
        .eq("episode_id", item.episodeId);
    }
  };

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={[
        "relative home-section section-reveal",
        revealed ? "is-visible" : "",
      ].join(" ")}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between px-5 md:px-12 mb-5 md:mb-7">
        <div className="flex items-center gap-3 min-w-0">
          <div className="section-accent-bar" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="section-title-premium">이어보기</h2>
              <span className="text-[9px] md:text-[10px] font-black px-2 py-[3px] rounded-full tracking-widest border bg-white/8 text-white/65 border-white/14">
                계속 시청
              </span>
            </div>
            <p className="section-subtitle-premium hidden md:block">
              중단한 지점부터 다시 시작하세요
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => scrollBy(-800)}
            disabled={!canPrev}
            className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/50 hover:border-white/30 hover:text-white disabled:opacity-20 transition-all duration-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(800)}
            disabled={!canNext}
            className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/50 hover:border-white/30 hover:text-white disabled:opacity-20 transition-all duration-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Edge fades */}
      <div className="relative group/cw-row">
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-6 md:w-12 bg-gradient-to-r from-[#050505] to-transparent z-[5]" />
        <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-10 md:w-20 bg-gradient-to-l from-[#050505] to-transparent z-[5]" />

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-6 md:pb-8"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {items.map((item, idx) => (
            <ContinueWatchingCard
              key={item.episodeId}
              item={item}
              idx={idx}
              revealed={revealed}
              onPlay={() => navigate(`/watch/${item.dramaId}/${item.episodeId}`)}
              onRemove={(e) => handleRemove(e, item)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Individual Card ───────────────────────────────────────────────────────
function ContinueWatchingCard({
  item,
  idx,
  revealed,
  onPlay,
  onRemove,
}: {
  item: ContinueWatchingItem;
  idx: number;
  revealed: boolean;
  onPlay: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const remainSec = Math.max(0, item.durationSeconds - item.progressSeconds);
  const progressPct = Math.min(100, Math.max(0, item.progress));

  // Progress color: red-ish for near-done (≥85%), white otherwise
  const progressColor = progressPct >= 85 ? "#e50914" : "rgba(255,255,255,0.88)";

  return (
    <div
      className="relative shrink-0 cursor-pointer group"
      style={{
        width: "clamp(280px, 42vw, 380px)",
        height: "clamp(280px, 38vw, 340px)",
        scrollSnapAlign: "start",
        opacity: 0,
        animation: revealed
          ? `fade-in-up 0.55s cubic-bezier(0.22,1,0.36,1) ${Math.min(idx * 60, 360)}ms both`
          : "none",
      }}
      onClick={onPlay}
    >
      {/* ── Thumbnail 16:9 with Netflix-style enhancement ─────────────── */}
      <div
        className={[
          "relative w-full h-3/5 rounded-lg overflow-hidden bg-zinc-900",
          "transition-[transform,box-shadow] duration-[300ms]",
          "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.06]",
          "md:group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)]",
          "will-change-[transform]",
        ].join(" ")}
      >
        <img
          src={item.thumbnail}
          alt={item.seriesTitle}
          className={[
            "w-full h-full object-cover",
            "transition-transform duration-[300ms]",
            "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "md:group-hover:scale-[1.08]",
            "will-change-transform",
          ].join(" ")}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith("/content/fallback-poster.svg"))
              img.src = "/content/fallback-poster.svg";
          }}
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* ── Play Button: Large, always visible, emphasized on hover ──── */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={[
              "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
              "transition-[transform,opacity,background] duration-[280ms]",
              // Resting: semi-visible
              "opacity-50 md:group-hover:opacity-100",
              "scale-90 md:group-hover:scale-110",
              "bg-white/85 md:group-hover:bg-white",
            ].join(" ")}
          >
            <Play size={24} className="text-black fill-black ml-1" />
          </div>
        </div>

        {/* ── Remove Button ─────────────────────────────────────────────── */}
        <button
          onClick={onRemove}
          className={[
            "absolute top-3 right-3 w-8 h-8 rounded-full",
            "bg-black/75 border border-white/20",
            "flex items-center justify-center text-white/60",
            "hover:text-white hover:bg-black/95 hover:border-white/40",
            "transition-all z-10",
            "opacity-0 md:group-hover:opacity-100",
            "active:scale-90",
          ].join(" ")}
          aria-label="이어보기 목록에서 삭제"
        >
          <X size={14} />
        </button>

        {/* ── Episode Info badge ────────────────────────────────────────── */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="text-[9px] font-bold text-white/75 px-2 py-1 rounded border border-white/15"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          >
            {item.episodeNumber}화
            {item.episodeTitle ? ` · ${item.episodeTitle}` : ""}
          </span>
        </div>

        {/* ── Progress Bar ──────────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/15">
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${progressPct}%`, background: progressColor }}
          />
        </div>
      </div>

      {/* ── Info Section (Title, Progress, Time, Button) ────────────── */}
      <div className="mt-3 h-2/5 flex flex-col justify-between">
        {/* Series Title */}
        <p className="text-white font-semibold text-[13px] md:text-sm truncate leading-tight">
          {item.seriesTitle}
        </p>

        {/* Progress & Last Watched */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/50 text-[11px] font-medium">
            {item.lastWatched ? formatLastWatched(item.lastWatched) : `${item.episodeNumber}화`}
          </span>
          <span className="text-white/60 text-[11px] font-bold tabular-nums">
            {progressPct}%
          </span>
        </div>

        {/* Remaining Time */}
        <div className="text-white/50 text-[10px] font-medium">
          {formatTime(remainSec)} 남음
        </div>

        {/* ── Resume Button (Always visible) ────────────────────────────── */}
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className={[
            "w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg",
            "text-[11px] font-bold tracking-wide",
            "bg-white text-black",
            "hover:bg-white/95",
            "transition-all duration-200 active:scale-[0.98] shadow-md",
          ].join(" ")}
        >
          <Play size={12} className="fill-black text-black" />
          이어보기
        </button>
      </div>
    </div>
  );
}
