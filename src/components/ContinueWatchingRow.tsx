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

  return (
    <div
      className="relative shrink-0 cursor-pointer group"
      style={{
        // 30% larger than before (was clamp(200px,28vw,280px))
        width: "clamp(260px, 36vw, 360px)",
        scrollSnapAlign: "start",
        opacity: 0,
        animation: revealed
          ? `fade-in-up 0.55s cubic-bezier(0.22,1,0.36,1) ${Math.min(idx * 60, 360)}ms both`
          : "none",
      }}
      onClick={onPlay}
    >
      {/* Thumbnail 16:9 */}
      <div
        className={[
          "relative w-full rounded-xl overflow-hidden bg-zinc-900",
          "transition-[transform,box-shadow] duration-[350ms]",
          "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.03]",
          "md:group-hover:shadow-[0_20px_52px_rgba(0,0,0,0.55)]",
          "will-change-[transform]",
        ].join(" ")}
        style={{ aspectRatio: "16/9" }}
      >
        <img
          src={item.thumbnail}
          alt={item.seriesTitle}
          className={[
            "w-full h-full object-cover",
            "transition-transform duration-[350ms]",
            "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "md:group-hover:scale-[1.06]",
            "will-change-transform",
          ].join(" ")}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith("/content/fallback-poster.svg"))
              img.src = "/content/fallback-poster.svg";
          }}
        />

        {/* Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        {/* Play Button Overlay */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center",
            "opacity-0 md:group-hover:opacity-100",
            "transition-opacity duration-300",
          ].join(" ")}
        >
          <div
            className={[
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl",
              "translate-y-2 md:group-hover:translate-y-0",
              "transition-transform duration-[280ms]",
              "bg-white/90 backdrop-blur-sm",
            ].join(" ")}
            style={{ transitionDelay: "50ms" }}
          >
            <Play size={22} className="text-black fill-black ml-1" />
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className={[
            "absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 border border-white/18",
            "flex items-center justify-center text-white/65 hover:text-white hover:bg-black",
            "transition-all z-10",
            "opacity-0 md:group-hover:opacity-100",
          ].join(" ")}
          aria-label="이어보기 목록에서 삭제"
        >
          <X size={13} />
        </button>

        {/* Remaining Time badge */}
        <div className="absolute bottom-3 right-3 text-[10px] font-semibold text-white/80 bg-black/65 rounded px-1.5 py-0.5 tabular-nums">
          {formatTime(remainSec)} 남음
        </div>

        {/* Progress Bar — bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15">
          <div
            className="h-full rounded-full"
            style={{ width: `${item.progress}%`, background: "rgba(255,255,255,0.9)" }}
          />
        </div>
      </div>

      {/* Text Info */}
      <div className="mt-3 px-0.5">
        <p className="text-white font-semibold text-[13px] md:text-sm truncate leading-tight">
          {item.seriesTitle}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/42 text-[11px]">
            {item.episodeNumber}화{item.episodeTitle ? ` · ${item.episodeTitle}` : ""}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-white/60">
            {item.progress}%
          </span>
        </div>
        {item.lastWatched && (
          <p className="text-[10px] text-white/30 mt-0.5">{formatLastWatched(item.lastWatched)}</p>
        )}

        {/* Progress Bar */}
        <div className="mt-2 h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${item.progress}%`, background: "rgba(255,255,255,0.75)" }}
          />
        </div>

        {/* Resume Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className={[
            "mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg",
            "text-[11px] font-bold tracking-wide",
            "bg-white/8 text-white/75 border border-white/12",
            "hover:bg-white/15 hover:text-white hover:border-white/25",
            "transition-all duration-200",
            "active:scale-[0.98]",
          ].join(" ")}
        >
          <Play size={11} className="fill-current" />
          이어보기
        </button>
      </div>
    </div>
  );
}
