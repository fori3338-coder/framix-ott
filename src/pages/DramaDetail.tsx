import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Play, Plus, Check, Share2, Star, Lock, ChevronLeft, Calendar,
  Film, Clock, Eye, Users, Clapperboard
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { useDramas } from "../hooks/useDramas";
import { useFavorites } from "../hooks/useFavorites";
import DramaCard from "../components/DramaCard";
import DramaRow from "../components/DramaRow";

// ─── Scroll Reveal Hook ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="animate-pulse min-h-screen bg-[#050505]">
      {/* Backdrop skeleton */}
      <div className="w-full h-[56vh] md:h-[72vh] bg-[#181818]" />
      {/* Content skeleton */}
      <div className="px-5 md:px-12 -mt-6 relative z-10 space-y-4">
        <div className="flex gap-4">
          <div className="hidden md:block w-48 h-72 rounded-xl bg-[#232325] shrink-0" />
          <div className="flex-1 space-y-3 pt-4">
            <div className="h-7 bg-[#232325] rounded-lg w-2/3" />
            <div className="h-4 bg-[#181818] rounded w-1/3" />
            <div className="h-4 bg-[#181818] rounded w-full" />
            <div className="h-4 bg-[#181818] rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reveal Section Wrapper ────────────────────────────────────────────────
function RevealSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DramaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { drama, loading, error } = useDramaDetail(id);
  const { dramas: allDramas } = useDramas();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Share handler
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: drama?.title ?? "FRAMIX", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // dismissed
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error || !drama) {
    return (
      <div className="px-4 py-24 text-center">
        <p className="text-white/50">작품을 찾을 수 없습니다.</p>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        <Link to="/" className="text-[#D4AF37] underline mt-3 inline-block">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const similar = allDramas
    .filter((d) => d.id !== drama.id && d.genres.some((g) => drama.genres.includes(g)))
    .slice(0, 12);

  const inList = isFavorite(drama.id);
  const firstEp = drama.episodes[0];

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════
          CINEMATIC BACKDROP
      ═══════════════════════════════════════════════════ */}
      <div className="relative w-full h-[52vh] md:h-[72vh] min-h-[320px] max-h-[760px] overflow-hidden">
        {/* Main backdrop image */}
        <img
          src={drama.backdrop || drama.poster}
          alt={drama.title}
          className="w-full h-full object-cover object-top scale-[1.04]"
          style={{
            animation: "detail-ken-burns 14s ease-out forwards",
          }}
        />

        {/* Multi-layer cinematic scrim */}
        {/* Bottom fade — hardest, bleeds into page */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #050505 0%, rgba(5,5,5,0.92) 12%, rgba(5,5,5,0.55) 32%, rgba(5,5,5,0.15) 58%, transparent 80%)",
          }}
        />
        {/* Left vignette */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(to right, rgba(5,5,5,0.75) 0%, rgba(5,5,5,0.35) 28%, transparent 60%)",
          }}
        />
        {/* Top fade for header readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(5,5,5,0.65) 0%, transparent 22%)",
          }}
        />
        {/* Side vignettes */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 110% 70% at 50% 0%, transparent 30%, rgba(5,5,5,0.5) 100%)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-black/40 backdrop-blur-md border border-white/10 text-white/80
            hover:bg-black/60 hover:text-white transition-all duration-200 safe-top"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={17} />
          <span className="text-xs font-medium hidden sm:inline">뒤로</span>
        </button>

        {/* Exclusive badge — top right */}
        {drama.isExclusive && (
          <div className="absolute top-4 right-4 z-20">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black
                tracking-wider uppercase bg-[#D4AF37] text-black shadow-lg"
            >
              FRAMIX 독점
            </span>
          </div>
        )}

        {/* ── Desktop: Poster + Title inline with backdrop ── */}
        <div className="hidden md:flex absolute bottom-0 left-0 right-0 px-12 pb-10 items-end gap-8 z-10">
          {/* Poster */}
          <div
            className="w-44 shrink-0 aspect-[9/16] rounded-2xl overflow-hidden
              ring-1 ring-white/12 shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
            style={{ transform: "translateY(3rem)" }}
          >
            <img
              src={drama.poster || drama.backdrop}
              alt={drama.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pb-1">
            <h1
              className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-none mb-2"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
            >
              {drama.title}
            </h1>
            {drama.englishTitle && (
              <p className="text-sm text-white/45 mb-3 font-medium tracking-wide">
                {drama.englishTitle}
              </p>
            )}
            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                  bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold"
              >
                <Star size={11} className="fill-[#D4AF37]" />
                {drama.rating.toFixed(1)}
              </span>
              <span className="text-white/40 text-xs">{drama.year}</span>
              <span
                className="px-2 py-0.5 rounded border border-white/20 text-white/55 text-[10px] font-medium"
              >
                {drama.ageRating}
              </span>
              <span className="text-white/40 text-xs">
                {drama.totalEpisodes}부작 · {drama.episodeLength}
              </span>
              {drama.views > 0 && (
                <span className="text-white/35 text-xs flex items-center gap-1">
                  <Eye size={11} />
                  {(drama.views / 10000).toFixed(0)}만 조회
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE HEADER (below backdrop)
      ═══════════════════════════════════════════════════ */}
      <div className="md:hidden px-5 pt-5 pb-1">
        {/* Mobile title */}
        <h1 className="text-2xl font-black text-white tracking-tight leading-tight mb-1">
          {drama.title}
        </h1>
        {drama.englishTitle && (
          <p className="text-xs text-white/40 mb-3 font-medium">{drama.englishTitle}</p>
        )}
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 text-[#D4AF37] text-xs font-bold">
            <Star size={11} className="fill-[#D4AF37]" />
            {drama.rating.toFixed(1)}
          </span>
          <span className="text-white/40 text-xs">{drama.year}</span>
          <span className="px-1.5 py-0.5 rounded border border-white/20 text-white/50 text-[10px]">
            {drama.ageRating}
          </span>
          <span className="text-white/40 text-xs">
            {drama.totalEpisodes}부작
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          DESKTOP: spacer for poster overlap
      ═══════════════════════════════════════════════════ */}
      <div className="hidden md:block h-20" />

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════ */}
      <div className="px-5 md:px-12">

        {/* Desktop: two-column layout */}
        <div className="flex gap-10 xl:gap-14">

          {/* LEFT: desktop poster spacer (already rendered in backdrop layer) */}
          <div className="hidden md:block w-44 shrink-0" />

          {/* RIGHT: main info */}
          <div className="flex-1 min-w-0">

            {/* ── Action Buttons ── */}
            <RevealSection delay={60}>
              <div className="flex items-center gap-3 mt-1 md:mt-0 mb-6 md:mb-7">
                {/* Primary play */}
                <button
                  onClick={() => firstEp && navigate(`/watch/${drama.id}/${firstEp.id}`)}
                  disabled={!firstEp}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                    bg-white text-black font-bold text-sm md:text-base
                    hover:bg-white/90 active:scale-[0.97]
                    transition-all duration-200 shadow-[0_4px_24px_rgba(255,255,255,0.15)]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    flex-1 md:flex-none md:w-44"
                >
                  <Play size={18} className="fill-black shrink-0" />
                  1화 재생
                </button>

                {/* Watchlist */}
                <button
                  onClick={() => toggleFavorite(drama.id)}
                  aria-label={inList ? "보관함에서 제거" : "내 보관함에 추가"}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center
                    border transition-all duration-200 active:scale-95
                    ${inList
                      ? "bg-white/10 border-white/30 text-white"
                      : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:border-white/30 hover:text-white"
                    }`}
                >
                  {inList ? <Check size={19} /> : <Plus size={19} />}
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  aria-label="공유"
                  className="w-12 h-12 rounded-xl flex items-center justify-center
                    bg-white/5 border border-white/15 text-white/60
                    hover:bg-white/10 hover:border-white/30 hover:text-white
                    transition-all duration-200 active:scale-95"
                >
                  <Share2 size={17} />
                </button>
              </div>
            </RevealSection>

            {/* ── Synopsis ── */}
            <RevealSection delay={120}>
              <p className="text-sm md:text-[15px] text-white/65 leading-relaxed md:leading-7 mb-5">
                {drama.synopsis}
              </p>
            </RevealSection>

            {/* ── Metadata Grid ── */}
            <RevealSection delay={180}>
              <div
                className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 p-4 rounded-2xl
                  bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm"
              >
                {drama.genres.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <Film size={14} className="text-white/30 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-0.5">장르</p>
                      <p className="text-xs text-white/80 font-medium">{drama.genres.slice(0, 3).join(", ")}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Calendar size={14} className="text-white/30 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-0.5">제작연도</p>
                    <p className="text-xs text-white/80 font-medium">{drama.year}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clapperboard size={14} className="text-white/30 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-0.5">에피소드</p>
                    <p className="text-xs text-white/80 font-medium">{drama.totalEpisodes}화 · {drama.episodeLength}</p>
                  </div>
                </div>
                {drama.director && (
                  <div className="flex items-start gap-2.5">
                    <Clock size={14} className="text-white/30 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-0.5">감독</p>
                      <p className="text-xs text-white/80 font-medium">{drama.director}</p>
                    </div>
                  </div>
                )}
                {drama.cast.length > 0 && (
                  <div className="flex items-start gap-2.5 col-span-2 md:col-span-2">
                    <Users size={14} className="text-white/30 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-0.5">출연</p>
                      <p className="text-xs text-white/80 font-medium leading-relaxed">
                        {drama.cast.slice(0, 6).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </RevealSection>

            {/* ── Genre / Tag Chips ── */}
            <RevealSection delay={220}>
              <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
                {drama.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-3 py-1.5 rounded-full
                      bg-white/[0.06] text-white/60 border border-white/10
                      hover:bg-white/10 hover:text-white/80 transition-colors"
                  >
                    {g}
                  </span>
                ))}
                {drama.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-3 py-1.5 rounded-full
                      bg-[#D4AF37]/10 text-[#D4AF37]/80 border border-[#D4AF37]/20
                      hover:bg-[#D4AF37]/15 transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </RevealSection>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            EPISODE LIST
        ═══════════════════════════════════════════════════ */}
        <RevealSection delay={80} className="mt-2 mb-12">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-[3px] h-5 rounded-full bg-white/70 shrink-0" />
            <h2 className="text-lg md:text-2xl font-black text-white tracking-tight">
              에피소드
            </h2>
            <span className="text-sm text-white/30 font-medium">
              {drama.episodes.length}화
            </span>
          </div>

          {drama.episodes.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-sm">
              등록된 에피소드가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {drama.episodes.map((ep, idx) => (
                <Link
                  key={ep.id}
                  to={`/watch/${drama.id}/${ep.id}`}
                  className="group flex items-center gap-4 p-3 rounded-2xl
                    border border-white/[0.06] bg-white/[0.03]
                    hover:bg-white/[0.07] hover:border-white/[0.12]
                    active:scale-[0.99]
                    transition-all duration-200"
                  style={{
                    animationDelay: `${idx * 25}ms`,
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-28 md:w-40 aspect-video rounded-xl overflow-hidden shrink-0
                      bg-[#181818] ring-1 ring-white/[0.06]"
                  >
                    <img
                      src={ep.thumbnail || drama.poster}
                      alt={ep.title || `${ep.number}화`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Hover play overlay */}
                    <div
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/40
                        flex items-center justify-center transition-colors duration-200"
                    >
                      <div
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center
                          opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100
                          transition-all duration-200 shadow-lg"
                      >
                        <Play size={14} className="fill-black text-black ml-0.5" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {ep.duration && (
                      <span
                        className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold
                          bg-black/75 text-white/90 px-1.5 py-0.5 rounded-md backdrop-blur-sm"
                      >
                        {ep.duration}
                      </span>
                    )}
                    {/* Lock / VIP badge */}
                    {!ep.isFree && (
                      <span
                        className="absolute top-1.5 left-1.5 flex items-center gap-1
                          bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md"
                      >
                        <Lock size={9} className="text-[#D4AF37]" />
                        <span className="text-[9px] text-[#D4AF37] font-bold">VIP</span>
                      </span>
                    )}
                  </div>

                  {/* Episode number chip */}
                  <div className="hidden sm:flex w-7 h-7 shrink-0 items-center justify-center
                    rounded-lg bg-white/[0.06] text-white/40 text-xs font-bold">
                    {ep.number}
                  </div>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-semibold text-white/90
                      group-hover:text-white transition-colors leading-snug mb-1">
                      {ep.title || `${ep.number}화`}
                      {!ep.isFree && (
                        <span className="ml-2 text-[10px] text-[#D4AF37] font-bold align-middle">VIP</span>
                      )}
                    </p>
                    <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">
                      {drama.title}의 {ep.number}번째 이야기. 예상치 못한 전개가 시작된다.
                    </p>
                    {ep.duration && (
                      <p className="text-[11px] text-white/25 mt-1.5 flex items-center gap-1">
                        <Clock size={10} />
                        {ep.duration}
                      </p>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <ChevronLeft
                    size={16}
                    className="shrink-0 text-white/20 group-hover:text-white/50
                      rotate-180 transition-colors hidden md:block"
                  />
                </Link>
              ))}
            </div>
          )}
        </RevealSection>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent mb-10" />

      </div>

      {/* ═══════════════════════════════════════════════════
          RELATED CONTENT
      ═══════════════════════════════════════════════════ */}
      {similar.length > 0 && (
        <RevealSection delay={0} className="pb-12">
          <DramaRow title="비슷한 작품" dramas={similar} accent />
        </RevealSection>
      )}

      {/* Ken Burns keyframe */}
      <style>{`
        @keyframes detail-ken-burns {
          from { transform: scale(1.04) translate3d(0, 0, 0); }
          to   { transform: scale(1.10) translate3d(-0.8%, -0.5%, 0); }
        }
      `}</style>
    </div>
  );
}
