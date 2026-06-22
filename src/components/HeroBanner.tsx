/**
 * HeroBanner.tsx — FRAMIX Hero V2 Core Structure
 * 
 * Features:
 *  - 5-item rotation, 6s interval
 *  - Left/Right arrow support
 *  - Metadata: rating / episodes / genre / views
 *  - AI PICK badge
 *  - FRAMIX ORIGINAL badge
 *  - CTA: 재생 / 내 목록 / 상세보기 (Desktop: row, Mobile: col)
 *  - Hero Reveal: opacity + translateY GPU transform only
 *  - Mobile optimized: iPhone / Galaxy / Fold / Tablet
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Info, ChevronLeft, ChevronRight, Sparkles, Star, Eye } from "lucide-react";
import type { Drama } from "../types";

interface HeroBannerProps {
  dramas: Drama[];
}

const SLIDE_MS = 6000;
const VIDEO_DELAY_MS = 3000;

// ── Format view count ─────────────────────────────────────────────────────────
function formatViews(views: number): string {
  if (views >= 100_000_000) return `${(views / 100_000_000).toFixed(1)}억`;
  if (views >= 10_000) return `${Math.round(views / 10_000)}만`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k`;
  return String(views);
}

// ── AI Pick Badge ──────────────────────────────────────────────────────────────
function AiPickBadge() {
  return (
    <span className="hero-ai-badge">
      <Sparkles size={11} className="hero-ai-badge-icon" />
      AI Pick
    </span>
  );
}

// ── FRAMIX Original Badge ─────────────────────────────────────────────────────
function OriginalBadge() {
  return (
    <div className="hero-original-badge">
      <span className="hero-original-label">FRAMIX</span>
      <span className="hero-original-divider" />
      <span className="hero-original-sub">Original Series</span>
    </div>
  );
}

// ── Slide Indicators ───────────────────────────────────────────────────────────
function SlideIndicators({
  dramas,
  index,
  paused,
  onSelect,
}: {
  dramas: Drama[];
  index: number;
  paused: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="hero-indicators">
      {dramas.map((d, i) => (
        <button
          key={d.id}
          onClick={() => onSelect(i)}
          aria-label={`슬라이드 ${i + 1}`}
          className={`hero-indicator-dot${i === index ? " active" : ""}`}
        >
          {i === index && !paused && (
            <span className="hero-indicator-progress" />
          )}
          {i === index && paused && (
            <span className="hero-indicator-progress paused" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main HeroBanner ────────────────────────────────────────────────────────────
export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoPreviewActive, setVideoPreviewActive] = useState(false);
  const [videoErrorIds, setVideoErrorIds] = useState<Set<string>>(new Set());
  const [videoReady, setVideoReady] = useState(false);
  const [inFavorites, setInFavorites] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Hero Reveal: IntersectionObserver — GPU only (opacity + translateY)
  useEffect(() => {
    const el = containerRef.current;
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

  // Auto-slide (6s)
  useEffect(() => {
    if (paused || dramas.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % dramas.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [dramas.length, paused]);

  // Video preview delay
  useEffect(() => {
    setVideoPreviewActive(false);
    setVideoReady(false);
    if (paused) return;
    const t = setTimeout(() => setVideoPreviewActive(true), VIDEO_DELAY_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  const handlePrev = useCallback(() => {
    setPaused(true);
    setIndex((i) => (i - 1 + dramas.length) % dramas.length);
  }, [dramas.length]);

  const handleNext = useCallback(() => {
    setPaused(true);
    setIndex((i) => (i + 1) % dramas.length);
  }, [dramas.length]);

  const drama = dramas[index];
  if (!drama) return null;

  const displayTitle = drama.bannerTitle?.trim() || drama.title;
  const displayDescription = drama.bannerDescription?.trim() || drama.synopsis;
  const firstEpisode = drama.episodes?.[0];
  const playRoute = firstEpisode ? `/watch/${drama.id}/${firstEpisode.id}` : null;

  const handlePlay = () => { if (playRoute) navigate(playRoute); };
  const handleDetail = () => navigate(`/drama/${drama.id}`);

  const handleScrollToCW = () => {
    const el = document.getElementById("continue-watching-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({
        top: (containerRef.current?.offsetHeight ?? 600) - 80,
        behavior: "smooth",
      });
    }
  };

  const isAiPick = drama.isOriginal || drama.isExclusive || index % 2 === 0;

  return (
    <div
      ref={containerRef}
      className="hero-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Backdrop Layer ─────────────────────────────────────────────── */}
      <div className="hero-backdrops">
        {dramas.map((d, i) => (
          <div
            key={d.id}
            className={`hero-backdrop-item${i === index ? " active" : ""}`}
          >
            <img
              src={d.backdrop}
              alt={d.title}
              className={`hero-img-mobile${i === index ? " zooming" : ""}`}
            />
            <img
              src={d.backdrop}
              alt={d.title}
              className={`hero-img-desktop${i === index ? " zooming-pc" : ""}`}
            />
            {i === index &&
              videoPreviewActive &&
              d.bannerVideoUrl &&
              !videoErrorIds.has(d.id) && (
                <video
                  key={d.bannerVideoUrl}
                  src={d.bannerVideoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="hero-video"
                  style={{ opacity: videoReady ? 1 : 0 }}
                  onCanPlay={() => setVideoReady(true)}
                  onError={() => {
                    setVideoErrorIds((prev) => new Set(prev).add(d.id));
                    setVideoReady(false);
                  }}
                />
              )}
          </div>
        ))}
      </div>

      {/* ── Cinematic Gradients ─────────────────────────────────────────── */}
      <div className="hero-gradient-bottom" />
      <div className="hero-gradient-left" />
      <div className="hero-gradient-top" />
      <div className="hero-gradient-right-desktop" />
      <div className="hero-gradient-base-fade" />

      {/* ── Content Layout ──────────────────────────────────────────────── */}
      <div className="hero-content-layout">

        {/* LEFT: Content */}
        <div
          className="hero-left"
          key={`${drama.id}-content`}
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 680ms cubic-bezier(0.22,1,0.36,1), transform 680ms cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform",
          }}
        >
          {/* Badges row */}
          <div className="hero-badges-row">
            {drama.isOriginal && <OriginalBadge />}
            {isAiPick && <AiPickBadge />}
          </div>

          {/* Title */}
          <h1 className="hero-title">{displayTitle}</h1>

          {/* Metadata row: rating · year · age · episodes · views */}
          <div className="hero-meta-row">
            <span className="hero-meta-rating">
              <Star size={12} className="fill-current" />
              {drama.rating.toFixed(1)}
            </span>
            <span className="hero-meta-dot">·</span>
            <span className="hero-meta-year">{drama.year}</span>
            <span className="hero-meta-age">{drama.ageRating}</span>
            <span className="hero-meta-episodes">{drama.totalEpisodes}화</span>
            {drama.genres[0] && (
              <>
                <span className="hero-meta-dot hidden sm:inline">·</span>
                <span className="hero-meta-genre hidden sm:inline">{drama.genres[0]}</span>
              </>
            )}
            {drama.views > 0 && (
              <>
                <span className="hero-meta-dot">·</span>
                <span className="hero-meta-views">
                  <Eye size={11} className="inline mr-0.5 opacity-70" />
                  {formatViews(drama.views)}
                </span>
              </>
            )}
          </div>

          {/* Synopsis (desktop) */}
          <p className="hero-synopsis">{displayDescription}</p>

          {/* Genre tags */}
          <div className="hero-genres">
            {drama.genres.slice(0, 3).map((g) => (
              <span key={g} className="hero-genre-tag">{g}</span>
            ))}
          </div>

          {/* CTA — Desktop: row / Mobile: col */}
          <div className="hero-cta-row">
            <button
              onClick={handlePlay}
              disabled={!playRoute}
              className="hero-btn-play"
            >
              <Play size={18} className="fill-black shrink-0" />
              <span>재생</span>
            </button>

            <button
              onClick={() => setInFavorites((f) => !f)}
              className={`hero-btn-save${inFavorites ? " saved" : ""}`}
              aria-label="내 목록"
            >
              <Plus
                size={18}
                className="shrink-0"
                style={{
                  transform: inFavorites ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              />
              <span>{inFavorites ? "저장됨" : "내 목록"}</span>
            </button>

            <button
              onClick={handleDetail}
              className="hero-btn-info"
              aria-label="상세보기"
            >
              <Info size={18} className="shrink-0" />
              <span>상세보기</span>
            </button>
          </div>

          {/* Continue Watching shortcut */}
          <button onClick={handleScrollToCW} className="hero-cw-link">
            <span className="hero-cw-link-bar" />
            이어보기 바로가기
            <ChevronRight size={13} />
          </button>
        </div>

        {/* RIGHT: Preview stack (desktop md+) */}
        <div className="hero-right">
          <div className="hero-preview-stack">
            {dramas.slice(0, 4).map((d, i) => {
              const offset = (i - index + dramas.length) % dramas.length;
              const isActive = offset === 0;
              const isNext = offset === 1;
              const isPrev = offset === dramas.length - 1;
              if (!isActive && !isNext && !isPrev) return null;
              return (
                <button
                  key={d.id}
                  onClick={() => { setPaused(true); setIndex(i); }}
                  className={`hero-preview-card${isActive ? " hero-preview-active" : isNext ? " hero-preview-next" : " hero-preview-prev"}`}
                  aria-label={d.title}
                >
                  <img src={d.poster} alt={d.title} className="hero-preview-img" />
                  <div className="hero-preview-overlay">
                    <p className="hero-preview-title">{d.title}</p>
                    <p className="hero-preview-ep">{d.totalEpisodes}화</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Arrows (desktop) ─────────────────────────────────────────────── */}
      {dramas.length > 1 && (
        <>
          <button onClick={handlePrev} className="hero-arrow hero-arrow-left" aria-label="이전 슬라이드">
            <ChevronLeft size={22} />
          </button>
          <button onClick={handleNext} className="hero-arrow hero-arrow-right" aria-label="다음 슬라이드">
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* ── Slide Indicators ─────────────────────────────────────────────── */}
      <SlideIndicators
        dramas={dramas}
        index={index}
        paused={paused}
        onSelect={(i) => { setPaused(true); setIndex(i); }}
      />
    </div>
  );
}
