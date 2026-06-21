/**
 * ShowcaseCard — UI 전용 쇼케이스 카드
 * DB 없이도 완벽 렌더링. DramaCard와 별도로 유지.
 *
 * ✅ 버그 수정 (2025-06-19):
 *  - 포스터 클릭 → /drama/:id 이동 (버그 2, 3, 4)
 *  - hover 재생 버튼 클릭 → /watch/:id/:episodeId 이동 (버그 5)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check, Star } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface ShowcaseCardProps {
  drama: Drama;
  rank?: number;
  size?: "sm" | "md" | "lg";
}

export default function ShowcaseCard({ drama, rank, size = "md" }: ShowcaseCardProps) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);

  const widthClass =
    size === "sm"
      ? "w-[90px] sm:w-[108px] md:w-[130px]"
      : size === "lg"
      ? "w-[140px] sm:w-[168px] md:w-[196px] lg:w-[210px]"
      : "w-[110px] sm:w-[140px] md:w-[164px] lg:w-[180px]";

  // rank가 있을 때 랭크 숫자만큼 왼쪽 공간 확보
  const rankOffset = rank !== undefined ? "ml-4 md:ml-6" : "";

  const firstEpisodeId = drama.episodes[0]?.id;

  const handleCardClick = () => {
    navigate(`/drama/${drama.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstEpisodeId) {
      navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    } else {
      navigate(`/drama/${drama.id}`);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(drama.id);
  };

  return (
    <div
      className={`group relative shrink-0 ${widthClass} ${rankOffset} cursor-pointer`}
      style={{ isolation: "isolate" }}
      onClick={handleCardClick}
    >
      {/* 포스터 래퍼 */}
      <div
        className={[
          "relative aspect-[9/16] rounded-xl overflow-hidden",
          "bg-[#1a1a1c]",
          "ring-1 ring-white/8",
          "transition-all duration-350 ease-out origin-bottom",
          "group-hover:scale-[1.10]",
          "group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_0_1.5px_rgba(212,175,55,0.45)]",
          "group-hover:ring-gold/40",
          "group-active:scale-[0.97]",
        ].join(" ")}
      >
        {/* 포스터 이미지 */}
        {!imgError ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            decoding="async"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1e20] to-[#111113] p-3 text-center">
            <span className="text-gold/60 text-2xl mb-2">🎬</span>
            <span className="text-[10px] text-text-muted leading-snug">{drama.title}</span>
          </div>
        )}

        {/* 상단 배지 */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {drama.isExclusive && (
            <span className="bg-gold text-black text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow">
              독점
            </span>
          )}
          {drama.isNew && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow animate-pulse">
              NEW
            </span>
          )}
          {drama.isOriginal && !drama.isExclusive && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow bg-black/60 text-gold border border-gold/40">
              ORIGINAL
            </span>
          )}
        </div>

        {/* 랭크 번호 */}
        {rank !== undefined && (
          <div className="absolute -left-5 md:-left-7 bottom-0 leading-none pointer-events-none select-none z-10">
            <span
              className="font-black italic"
              style={{
                fontSize: rank <= 9 ? "5rem" : "4rem",
                lineHeight: "0.82",
                color: "transparent",
                WebkitTextStroke: rank === 1 ? "2.5px #D4AF37" : "2px rgba(212,175,55,0.7)",
                textShadow: rank === 1 ? "0 0 20px rgba(212,175,55,0.3)" : "none",
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))",
              }}
            >
              {rank}
            </span>
          </div>
        )}

        {/* Hover 오버레이 */}
        <div
          className={[
            "absolute inset-0",
            "bg-gradient-to-t from-black/70 via-black/10 to-transparent",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-300",
            "flex flex-col items-center justify-end pb-4 gap-2",
          ].join(" ")}
        >
          {/* 재생 버튼 */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={handlePlayClick}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gold transition-colors duration-200 active:scale-90"
              aria-label="재생"
            >
              <Play size={15} className="text-black fill-black ml-0.5" />
            </button>
            <button
              onClick={handleAddClick}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors duration-200 active:scale-90 ${
                favorited
                  ? "bg-gold/15 border-gold text-gold"
                  : "bg-white/15 border-white/30 text-white hover:border-gold hover:text-gold"
              }`}
              aria-label={favorited ? "찜 해제" : "찜하기"}
            >
              {favorited ? <Check size={15} /> : <Plus size={15} />}
            </button>
          </div>
          {/* 별점 */}
          <div className="flex items-center gap-1">
            <Star size={9} className="text-gold fill-gold" />
            <span className="text-[10px] text-white/90 font-semibold">{drama.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* 카드 텍스트 */}
      <div className="mt-2.5 px-0.5">
        <p className="text-[11px] md:text-[13px] font-semibold text-text truncate leading-snug group-hover:text-gold transition-colors duration-200">
          {drama.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <Star size={9} className="text-gold fill-gold shrink-0" />
          <span className="text-[10px] text-text-muted">{drama.rating.toFixed(1)}</span>
          <span className="text-[10px] text-text-muted/60">·</span>
          <span className="text-[10px] text-text-muted">{drama.totalEpisodes}부작</span>
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {drama.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-text-muted border border-white/8 leading-none"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
