import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Drama, ContinueWatchingItem } from "../types";
import DramaCard from "../components/DramaCard";

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

  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

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
  }, [dramas.length]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (dramas.length === 0) return null;

  return (
    <section className="relative mb-7 md:mb-12 animate-fade-in">
      <div className="flex items-end justify-between px-5 md:px-12 mb-3 md:mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {accent && (
            <span className="hidden md:block h-6 w-[3px] rounded-full bg-gradient-gold shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-base md:text-2xl font-bold text-text tracking-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="hidden md:block text-xs text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => scrollBy(scrollRef.current?.clientWidth ?? 600)}
          className="hidden md:flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors shrink-0"
        >
          모두 보기 <ChevronRight size={14} />
        </button>
      </div>

      <div className="relative group">
        {/* Edge fades */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-base to-transparent z-[5]" />
        <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-base to-transparent z-[5]" />

        <button
          onClick={() => scrollBy(-(scrollRef.current?.clientWidth ?? 600) * 0.9)}
          disabled={!canPrev}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/70 backdrop-blur border border-white/10 items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:border-gold hover:bg-black/90 disabled:opacity-0 active:scale-95"
          aria-label="이전"
        >
          <ChevronLeft size={22} className="text-text" />
        </button>
        <button
          onClick={() => scrollBy((scrollRef.current?.clientWidth ?? 600) * 0.9)}
          disabled={!canNext}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/70 backdrop-blur border border-white/10 items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:border-gold hover:bg-black/90 disabled:opacity-0 active:scale-95"
          aria-label="다음"
        >
          <ChevronRight size={22} className="text-text" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-2 snap-x snap-mandatory scroll-smooth"
        >
          {dramas.map((drama, i) => {
            const cw = continueWatching?.find((c) => c.dramaId === drama.id);
            return (
              <div
                key={drama.id}
                className="snap-start"
                style={{
                  animation: "fade-in 0.5s ease-out both",
                  animationDelay: `${Math.min(i * 40, 320)}ms`,
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
