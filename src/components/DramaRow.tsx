import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Drama, ContinueWatchingItem } from "../types";
import DramaCard from "./DramaCard";

interface DramaRowProps {
  title: string;
  subtitle?: string;
  dramas: Drama[];
  showRank?: boolean;
  continueWatching?: ContinueWatchingItem[];
  cardSize?: "sm" | "md";
  accent?: boolean;
}

export default function DramaRow({
  title,
  subtitle,
  dramas,
  showRank,
  continueWatching,
  cardSize,
  accent,
}: DramaRowProps) {
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
  }, [dramas.length, updateScroll]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (dramas.length === 0) return null;

  return (
    <section className="relative mb-8 md:mb-14 animate-fade-in">
      {/* 섹션 헤더 */}
      <div className="flex items-end justify-between px-5 md:px-12 mb-3 md:mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {accent && (
            <span className="hidden md:block h-6 w-[3px] rounded-full bg-gradient-to-b from-gold to-gold-dark shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] md:text-2xl font-bold text-text tracking-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="hidden md:block text-xs text-text-muted mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {/* 모두 보기 버튼 */}
        <button
          onClick={() => scrollBy(scrollRef.current?.clientWidth ?? 600)}
          className="hidden md:flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors shrink-0 group/btn"
          aria-label="모두 보기"
        >
          <span className="group-hover/btn:underline underline-offset-2">모두 보기</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div className="relative group/row">
        {/* 좌우 엣지 페이드 — 데스크톱 */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-10 md:w-14 bg-gradient-to-r from-base to-transparent z-[5]" />
        <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-14 md:w-20 bg-gradient-to-l from-base to-transparent z-[5]" />

        {/* 왼쪽 화살표 */}
        <button
          onClick={() => scrollBy(-(scrollRef.current?.clientWidth ?? 600) * 0.85)}
          disabled={!canPrev}
          className={[
            "hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10",
            "w-10 h-10 rounded-full bg-black/75 backdrop-blur-sm border border-white/10",
            "items-center justify-center",
            "opacity-0 group-hover/row:opacity-100",
            "transition-all duration-200",
            "hover:border-gold hover:bg-black/95 hover:scale-110",
            "disabled:opacity-0 disabled:pointer-events-none",
            "active:scale-95 shadow-lg",
          ].join(" ")}
          aria-label="이전"
        >
          <ChevronLeft size={20} className="text-text" />
        </button>

        {/* 오른쪽 화살표 */}
        <button
          onClick={() => scrollBy((scrollRef.current?.clientWidth ?? 600) * 0.85)}
          disabled={!canNext}
          className={[
            "hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10",
            "w-10 h-10 rounded-full bg-black/75 backdrop-blur-sm border border-white/10",
            "items-center justify-center",
            "opacity-0 group-hover/row:opacity-100",
            "transition-all duration-200",
            "hover:border-gold hover:bg-black/95 hover:scale-110",
            "disabled:opacity-0 disabled:pointer-events-none",
            "active:scale-95 shadow-lg",
          ].join(" ")}
          aria-label="다음"
        >
          <ChevronRight size={20} className="text-text" />
        </button>

        {/* 카드 스크롤 컨테이너 */}
        <div
          ref={scrollRef}
          className={[
            "flex gap-2.5 md:gap-4",
            "overflow-x-auto scrollbar-hide",
            "px-5 md:px-12",
            "pb-3 md:pb-4",       // hover 확대 시 하단 잘림 방지
            "pt-1",               // hover 확대 시 상단 잘림 방지
            "snap-x snap-mandatory md:snap-none",
            "scroll-smooth",
          ].join(" ")}
        >
          {dramas.map((drama, i) => {
            const cw = continueWatching?.find((c) => c.dramaId === drama.id);
            return (
              <div
                key={drama.id}
                className="snap-start"
                style={{
                  animation: "fade-in 0.45s ease-out both",
                  animationDelay: `${Math.min(i * 35, 280)}ms`,
                }}
              >
                <DramaCard
                  drama={drama}
                  rank={showRank ? i + 1 : undefined}
                  progress={cw?.progress}
                  size={cardSize}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
