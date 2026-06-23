/**
 * DramaCard — Premium OTT Card (Netflix / Apple TV+ Level)
 * Used in: DramaDetail related dramas row
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";
import type { Drama } from "../types";

interface DramaCardProps {
  drama: Drama;
  rank?: number;
  progress?: number;
  size?: "sm" | "md";
}

export default function DramaCard({
  drama,
  rank,
  progress,
  size = "md",
}: DramaCardProps) {
  const [imgError, setImgError] = useState(false);

  const widthClass =
    size === "sm"
      ? "w-[90px] sm:w-[108px] md:w-[130px]"
      : "w-[110px] sm:w-[140px] md:w-[164px] lg:w-[180px]";

  return (
    <Link
      to={`/drama/${drama.id}`}
      className={`group relative shrink-0 ${widthClass}`}
      style={{ isolation: "isolate" }}
    >
      {/* Poster Wrapper */}
      <div
        className={[
          "relative aspect-[9/16] rounded-xl overflow-hidden",
          "bg-[#1a1a1c] ring-1 ring-white/8",
          "transition-[transform,box-shadow] duration-[350ms]",
          "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          "md:group-hover:scale-[1.06]",
          "md:group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
          "group-active:scale-[0.97]",
          "will-change-[transform,opacity]",
        ].join(" ")}
      >
        {!imgError ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className={[
              "w-full h-full object-cover",
              "transition-transform duration-[350ms]",
              "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
              "md:group-hover:scale-[1.12]",
              "will-change-transform",
            ].join(" ")}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111113] p-3 text-center">
            <span className="text-white/40 text-2xl mb-2">🎬</span>
            <span className="text-[10px] text-white/50 leading-snug">{drama.title}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start z-10">
          {drama.isExclusive && (
            <span className="bg-[#ff3e6c] text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              독점
            </span>
          )}
          {drama.isNew && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              NEW
            </span>
          )}
        </div>

        {/* Rank Number */}
        {rank !== undefined && (
          <div className="absolute -left-1 bottom-0 leading-none pointer-events-none select-none">
            <span
              className="font-black italic"
              style={{
                fontSize: "4.2rem",
                color: "transparent",
                WebkitTextStroke: "2px #ff3e6c",
                lineHeight: "0.8",
              }}
            >
              {rank}
            </span>
          </div>
        )}

        {/* Hover: Dark Gradient Overlay */}
        <div
          className={[
            "absolute inset-0",
            "bg-gradient-to-t from-black/75 via-black/20 to-transparent",
            "opacity-0 md:group-hover:opacity-100",
            "transition-opacity duration-[350ms]",
            "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            "flex items-center justify-center",
          ].join(" ")}
        >
          <div
            className={[
              "w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg",
              "opacity-0 md:group-hover:opacity-100",
              "translate-y-2 md:group-hover:translate-y-0",
              "transition-[opacity,transform] duration-[250ms]",
              "will-change-[opacity,transform]",
            ].join(" ")}
            style={{ transitionDelay: "60ms" }}
          >
            <Play size={17} className="text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* Progress Bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-[#ff3e6c]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Text */}
      <div className="mt-2 px-0.5">
        <p className="text-[11px] md:text-[13px] font-semibold text-white/90 truncate leading-snug transition-colors duration-200 md:group-hover:text-white">
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star size={10} className="text-[#ff3e6c] fill-[#ff3e6c] shrink-0" />
          <span className="text-[10px] text-white/50">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/30">· {drama.totalEpisodes}부작</span>
        </div>
      </div>
    </Link>
  );
}
