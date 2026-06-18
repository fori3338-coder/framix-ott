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
      ? "w-[90px] sm:w-[108px] md:w-[130px]"
      : "w-[110px] sm:w-[140px] md:w-[164px] lg:w-[180px]";

  return (
    <Link
      to={`/drama/${drama.id}`}
      className={`group relative shrink-0 ${widthClass}`}
      style={{ isolation: "isolate" }}
    >
      {/* 포스터 이미지 컨테이너 — hover 시 scale-up (Netflix 스타일) */}
      <div
        className={[
          "relative aspect-[2/3] rounded-lg overflow-hidden",
          "bg-surface-2 ring-1 ring-border",
          "transition-transform duration-300 ease-out origin-center",
          "group-hover:scale-[1.08] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.8)]",
          "group-active:scale-[0.97]",
          "gpu",
        ].join(" ")}
      >
        <img
          src={drama.poster}
          alt={drama.title}
          decoding="async"
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* 상단 배지 */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
          {drama.isExclusive && (
            <span className="bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              독점
            </span>
          )}
          {drama.isNew && (
            <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              NEW
            </span>
          )}
        </div>

        {/* 랭크 번호 (TOP10) */}
        {rank !== undefined && (
          <div className="absolute -left-1 bottom-0 leading-none pointer-events-none">
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

        {/* Hover 재생 오버레이 */}
        <div
          className={[
            "absolute inset-0 bg-black/0 group-hover:bg-black/35",
            "transition-colors duration-300",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100",
          ].join(" ")}
        >
          <div className="w-10 h-10 rounded-full bg-gold/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
            <Play size={17} className="text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* 진행률 바 */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* 카드 정보 */}
      <div className="mt-2 px-0.5">
        <p className="text-xs md:text-sm font-medium text-text truncate leading-snug">
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star size={10} className="text-gold fill-gold shrink-0" />
          <span className="text-[10px] text-text-muted">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-text-muted">· {drama.totalEpisodes}부작</span>
        </div>
      </div>
    </Link>
  );
}
