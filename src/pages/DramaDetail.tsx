import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Play, Plus, Check, Share2, Star, Lock, ChevronLeft, Calendar,
  Film, Clock, Eye, Users, Clapperboard, ChevronRight, TvMinimalPlay,
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { useDramas } from "../hooks/useDramas";
import { useFavorites } from "../hooks/useFavorites";
import { useContinueWatching } from "../hooks/useContinueWatching";
import DramaRow from "../components/DramaRow";

// ─── Scroll Reveal Hook ────────────────────────────────────────────────────
function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── RevealSection ─────────────────────────────────────────────────────────
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
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="animate-pulse min-h-screen bg-[#07080b]">
      <div className="w-full h-[60vh] md:h-[75vh] bg-[#141416]" />
      <div className="px-5 md:px-12 mt-6 relative z-10 space-y-4">
        <div className="flex gap-6">
          <div className="hidden md:block w-48 h-72 rounded-2xl bg-[#1e1e20] shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-8 bg-[#1e1e20] rounded-xl w-3/5" />
            <div className="h-4 bg-[#141416] rounded w-2/5" />
            <div className="h-4 bg-[#141416] rounded w-full mt-4" />
            <div className="h-4 bg-[#141416] rounded w-5/6" />
            <div className="h-4 bg-[#141416] rounded w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar (episode) ────────────────────────────────────────────────
