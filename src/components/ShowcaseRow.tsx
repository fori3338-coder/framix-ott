/**
 * ShowcaseRow — UI 전용 가로 스크롤 섹션
 * DB 연결 없음. Showcase Mock 데이터만 사용.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Drama } from "../types";
import ShowcaseCard from "./ShowcaseCard";

interface ShowcaseRowProps {
  title: string;
  subtitle?: string;
  dramas: Drama[];
  showRank?: boolean;
  accent?: boolean;
  cardSize?: "sm" | "md" | "lg";
  badge?: string; // e.g. "NEW" | "HOT" | "ORIGINAL"
}

export default function ShowcaseRow({
  title,
  subtitle,
  dramas,
  showRank,
  accent,
  cardSize = "md",
  badge,
}: ShowcaseRowProps) {
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
    <section className="relative mb-10 md:mb-16 animate-fade-in">
      {/* 섹션 헤더 */}
      <div className="flex items-end justify-between px-5 md:px-12 mb-4 md:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {accent && (
            <span
              className="hidden md:block h-7 w-[3px] rounded-full shrink-0"
              style={{ background: "linear-gradient(to bottom, #D4AF37, #9c7e23)" }}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] md:text-[22px] font-black text-text tracking-tight truncate">
                {title}
              </h2>
              {badge && (
                <span
                  className={[
                    "text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest",
                    badge === "HOT"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : badge === "NEW"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "bg-gold/15 text-gold border border-gold/25",
                  ].join(" ")}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="hidden md:block text-[11px] text-text-muted mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => scrollBy(scrollRef.current?.clientWidth ?? 600)}
          className="hidden md:flex items-center gap-1 text-[11px] text-text-muted hover:text-gold transition-colors shrink-0 group/btn"
          aria-label="모두 보기"
        >
          <span className="group-hover/btn:underline underline-offset-2">모두 보기</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div className="relative group/row">
        {/* 엣지 페이드 */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-8 md:w-12 bg-gradient-to-r from-[#050505] to-transparent z-[5]" />
        <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-12 md:w-20 bg-gradient-to-l from-[#050505] to-transparent z-[5]" />

        {/* 왼쪽 화살표 */}
        <button
          onClick={() => scrollBy(-(scrollRef.current?.clientWidth ?? 600) * 0.85)}
          disabled={!canPrev}
          className={[
            "hidden md:flex absolute left-2 top-[42%] -translate-y-1/2 z-10",
            "w-11 h-11 rounded-full",
            "bg-black/80 backdrop-blur-sm",
            "border border-white/12",
            "items-center justify-center",
            "opacity-0 group-hover/row:opacity-100",
            "transition-all duration-250",
            "hover:border-gold/60 hover:bg-black/95 hover:scale-110 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]",
            "disabled:opacity-0 disabled:pointer-events-none",
            "active:scale-95 shadow-xl",
          ].join(" ")}
          aria-label="이전"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* 오른쪽 화살표 */}
        <button
          onClick={() => scrollBy((scrollRef.current?.clientWidth ?? 600) * 0.85)}
          disabled={!canNext}
          className={[
            "hidden md:flex absolute right-2 top-[42%] -translate-y-1/2 z-10",
            "w-11 h-11 rounded-full",
            "bg-black/80 backdrop-blur-sm",
            "border border-white/12",
            "items-center justify-center",
            "opacity-0 group-hover/row:opacity-100",
            "transition-all duration-250",
            "hover:border-gold/60 hover:bg-black/95 hover:scale-110 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]",
            "disabled:opacity-0 disabled:pointer-events-none",
            "active:scale-95 shadow-xl",
          ].join(" ")}
          aria-label="다음"
        >
          <ChevronRight size={20} className="text-white" />
        </button>

        {/* 카드 컨테이너 */}
        <div
          ref={scrollRef}
          className={[
            "flex gap-3 md:gap-5",
            "overflow-x-auto scrollbar-hide",
            "px-5 md:px-12",
            "pb-5 md:pb-6",
            "pt-1",
            "snap-x snap-mandatory md:snap-none",
          ].join(" ")}
        >
          {dramas.map((drama, i) => (
            <div
              key={`${drama.id}-${i}`}
              className="snap-start flex-shrink-0"
              style={{
                animation: "fade-in 0.4s ease-out both",
                animationDelay: `${Math.min(i * 40, 320)}ms`,
              }}
            >
              <ShowcaseCard
                drama={drama}
                rank={showRank ? i + 1 : undefined}
                size={cardSize}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
