import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";
import type { Drama } from "../types";

interface DramaCardProps {
  drama: Drama;
  rank?: number;
  progress?: number;
  size?: "sm" | "md";
}

export default function DramaCard({ drama, rank, progress, size = "md" }: DramaCardProps) {
  const widthClass =
    size === "sm"
      ? "w-[100px] sm:w-[120px] md:w-[140px]"
      : "w-[120px] sm:w-[150px] md:w-[170px] lg:w-[185px]";

  return (
    <Link
      to={`/drama/${drama.id}`}
      className={`group relative shrink-0 ${widthClass} animate-fade-in`}
    >
      <div className="relative aspect-2/3 rounded-lg overflow-hidden bg-surface-2 ring-1 ring-border group-active:scale-95 transition-transform duration-150 gpu">
        <img
          src={drama.poster}
          alt={drama.title}
          decoding="async"
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Top badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
          {drama.isExclusive && (
            <span className="bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded">독점</span>
          )}
          {drama.isNew && (
            <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
          )}
        </div>

        {/* Rank number */}
        {rank !== undefined && (
          <div className="absolute -left-1 bottom-0 leading-none">
            <span
              className="font-black italic text-transparent"
              style={{
                fontSize: "4.2rem",
                WebkitTextStroke: "2px #D4AF37",
                lineHeight: "0.8",
              }}
            >
              {rank}
            </span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-9 h-9 rounded-full bg-gold/90 flex items-center justify-center">
            <Play size={16} className="text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* Progress bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="mt-1.5 px-0.5">
        <p className="text-xs md:text-sm font-medium text-text truncate">{drama.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star size={10} className="text-gold fill-gold" />
          <span className="text-[10px] text-text-muted">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-text-muted">· {drama.totalEpisodes}부작</span>
        </div>
      </div>
    </Link>
  );
}
