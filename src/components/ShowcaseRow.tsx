/**
 * ShowcaseRow — Premium OTT Section Row
 * Netflix / Apple TV+ / Disney+ level
 * - Scroll Reveal (IntersectionObserver)
 * - Premium Typography
 * - Top10 Netflix-style rank overlay
 * - Dark theme optimized spacing
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
  badge?: string;
}

export default function ShowcaseRow({
  title,
  subtitle,
  dramas,
  showRank,
  cardSize = "md",
  badge,
}: ShowcaseRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [revealed, setRevealed] = useState(false);

  // ── Scroll Reveal via IntersectionObserver ──────────────────────────────
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
      { threshold: 0.08 }
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
  }, [dramas.length, updateScroll]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (dramas.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={[
        "relative home-section section-reveal",
        revealed ? "is-visible" : "",
      ].join(" ")}
    >
      {/* ── Section Header ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between px-5 md:px-12 mb-5 md:mb-7">
        <div className="flex items-center gap-3 min-w-0">
          {/* Accent bar */}
          <div className="section-accent-bar" />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="section-title-premium truncate">{title}</h2>
              {badge && (
                <span
                  className={[
                    "text-[9px] md:text-[10px] font-black px-2 py-[3px] rounded-full tracking-widest border",
                    badge === "HOT"
                      ? "bg-red-500/15 text-red-400 border-red-500/25"
                      : badge === "NEW"
                      ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/22"
                      : badge === "ORIGINAL"
                      ? "bg-white/8 text-white/70 border-white/15"
                      : "bg-white/8 text-white/60 border-white/12",
                  ].join(" ")}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="section-subtitle-premium hidden md:block">{subtitle}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => scrollBy(scrollRef.current?.clientWidth ?? 600)}
          className="hidden md:flex items-center gap-1 text-[11px] text-white/38 hover:text-white/70 transition-colors duration-200 shrink-0 group/btn"
          aria-label="모두 보기"
        >
          <span className="group-hover/btn:underline underline-offset-2 tracking-wide">
            모두 보기
          </span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* ── Scroll Area ────────────────────────────────────────────────── */}
      <div className="relative group/row">
        {/* Edge fades */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-6 md:w-12 bg-gradient-to-r from-[#050505] to-transparent z-[5]" />
        <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-10 md:w-20 bg-gradient-to-l from-[#050505] to-transparent z-[5]" />

        {/* Prev arrow */}
        <button
          onClick={() => scrollBy(-(scrollRef.current?.clientWidth ?? 600) * 0.85)}
          disabled={!canPrev}
          className={[
            "hidden md:flex absolute left-2 top-[40%] -translate-y-1/2 z-10",
            "w-10 h-10 rounded-full",
            "bg-black/85 backdrop-blur-sm",
            "border border-white/10",
            "items-center justify-center",
            "opacity-0 group-hover/row:opacity-100",
            "transition-all duration-200",
            "hover:border-white/30 hover:bg-black/95 hover:scale-110",
            "disabled:opacity-0 disabled:pointer-events-none",
            "active:scale-95 shadow-xl",
          ].join(" ")}
          aria-label="이전"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>

        {/* Next arrow */}
        <button
          onClick={() => scrollBy((scrollRef.current?.clientWidth ?? 600) * 0.85)}
          disabled={!canNext}
          className={[
            "hidden md:flex absolute right-2 top-[40%] -translate-y-1/2 z-10",
            "w-10 h-10 rounded-full",
            "bg-black/85 backdrop-blur-sm",
            "border border-white/10",
            "items-center justify-center",
            "opacity-0 group-hover/row:opacity-100",
            "transition-all duration-200",
            "hover:border-white/30 hover:bg-black/95 hover:scale-110",
            "disabled:opacity-0 disabled:pointer-events-none",
            "active:scale-95 shadow-xl",
          ].join(" ")}
          aria-label="다음"
        >
          <ChevronRight size={18} className="text-white" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className={[
            "flex gap-3 md:gap-5",
            "overflow-x-auto scrollbar-hide",
            "px-5 md:px-12",
            "pb-6 md:pb-8",
            "pt-1",
            "snap-x snap-mandatory md:snap-none",
          ].join(" ")}
        >
          {dramas.map((drama, i) => (
            <div
              key={`${drama.id}-${i}`}
              className="snap-start flex-shrink-0"
              style={{
                opacity: 0,
                animation: revealed
                  ? `fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) ${Math.min(i * 50, 400)}ms both`
                  : "none",
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
