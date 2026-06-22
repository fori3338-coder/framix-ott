/**
 * HeroBanner.tsx — FRAMIX Hero V3
 *
 * V3 변경사항:
 *  - 우측 플로팅 포스터 카드 / 스택 완전 제거
 *  - 배경 풀스크린 + 좌측 컨텐츠 레이아웃 단순화 (Netflix 2024 style)
 *  - Preview Rail 업그레이드: 가로 120~140px, hover 확대, 활성 glow, CW progress
 *  - AI Pick 배지 / 재생 / 상세보기 / CW 배너 / 슬라이드 인디케이터 유지
 */

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Plus,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  Eye,
  Clock,
} from "lucide-react";
import type { Drama, ContinueWatchingItem } from "../types";

// ── Constants ──────────────────────────────────────────────────────────────────
const SLIDE_MS = 6000;
const VIDEO_DELAY_MS = 3000;
const SWIPE_THRESHOLD = 50;

// ── Types ──────────────────────────────────────────────────────────────────────
interface HeroBannerProps {
  dramas: Drama[];
  continueWatchingItems?: ContinueWatchingItem[];
}

interface HeroItem {
  drama: Drama;
  cwItem?: ContinueWatchingItem;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatViews(views: number): string {
  if (views >= 100_000_000) return `${(views / 100_000_000).toFixed(1)}억`;
  if (views >= 10_000) return `${Math.round(views / 10_000)}만`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k`;
  return String(views);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Badges ─────────────────────────────────────────────────────────────────────
function AiPickBadge() {
  return (
    <span className="hero-ai-badge">
      <Sparkles size={11} className="hero-ai-badge-icon" />
      AI Pick
    </span>
  );
}

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
  count,
  index,
  paused,
  onSelect,
}: {
  count: number;
  index: number;
  paused: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="hero-indicators">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={`슬라이드 ${i + 1}`}
          className={`hero-indicator-dot${i === index ? " active" : ""}`}
        >
          {i === index && (
            <span
              key={`progress-${index}-${paused}`}
              className={`hero-indicator-progress${paused ? " paused" : ""}`}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ── Preview Rail V3 — 가로 120~140px, hover 확대, 활성 glow ──────────────────
function PreviewRail({
  items,
  activeIndex,
  onSelect,
}: {
  items: HeroItem[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) {
      onSelect((activeIndex + 1) % items.length);
    } else {
      onSelect((activeIndex - 1 + items.length) % items.length);
    }
  };

  return (
    <div
      className="hero-rail-wrap"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="hero-rail">
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={item.drama.id}
              className={`hero-rail-card-v3${isActive ? " active" : ""}`}
              onClick={() => onSelect(i)}
              aria-label={item.drama.title}
            >
              {/* Thumbnail */}
              <div className="hero-rail-thumb-v3">
                <img
                  src={item.drama.poster}
                  alt={item.drama.title}
                  className="hero-rail-img"
                  loading="lazy"
                />
                {/* CW progress bar */}
                {item.cwItem && (
                  <div className="hero-rail-progress-bar">
                    <div
                      className="hero-rail-progress-fill"
                      style={{ width: `${item.cwItem.progress}%` }}
                    />
                  </div>
                )}
                {/* Active glow ring */}
                {isActive && <div className="hero-rail-glow-ring" />}
              </div>
              {/* Label */}
              <div className="hero-rail-label-v3">
                <p className="hero-rail-title-v3">{item.drama.title}</p>
                {item.cwItem ? (
                  <p className="hero-rail-sub-v3 cw">
                    <Clock size={9} />
                    {formatTime(
                      item.cwItem.durationSeconds - item.cwItem.progressSeconds
                    )}{" "}
                    남음
                  </p>
                ) : (
                  <p className="hero-rail-sub-v3">{item.drama.totalEpisodes}화</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main HeroBanner ────────────────────────────────────────────────────────────
export default function HeroBanner({
  dramas,
  continueWatchingItems = [],
}: HeroBannerProps) {
  const heroItems = useMemo<HeroItem[]>(() => {
    const cwFirst = continueWatchingItems.slice(0, 1);
    const cwHeroItems: HeroItem[] = cwFirst
      .map((cw): HeroItem | null => {
        const d = dramas.find((dr) => dr.id === cw.dramaId);
        if (!d) return null;
        return { drama: d, cwItem: cw };
      })
      .filter((x): x is HeroItem => x !== null);

    const cwIds = new Set(cwHeroItems.map((x) => x.drama.id));
    const rest: HeroItem[] = dramas
      .filter((d) => !cwIds.has(d.id))
      .slice(0, 5 - cwHeroItems.length)
      .map((d) => ({ drama: d }));

    return [...cwHeroItems, ...rest].slice(0, 5);
  }, [dramas, continueWatchingItems]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoPreviewActive, setVideoPreviewActive] = useState(false);
  const [videoErrorIds, setVideoErrorIds] = useState<Set<string>>(new Set());
  const [videoReady, setVideoReady] = useState(false);
  const [inFavorites, setInFavorites] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setInFavorites(false);
  }, [index]);

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

  useEffect(() => {
    if (paused || heroItems.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % heroItems.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [heroItems.length, paused]);

  useEffect(() => {
    setVideoPreviewActive(false);
    setVideoReady(false);
    if (paused) return;
    const t = setTimeout(() => setVideoPreviewActive(true), VIDEO_DELAY_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: nx * 14, y: ny * 8 });
    },
    []
  );
  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
    setPaused(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) * 1.2)
      return;
    if (dx < 0) {
      setPaused(true);
      setIndex((i) => (i + 1) % heroItems.length);
    } else {
      setPaused(true);
      setIndex((i) => (i - 1 + heroItems.length) % heroItems.length);
    }
  };

  const handlePrev = useCallback(() => {
    setPaused(true);
    setIndex((i) => (i - 1 + heroItems.length) % heroItems.length);
  }, [heroItems.length]);

  const handleNext = useCallback(() => {
    setPaused(true);
    setIndex((i) => (i + 1) % heroItems.length);
  }, [heroItems.length]);

  const handleSelect = useCallback((i: number) => {
    setPaused(true);
    setIndex(i);
  }, []);

  const current = heroItems[index];
  if (!current) return null;

  const { drama, cwItem } = current;
  const displayTitle = drama.bannerTitle?.trim() || drama.title;
  const displayDescription = drama.bannerDescription?.trim() || drama.synopsis;

  const playRoute = cwItem
    ? `/watch/${drama.id}/${cwItem.episodeId}`
    : drama.episodes?.[0]
    ? `/watch/${drama.id}/${drama.episodes[0].id}`
    : null;

  const handlePlay = () => {
    if (playRoute) navigate(playRoute);
  };
  const handleDetail = () => navigate(`/drama/${drama.id}`);

  const isAiPick = drama.isOriginal || drama.isExclusive || index % 2 === 0;

  return (
    <div
      ref={containerRef}
      className="hero-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Backdrop Layer ──────────────────────────────────────────────────── */}
      <div className="hero-backdrops">
        {heroItems.map((item, i) => {
          const d = item.drama;
          const isActive = i === index;
          return (
            <div
              key={d.id}
              className={`hero-backdrop-item${isActive ? " active" : ""}`}
            >
              <img
                src={d.backdrop}
                alt={d.title}
                className={`hero-img-mobile${isActive ? " zooming" : ""}`}
              />
              <img
                src={d.backdrop}
                alt={d.title}
                className={`hero-img-desktop${isActive ? " zooming-pc" : ""}`}
                style={
                  isActive
                    ? {
                        transform: `scale(1.04) translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
                        transition:
                          "transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94)",
                        willChange: "transform",
                      }
                    : undefined
                }
              />
              {isActive &&
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
          );
        })}
      </div>

      {/* ── Cinematic Gradients ─────────────────────────────────────────────── */}
      <div className="hero-gradient-bottom" />
      <div className="hero-gradient-left" />
      <div className="hero-gradient-top" />
      <div className="hero-gradient-base-fade" />

      {/* ── Content Layout V3 — 풀스크린 단일 컬럼 ─────────────────────────── */}
      <div className="hero-content-layout-v3">
        <div
          className="hero-left-v3"
          key={`${drama.id}-content`}
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(28px)",
            transition:
              "opacity 680ms cubic-bezier(0.22,1,0.36,1), transform 680ms cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform",
          }}
        >
          {/* Badges */}
          <div className="hero-badges-row">
            {drama.isOriginal && <OriginalBadge />}
            {isAiPick && <AiPickBadge />}
            {cwItem && (
              <span className="hero-cw-badge">
                <Clock size={10} />
                이어보기
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="hero-title">{displayTitle}</h1>

          {/* Metadata */}
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
                <span className="hero-meta-genre hidden sm:inline">
                  {drama.genres[0]}
                </span>
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

          {/* CW progress */}
          {cwItem && (
            <div className="hero-cw-progress-wrap">
              <div className="hero-cw-progress-track">
                <div
                  className="hero-cw-progress-fill"
                  style={{ width: `${cwItem.progress}%` }}
                />
              </div>
              <span className="hero-cw-progress-label">
                {cwItem.episodeNumber}화 · {formatTime(cwItem.progressSeconds)} /{" "}
                {formatTime(cwItem.durationSeconds)}
              </span>
            </div>
          )}

          {/* Synopsis */}
          <p className="hero-synopsis">{displayDescription}</p>

          {/* Genre tags */}
          <div className="hero-genres">
            {drama.genres.slice(0, 3).map((g) => (
              <span key={g} className="hero-genre-tag">
                {g}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="hero-cta-row">
            <button
              onClick={handlePlay}
              disabled={!playRoute}
              className="hero-btn-play"
            >
              <Play size={18} className="fill-black shrink-0" />
              <span>{cwItem ? "이어보기" : "재생"}</span>
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
        </div>
      </div>

      {/* ── Arrows (desktop) ───────────────────────────────────────────────── */}
      {heroItems.length > 1 && (
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

      {/* ── Progress Indicators ────────────────────────────────────────────── */}
      <SlideIndicators
        count={heroItems.length}
        index={index}
        paused={paused}
        onSelect={handleSelect}
      />

      {/* ── Preview Rail V3 ────────────────────────────────────────────────── */}
      <PreviewRail
        items={heroItems}
        activeIndex={index}
        onSelect={handleSelect}
      />
    </div>
  );
}