function EpisodeProgress({ progress }: { progress: number }) {
  if (!progress || progress <= 0) return null;
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 rounded-b-xl overflow-hidden">
      <div
        className="h-full bg-[#ff3e6c] rounded-full"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
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
  const { items: cwItems } = useContinueWatching();

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: drama?.title ?? "FRAMIX", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch { /* dismissed */ }
  };

  if (loading) return <DetailSkeleton />;
  if (error || !drama) {
    return (
      <div className="px-4 py-24 text-center min-h-screen bg-[#07080b] flex flex-col items-center justify-center">
        <p className="text-white/50 text-lg">작품을 찾을 수 없습니다.</p>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <Link to="/" className="text-[#ff3e6c] underline mt-4 inline-block font-medium">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  // Similar / More Like This
  const similar = allDramas
    .filter((d) => d.id !== drama.id && d.genres.some((g) => drama.genres.includes(g)))
    .slice(0, 12);

  const moreLikeThis = allDramas
    .filter((d) => d.id !== drama.id && !similar.find((s) => s.id === d.id))
    .slice(0, 12);

  const inList = isFavorite(drama.id);
  const firstEp = drama.episodes[0];

  // Continue watching for this drama
  const cwForDrama = cwItems.find((c) => c.dramaId === drama.id);
  const resumeEpId = cwForDrama?.episodeId ?? firstEp?.id;
  const resumeLabel = cwForDrama
    ? `${cwForDrama.episodeNumber}화 이어보기`
    : "1화 재생";

  return (
    <div className="min-h-screen bg-[#07080b] overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════
          CINEMATIC BACKDROP
      ═══════════════════════════════════════════════════ */}
      <div className="relative w-full h-[58vh] md:h-[76vh] min-h-[340px] max-h-[820px] overflow-hidden">
        {/* Main backdrop */}
        <img
          src={drama.backdrop || drama.poster}
          alt={drama.title}
          className="w-full h-full object-cover object-top"
          style={{ animation: "detail-ken-burns 16s ease-out forwards", willChange: "transform" }}
        />

        {/* Multi-layer cinematic gradients */}
        {/* Bottom — deep bleed */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(to top, #07080b 0%, rgba(5,5,5,0.95) 10%, rgba(5,5,5,0.7) 28%, rgba(5,5,5,0.2) 55%, transparent 78%)"
        }} />
        {/* Left vignette — desktop */}
        <div className="absolute inset-0 pointer-events-none hidden md:block" style={{
          background: "linear-gradient(to right, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.4) 30%, transparent 62%)"
        }} />
        {/* Top — header readability */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(to bottom, rgba(5,5,5,0.7) 0%, transparent 24%)"
        }} />
        {/* Radial vignette sides */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 120% 65% at 50% 0%, transparent 25%, rgba(5,5,5,0.55) 100%)"
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full
            bg-black/45 backdrop-blur-md border border-white/12 text-white/80
            hover:bg-black/65 hover:text-white hover:border-white/25
            transition-all duration-200 safe-top"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={17} />
          <span className="text-xs font-semibold hidden sm:inline tracking-wide">뒤로</span>
        </button>

        {/* Exclusive badge */}
        {drama.isExclusive && (
          <div className="absolute top-4 right-4 z-20">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black
              tracking-widest uppercase bg-[#ff3e6c] text-black shadow-[0_4px_16px_rgba(212,175,55,0.4)]">
              FRAMIX 독점
            </span>
          </div>
        )}

        {/* ── Desktop: Poster + Title block inside backdrop ── */}
        <div className="hidden md:flex absolute bottom-0 left-0 right-0 px-12 pb-10 items-end gap-8 z-10">
          {/* Poster */}
          <div
            className="w-44 xl:w-52 shrink-0 aspect-[9/16] rounded-2xl overflow-hidden
              ring-1 ring-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
            style={{ transform: "translateY(3.5rem)" }}
          >
            <img
              src={drama.poster || drama.backdrop}
              alt={drama.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pb-2">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-2.5">
              {drama.isNew && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500 text-white tracking-wider uppercase">NEW</span>
              )}
              {drama.isOriginal && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/70 tracking-wider uppercase">ORIGINAL</span>
              )}
            </div>
            <h1
              className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white tracking-tight leading-[1.05] mb-2"
              style={{ textShadow: "0 4px 32px rgba(0,0,0,0.85)" }}
            >
              {drama.title}
            </h1>
            {drama.englishTitle && (
              <p className="text-sm text-white/40 mb-3.5 font-medium tracking-widest uppercase">
                {drama.englishTitle}
              </p>
            )}
            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                bg-[#ff3e6c]/12 border border-[#ff3e6c]/25 text-[#ff3e6c] text-xs font-bold">
                <Star size={11} className="fill-[#ff3e6c]" />
                {drama.rating.toFixed(1)}
              </span>
              <span className="text-white/40 text-xs font-medium">{drama.year}</span>
              <span className="px-2 py-0.5 rounded border border-white/18 text-white/50 text-[10px] font-semibold">
                {drama.ageRating}
              </span>
              <span className="text-white/40 text-xs">
                {drama.totalEpisodes}부작 · {drama.episodeLength}
              </span>
              {drama.views > 0 && (
                <span className="text-white/30 text-xs flex items-center gap-1">
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
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2">
          {drama.isNew && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500 text-white tracking-wider uppercase">NEW</span>
          )}
          {drama.isOriginal && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/60 tracking-wider uppercase">ORIGINAL</span>
          )}
        </div>
        <h1 className="text-[26px] font-black text-white tracking-tight leading-tight mb-1">
          {drama.title}
        </h1>
        {drama.englishTitle && (
          <p className="text-[11px] text-white/35 mb-3 font-medium tracking-widest uppercase">{drama.englishTitle}</p>
        )}
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 text-[#ff3e6c] text-xs font-bold">
            <Star size={11} className="fill-[#ff3e6c]" />
            {drama.rating.toFixed(1)}
          </span>
          <span className="text-white/40 text-xs">{drama.year}</span>
          <span className="px-1.5 py-0.5 rounded border border-white/18 text-white/45 text-[10px] font-medium">
            {drama.ageRating}
          </span>
          <span className="text-white/40 text-xs">{drama.totalEpisodes}부작</span>
          <span className="text-white/30 text-xs">· {drama.episodeLength}</span>
        </div>
      </div>

      {/* Desktop: spacer for poster overlap */}
      <div className="hidden md:block h-20" />

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════ */}
      <div className="px-5 md:px-12">
        <div className="flex gap-10 xl:gap-16">

          {/* LEFT: poster spacer (poster rendered in backdrop) */}
          <div className="hidden md:block w-44 xl:w-52 shrink-0" />

          {/* RIGHT: main info column */}
          <div className="flex-1 min-w-0">

            {/* ── Continue Watching Banner ── */}
            {cwForDrama && (
              <RevealSection delay={0}>
                <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl
                  bg-[#ff3e6c]/8 border border-[#ff3e6c]/18 backdrop-blur-sm">
                  <TvMinimalPlay size={16} className="text-[#ff3e6c] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#ff3e6c] font-semibold mb-1">
                      {cwForDrama.episodeNumber}화 · {cwForDrama.episodeTitle || `${cwForDrama.episodeNumber}화`}
                    </p>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ff3e6c] rounded-full transition-all"
                        style={{ width: `${cwForDrama.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-[#ff3e6c]/60 shrink-0">{cwForDrama.progress}%</span>
                </div>
              </RevealSection>
            )}

            {/* ── Premium CTA Buttons ── */}
            <RevealSection delay={60}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1 md:mt-0 mb-6 md:mb-7">
                {/* Primary play button */}
                <button
                  onClick={() => resumeEpId && navigate(`/watch/${drama.id}/${resumeEpId}`)}
                  disabled={!resumeEpId}
                  className="flex items-center justify-center gap-2.5 px-7 py-4 sm:py-3.5 rounded-2xl
                    bg-white text-black font-black text-sm md:text-[15px] tracking-wide
                    hover:bg-white/92 active:scale-[0.97]
                    transition-all duration-200 shadow-[0_6px_28px_rgba(255,255,255,0.16)]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    min-h-[52px] sm:min-h-0 sm:flex-none sm:min-w-[11rem]"
                >
                  <Play size={18} className="fill-black shrink-0" />
                  {resumeLabel}
                </button>

                {/* Secondary buttons row */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Watchlist */}
                  <button
                    onClick={() => toggleFavorite(drama.id)}
                    aria-label={inList ? "보관함에서 제거" : "내 보관함에 추가"}
                    className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2
                      min-h-[52px] sm:w-14 sm:h-14 rounded-2xl
                      border transition-all duration-200 active:scale-95 px-4 sm:px-0
                      ${inList
                        ? "bg-white/12 border-white/28 text-white"
                        : "bg-white/5 border-white/12 text-white/55 hover:bg-white/10 hover:border-white/25 hover:text-white"
                      }`}
                  >
                    {inList ? <Check size={19} /> : <Plus size={19} />}
                    <span className="text-[11px] font-semibold sm:hidden text-white/70">
                      {inList ? "저장됨" : "내 목록"}
                    </span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    aria-label="공유"
                    className="flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-0
                      min-h-[52px] sm:w-14 sm:h-14 rounded-2xl px-4 sm:px-0
                      bg-white/5 border border-white/12 text-white/55
                      hover:bg-white/10 hover:border-white/25 hover:text-white
                      transition-all duration-200 active:scale-95"
                  >
                    <Share2 size={17} />
                    <span className="text-[11px] font-semibold sm:hidden text-white/70 ml-0">공유</span>
                  </button>
                </div>
              </div>
            </RevealSection>

            {/* ── Synopsis ── */}
            <RevealSection delay={120}>
              <p className="text-sm md:text-[15px] text-white/65 leading-[1.85] md:leading-[1.9] mb-6">
                {drama.synopsis}
              </p>
            </RevealSection>

            {/* ── Premium Metadata Grid ── */}
            <RevealSection delay={170}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 p-5 rounded-2xl
                bg-white/[0.034] border border-white/[0.065] backdrop-blur-sm">

                {/* Rating */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#ff3e6c]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Star size={13} className="text-[#ff3e6c] fill-[#ff3e6c]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">평점</p>
                    <p className="text-sm text-white/85 font-bold">{drama.rating.toFixed(1)} <span className="text-white/30 font-normal text-xs">/ 10</span></p>
                  </div>
                </div>

                {/* Year */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar size={13} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">제작연도</p>
                    <p className="text-sm text-white/85 font-semibold">{drama.year}</p>
                  </div>
                </div>

                {/* Episodes */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                    <Clapperboard size={13} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">에피소드</p>
                    <p className="text-sm text-white/85 font-semibold">{drama.totalEpisodes}화</p>
                  </div>
                </div>

                {/* Runtime */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={13} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">러닝타임</p>
                    <p className="text-sm text-white/85 font-semibold">{drama.episodeLength}</p>
                  </div>
                </div>

                {/* Genre */}
                {drama.genres.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                      <Film size={13} className="text-white/40" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">장르</p>
                      <p className="text-sm text-white/85 font-semibold leading-snug">{drama.genres.slice(0, 3).join(" · ")}</p>
                    </div>
                  </div>
                )}

                {/* Views */}
                {drama.views > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                      <Eye size={13} className="text-white/40" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">조회수</p>
                      <p className="text-sm text-white/85 font-semibold">{(drama.views / 10000).toFixed(0)}만</p>
                    </div>
                  </div>
                )}

                {/* Director */}
                {drama.director && (
                  <div className="flex items-start gap-3 col-span-2 md:col-span-1">
                    <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                      <Clapperboard size={13} className="text-white/40" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">감독</p>
                      <p className="text-sm text-white/85 font-semibold">{drama.director}</p>
                    </div>
                  </div>
                )}

                {/* Cast */}
                {drama.cast.length > 0 && (
                  <div className="flex items-start gap-3 col-span-2 md:col-span-3">
                    <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
                      <Users size={13} className="text-white/40" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/28 font-semibold uppercase tracking-widest mb-1">출연</p>
                      <p className="text-sm text-white/80 font-medium leading-relaxed">
                        {drama.cast.slice(0, 8).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </RevealSection>

            {/* ── Genre / Tag Chips ── */}
            <RevealSection delay={210}>
              <div className="flex flex-wrap gap-2 mb-7 md:mb-9">
                {drama.genres.map((g) => (
                  <span key={g} className="text-xs px-3.5 py-1.5 rounded-full
                    bg-white/[0.055] text-white/55 border border-white/[0.09]
                    hover:bg-white/10 hover:text-white/80 transition-colors cursor-default">
                    {g}
                  </span>
                ))}
                {drama.tags.map((t) => (
                  <span key={t} className="text-xs px-3.5 py-1.5 rounded-full
                    bg-[#ff3e6c]/8 text-[#ff3e6c]/70 border border-[#ff3e6c]/15
                    hover:bg-[#ff3e6c]/14 transition-colors cursor-default">
                    #{t}
                  </span>
                ))}
              </div>
            </RevealSection>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            EPISODE LIST — Netflix Style
        ═══════════════════════════════════════════════════ */}
        <RevealSection delay={80} className="mt-2 mb-14">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-[3px] h-6 rounded-full bg-white/60 shrink-0" />
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                에피소드
              </h2>
              <span className="text-sm text-white/28 font-medium">
                {drama.episodes.length}화
              </span>
            </div>
          </div>

          {drama.episodes.length === 0 ? (
            <div className="py-14 text-center text-white/30 text-sm rounded-2xl bg-white/[0.025] border border-white/[0.05]">
              등록된 에피소드가 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {drama.episodes.map((ep, idx) => {
                // Find continue watching progress for this episode
                const cwEp = cwForDrama?.episodeId === ep.id ? cwForDrama : null;
                const isCurrent = cwEp !== null;

                return (
                  <Link
                    key={ep.id}
                    to={`/watch/${drama.id}/${ep.id}`}
                    className={[
                      "group flex items-center gap-3 md:gap-4 p-3.5 rounded-2xl",
                      "transition-all duration-200 active:scale-[0.99]",
                      isCurrent
                        ? "border border-[#ff3e6c]/22 bg-[#ff3e6c]/[0.045] hover:bg-[#ff3e6c]/[0.07]"
                        : "border border-white/[0.055] bg-white/[0.025] hover:bg-white/[0.06] hover:border-white/[0.11]",
                    ].join(" ")}
                    style={{ animationDelay: `${idx * 22}ms` }}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-28 md:w-40 aspect-video rounded-xl overflow-hidden shrink-0
                      bg-[#14161d] ring-1 ring-white/[0.05]">
                      <img
                        src={ep.thumbnail || drama.poster}
                        alt={ep.title || `${ep.number}화`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                        loading="lazy"
                      />
                      {/* Hover play overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45
                        flex items-center justify-center transition-all duration-200">
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center
                          opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100
                          transition-all duration-200 shadow-lg will-change-[opacity,transform]">
                          <Play size={14} className="fill-black text-black ml-0.5" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      {ep.duration && (
                        <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold
                          bg-black/75 text-white/90 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                          {ep.duration}
                        </span>
                      )}
                      {/* Lock badge */}
                      {!ep.isFree && (
                        <span className="absolute top-1.5 left-1.5 flex items-center gap-1
                          bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                          <Lock size={9} className="text-[#ff3e6c]" />
                          <span className="text-[9px] text-[#ff3e6c] font-bold">VIP</span>
                        </span>
                      )}
                      {/* Watch progress bar */}
                      {cwEp && <EpisodeProgress progress={cwEp.progress} />}
                      {/* Current indicator */}
                      {isCurrent && (
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff3e6c]
                          shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                      )}
                    </div>

                    {/* Episode number chip */}
                    <div className={[
                      "hidden sm:flex w-8 h-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                      isCurrent ? "bg-[#ff3e6c]/15 text-[#ff3e6c]" : "bg-white/[0.055] text-white/35",
                    ].join(" ")}>
                      {ep.number}
                    </div>

                    {/* Episode info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={[
                          "text-sm md:text-[15px] font-bold leading-snug transition-colors truncate",
                          isCurrent ? "text-[#ff3e6c]" : "text-white/88 group-hover:text-white",
                        ].join(" ")}>
                          {ep.title || `${ep.number}화`}
                        </p>
                        {!ep.isFree && (
                          <span className="shrink-0 text-[10px] text-[#ff3e6c] font-black">VIP</span>
                        )}
                        {isCurrent && (
                          <span className="shrink-0 text-[10px] text-[#ff3e6c]/70 font-semibold bg-[#ff3e6c]/10 px-1.5 py-0.5 rounded-md">
                            시청 중
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/32 line-clamp-2 leading-relaxed">
                        {ep.description
                          ? ep.description
                          : `${drama.title}의 ${ep.number}번째 이야기. 예상치 못한 전개가 시작된다.`}
                      </p>
                      {ep.duration && (
                        <p className="text-[11px] text-white/22 mt-1.5 flex items-center gap-1">
                          <Clock size={10} />
                          {ep.duration}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      size={16}
                      className={[
                        "shrink-0 transition-colors hidden md:block",
                        isCurrent ? "text-[#ff3e6c]/40 group-hover:text-[#ff3e6c]/70" : "text-white/18 group-hover:text-white/45",
                      ].join(" ")}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </RevealSection>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-12" />
      </div>

      {/* ═══════════════════════════════════════════════════
          RELATED CONTENT — 비슷한 작품
      ═══════════════════════════════════════════════════ */}
      {similar.length > 0 && (
        <RevealSection delay={0} className="pb-4">
          <DramaRow title="비슷한 작품" dramas={similar} accent />
        </RevealSection>
      )}

      {/* ═══════════════════════════════════════════════════
          MORE LIKE THIS — 신규 섹션
      ═══════════════════════════════════════════════════ */}
      {moreLikeThis.length > 0 && (
        <RevealSection delay={0} className="pb-14">
          <DramaRow title="이런 작품은 어떠세요?" subtitle="취향 기반 추천" dramas={moreLikeThis} />
        </RevealSection>
      )}

      {/* Ken Burns keyframe */}
      <style>{`
        @keyframes detail-ken-burns {
          from { transform: scale(1.04) translate3d(0, 0, 0); }
          to   { transform: scale(1.11) translate3d(-0.7%, -0.4%, 0); }
        }
      `}</style>
    </div>
  );
}
