/**
 * ContinueWatchingRow — Netflix 스타일 이어보기 섹션
 * 카드마다: 썸네일, 진행바, 진행률 %, 에피소드 정보, 이어보기 버튼
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContinueWatchingItem } from "../types";
import { supabase } from "../lib/supabase";

// "초" → "mm:ss" 또는 "h:mm:ss"
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onRemove?: (episodeId: string) => void;
}

export default function ContinueWatchingRow({ items, onRemove }: ContinueWatchingRowProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

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
    // DB에서 해당 항목 삭제
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
    <section className="relative mb-10 md:mb-14 animate-fade-in">
      {/* 섹션 헤더 */}
      <div className="flex items-end justify-between px-5 md:px-12 mb-4">
        <div className="flex items-center gap-3">
          <span
            className="hidden md:block h-7 w-[3px] rounded-full shrink-0"
            style={{ background: "linear-gradient(to bottom, #FFD54A, #b8961e)" }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] md:text-[22px] font-black text-white tracking-tight">
                ▶ 이어보기
              </h2>
              <span
                className="text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest"
                style={{
                  background: "rgba(255,213,74,0.15)",
                  color: "#FFD54A",
                  border: "1px solid rgba(255,213,74,0.35)",
                }}
              >
                계속 시청하기
              </span>
            </div>
            <p className="text-[11px] md:text-xs text-white/50 mt-0.5">
              중단한 지점부터 다시 시작하세요
            </p>
          </div>
        </div>

        {/* PC 스크롤 버튼 */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scrollBy(-700)}
            disabled={!canPrev}
            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:border-yellow-400/60 hover:text-yellow-400 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(700)}
            disabled={!canNext}
            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:border-yellow-400/60 hover:text-yellow-400 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 카드 목록 */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((item, idx) => (
          <ContinueWatchingCard
            key={item.episodeId}
            item={item}
            idx={idx}
            onPlay={() => navigate(`/watch/${item.dramaId}/${item.episodeId}`)}
            onRemove={(e) => handleRemove(e, item)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── 개별 카드 ────────────────────────────────────────────────────────────────
function ContinueWatchingCard({
  item,
  idx,
  onPlay,
  onRemove,
}: {
  item: ContinueWatchingItem;
  idx: number;
  onPlay: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const remainSec = Math.max(0, item.durationSeconds - item.progressSeconds);

  return (
    <div
      className="relative shrink-0 cursor-pointer group animate-fade-in"
      style={{
        width: "clamp(200px, 28vw, 280px)",
        scrollSnapAlign: "start",
        animationDelay: `${idx * 40}ms`,
        animationFillMode: "backwards",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      {/* 썸네일 영역 (16:9) */}
      <div
        className="relative w-full rounded-xl overflow-hidden bg-zinc-900"
        style={{ aspectRatio: "16/9" }}
      >
        <img
          src={item.thumbnail}
          alt={item.seriesTitle}
          className={`w-full h-full object-cover transition-transform duration-300 ${hovered ? "scale-105" : "scale-100"}`}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith("/content/fallback-poster.svg"))
              img.src = "/content/fallback-poster.svg";
          }}
        />

        {/* 다크 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* 재생 버튼 오버레이 (hover 시) */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: "#FFD54A" }}
          >
            <Play size={20} className="text-black fill-black ml-1" />
          </div>
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={onRemove}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black transition-all z-10 ${hovered ? "opacity-100" : "opacity-0"}`}
          aria-label="이어보기 목록에서 삭제"
        >
          <X size={13} />
        </button>

        {/* 남은 시간 */}
        <div className="absolute bottom-2 right-2 text-[10px] font-semibold text-white/80 bg-black/60 rounded px-1.5 py-0.5 tabular-nums">
          {formatTime(remainSec)} 남음
        </div>

        {/* 진행 바 */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${item.progress}%`, background: "#FFD54A" }}
          />
        </div>
      </div>

      {/* 텍스트 정보 */}
      <div className="mt-2 px-0.5">
        <p className="text-white font-semibold text-sm truncate leading-tight">
          {item.seriesTitle}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/50 text-xs">
            {item.episodeNumber}화
            {item.episodeTitle ? ` · ${item.episodeTitle}` : ""}
          </span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: "#FFD54A" }}
          >
            {item.progress}%
          </span>
        </div>

        {/* 진행 텍스트 바 */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.progress}%`, background: "#FFD54A" }}
            />
          </div>
        </div>

        {/* 이어보기 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: hovered ? "#FFD54A" : "rgba(255,213,74,0.12)",
            color: hovered ? "#000" : "#FFD54A",
            border: "1px solid rgba(255,213,74,0.3)",
          }}
        >
          <Play size={11} className={hovered ? "fill-black text-black" : "fill-yellow-400 text-yellow-400"} />
          이어보기
        </button>
      </div>
    </div>
  );
}
