/**
 * HeroBanner.tsx — FRAMIX Premium Hero Slider
 * Desktop: Netflix-style cinematic layout (full-width backdrop + left content + right preview)
 * Mobile: ReelShort-style vertical full-bleed with bold CTA
 *
 * Features:
 *  - 5+ content rotation with auto-slide (15s) + manual control
 *  - Cinematic multi-layer gradient
 *  - Metadata: rating / episodes / genre / year
 *  - AI Pick badge
 *  - Premium CTA: 재생 / 내 보관함 / 상세보기
 *  - Hero bottom → Continue Watching anchor scroll
 *  - Video preview (3s delay, muted, fade-in)
 *  - Ken Burns on image fallback
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Info, ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import type { Drama } from "../types";

interface HeroBannerProps {
  dramas: Drama[];
}

const SLIDE_MS = 15000;
const VIDEO_DELAY_MS = 3000;

// ── AI Pick Badge ──────────────────────────────────────────────────────────────
function AiPickBadge() {
  return (
    <span className="hero-ai-badge">
      <Sparkles size={11} className="hero-ai-badge-icon" />
      AI Pick
    </span>
  );
}

// ── Star Rating ────────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <span className="hero-meta-rating">
      <Star size={12} className="fill-current" />
      {rating.toFixed(1)}
    </span>
  );
}

// ── Slide Dot Indicators ───────────────────────────────────────────────────────
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
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-slide
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

  const drama = dramas[index];
  if (!drama) return null;

  const displayTitle = drama.bannerTitle?.trim() || drama.title;
  const displayDescription = drama.bannerDescription?.trim() || drama.synopsis;

  const firstEpisode = drama.episodes?.[0];
  const playRoute = firstEpisode ? `/watch/${drama.id}/${firstEpisode.id}` : null;

  const handlePlay = () => {
    if (!playRoute) return;
    navigate(playRoute);
  };

  const handleDetail = () => navigate(`/drama/${drama.id}`);

  const handlePrev = () => {
    setPaused(true);
    setIndex((i) => (i - 1 + dramas.length) % dramas.length);
  };
  const handleNext = () => {
    setPaused(true);
    setIndex((i) => (i + 1) % dramas.length);
  };

  // Scroll to ContinueWatchingRow
  const handleScrollToCW = () => {
    const el = document.getElementById("continue-watching-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // fallback: scroll past hero
      window.scrollTo({
        top: (containerRef.current?.offsetHeight ?? 600) - 80,
        behavior: "smooth",
      });
    }
  };

  // is AI pick: isOriginal or even index
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
            {/* Mobile image */}
            <img
              src={d.backdrop}
              alt={d.title}
              className={`hero-img-mobile${i === index ? " zooming" : ""}`}
            />
            {/* Desktop image */}
            <img
              src={d.backdrop}
              alt={d.title}
              className={`hero-img-desktop${i === index ? " zooming-pc" : ""}`}
            />
            {/* Video preview */}
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

      {/* ── Cinematic Multi-Layer Gradient ─────────────────────────────── */}
      {/* Layer 1: bottom-to-top dark (content area) */}
      <div className="hero-gradient-bottom" />
      {/* Layer 2: left-to-right (text area) */}
      <div className="hero-gradient-left" />
      {/* Layer 3: top vignette */}
      <div className="hero-gradient-top" />
      {/* Layer 4: right side dark for desktop split */}
      <div className="hero-gradient-right-desktop" />
      {/* Layer 5: base fade at bottom */}
      <div className="hero-gradient-base-fade" />

      {/* ── Desktop Split Layout ────────────────────────────────────────── */}
      <div className="hero-content-layout">

        {/* LEFT: Content Area */}
        <div className="hero-left" key={`${drama.id}-content`}>

          {/* Original / Exclusive badge */}
          {drama.isOriginal && (
            <div className="hero-original-badge">
              <span className="hero-original-label">FRAMIX</span>
              <span className="hero-original-divider" />
              <span className="hero-original-sub">Original Series</span>
            </div>
          )}

          {/* AI Pick */}
          {isAiPick && <AiPickBadge />}

          {/* Title */}
          <h1 className="hero-title">
            {displayTitle}
          </h1>

          {/* Metadata row */}
          <div className="hero-meta-row">
            <StarRating rating={drama.rating} />
            <span className="hero-meta-dot">·</span>
            <span className="hero-meta-year">{drama.year}</span>
            <span className="hero-meta-age">{drama.ageRating}</span>
            <span className="hero-meta-episodes">{drama.totalEpisodes}화</span>
            <span className="hero-meta-dot hidden sm:inline">·</span>
            <span className="hero-meta-length hidden sm:inline">{drama.episodeLength}</span>
          </div>

          {/* Synopsis (desktop only) */}
          <p className="hero-synopsis">
            {displayDescription}
          </p>

          {/* Genres */}
          <div className="hero-genres">
            {drama.genres.slice(0, 3).map((g) => (
              <span key={g} className="hero-genre-tag">
                {g}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hero-cta-row">
            {/* 재생 */}
            <button
              onClick={handlePlay}
              disabled={!playRoute}
              className="hero-btn-play"
            >
              <Play size={18} className="fill-black shrink-0" />
              <span>재생</span>
            </button>

            {/* 내 보관함 */}
            <button
              onClick={() => setInFavorites((f) => !f)}
              className={`hero-btn-save${inFavorites ? " saved" : ""}`}
              aria-label="내 보관함"
            >
              <Plus
                size={18}
                className="shrink-0"
                style={{
                  transform: inFavorites ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              />
              <span className="hidden sm:inline">
                {inFavorites ? "저장됨" : "내 보관함"}
              </span>
            </button>

            {/* 상세보기 */}
            <button
              onClick={handleDetail}
              className="hero-btn-info"
              aria-label="상세보기"
            >
              <Info size={18} className="shrink-0" />
              <span className="hidden sm:inline">상세보기</span>
            </button>
          </div>

          {/* Continue Watching shortcut */}
          <button
            onClick={handleScrollToCW}
            className="hero-cw-link"
          >
            <span className="hero-cw-link-bar" />
            이어보기 바로가기
            <ChevronRight size={13} />
          </button>
        </div>

        {/* RIGHT: Preview Card (desktop md+) */}
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

      {/* ── Prev/Next Arrow (desktop) ────────────────────────────────────── */}
      {dramas.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="hero-arrow hero-arrow-left"
            aria-label="이전 슬라이드"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={handleNext}
            className="hero-arrow hero-arrow-right"
            aria-label="다음 슬라이드"
          >
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
