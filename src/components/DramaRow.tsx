import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Drama, ContinueWatchingItem } from "../types";
import DramaCard from "./DramaCard";

interface DramaRowProps {
  title: string;
  dramas: Drama[];
  showRank?: boolean;
  continueWatching?: ContinueWatchingItem[];
  cardSize?: "sm" | "md";
}

export default function DramaRow({ title, dramas, showRank, continueWatching, cardSize }: DramaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (dramas.length === 0) return null;

  return (
    <section className="relative mb-6 md:mb-10">
      <div className="flex items-center justify-between px-4 md:px-8 mb-2 md:mb-3">
        <h2 className="text-base md:text-xl font-bold text-text">{title}</h2>
      </div>

      <div className="relative group">
        <button
          onClick={() => scrollBy(-600)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 border border-border items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-gold"
          aria-label="이전"
        >
          <ChevronLeft size={20} className="text-text" />
        </button>
        <button
          onClick={() => scrollBy(600)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 border border-border items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-gold"
          aria-label="다음"
        >
          <ChevronRight size={20} className="text-text" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-1 snap-x snap-mandatory"
        >
          {dramas.map((drama, i) => {
            const cw = continueWatching?.find((c) => c.dramaId === drama.id);
            return (
              <div key={drama.id} className="snap-start">
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
