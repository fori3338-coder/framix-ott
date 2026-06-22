/**
 * HeroBanner V11 — FRAMIX Premium Cinematic UI Pack V1
 * Apple TV+ / Netflix Premium level
 * - Cinematic title typography (tighter tracking, deeper shadow)
 * - Premium metadata with separator dots + rating box
 * - Enhanced action buttons (play = filled white pill, secondary = glass)
 * - Smoother Ken Burns, deeper scrim
 * - Slide indicators with progress glow
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Plus, Check, Volume2, VolumeX } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface HeroBannerProps {
  dramas: Drama[];
}

const SLIDE_MS = 7000;

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % dramas.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [dramas.length, paused]);

  const drama = dramas[index];
  if (!drama) return null;

  const firstEpisodeId = drama.episodes[0]?.id;
  const isFav = isFavorite(drama.id);

  const formatViews = (v: number) =>
    v >= 10000 ? `${(v / 10000).toFixed(1)}만 뷰` : `${v.toLocaleString()} 뷰`;

  return (
    <div
      className="hero-v11-root relative w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Backdrop Layer ─────────────────────────────────────────── */}
      {dramas.map((d, i) => (
        <div
          key={d.id}
          className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={d.backdrop}
            alt={d.title}
            className={`w-full h-full object-cover ${i === index ? "animate-ken-burns" : ""}`}
            style={{ willChange: "transform", transformOrigin: "center center" }}
          />
        </div>
      ))}

      {/* ── Cinematic Scrim ────────────────────────────────────────── */}
      <div className="hero-v10-scrim absolute inset-0 pointer-events-none" />

      {/* ── Top vignette for header readability ────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%)",
        }}
      />

      {/* ── Content Container ──────────────────────────────────────── */}
      <div className="hero-v10-container relative z-10 h-full flex items-center">
        {/* LEFT COLUMN */}
        <div className="hero-v10-left">
          <div className="hero-v10-content" key={drama.id}>

            {/* ── Badge ─────────────────────────────────────────────── */}
            {drama.isOriginal && (
              <div
                className="hero-v10-badge hero-fade-in"
                style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
              >
                {/* Small diamond */}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M4 0L8 4L4 8L0 4Z" fill="rgba(255,255,255,0.8)" />
                </svg>
                FRAMIX ORIGINAL
              </div>
            )}

            {/* ── Title ─────────────────────────────────────────────── */}
            <h1
              className="hero-v10-title hero-fade-in"
              style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
            >
              {drama.title}
            </h1>

            {/* ── Cinematic Metadata Row ─────────────────────────────── */}
            <div
              className="hero-v10-metadata hero-fade-in"
              style={{ animationDelay: "130ms", animationFillMode: "backwards" }}
            >
              {/* Rating box */}
              <div className="hero-v10-meta-item">
                <svg width="13" height="13" viewBox="0 0 10 10" fill="rgba(255,215,0,0.95)">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span>{drama.rating.toFixed(1)}</span>
              </div>

              {/* Dot separator */}
              <span className="hero-meta-dot" />

              {/* Genre */}
              <span className="text-sm text-white/68 font-medium tracking-wide">{drama.genres[0]}</span>

              {/* Dot */}
              <span className="hero-meta-dot" />

              {/* Episodes */}
              <span className="text-sm text-white/68 font-medium">{drama.totalEpisodes}부작</span>

              {/* Views — only if available */}
              {drama.views !== undefined && drama.views > 0 && (
                <>
                  <span className="hero-meta-dot" />
                  <span className="text-sm text-white/55 font-medium">{formatViews(drama.views)}</span>
                </>
              )}

              {/* Year */}
              {drama.year && (
                <>
                  <span className="hero-meta-dot" />
                  <span className="text-sm text-white/45 font-medium">{drama.year}</span>
                </>
              )}
            </div>

            {/* ── Description ───────────────────────────────────────── */}
            <p
              className="hero-v10-description hero-fade-in"
              style={{ animationDelay: "190ms", animationFillMode: "backwards" }}
            >
              {drama.synopsis}
            </p>

            {/* ── Genre Tags ────────────────────────────────────────── */}
            <div
              className="hero-v10-genre-tags hero-fade-in"
              style={{ animationDelay: "250ms", animationFillMode: "backwards" }}
            >
              {drama.genres.slice(0, 3).map((g) => (
                <span key={g} className="hero-v10-genre-tag">{g}</span>
              ))}
            </div>

            {/* ── Action Buttons ────────────────────────────────────── */}
            <div
              className="hero-v10-actions hero-fade-in"
              style={{ animationDelay: "320ms", animationFillMode: "backwards" }}
            >
              {/* Play — primary white pill */}
              <button
                onClick={() => {
                  if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
                  else navigate(`/drama/${drama.id}`);
                }}
                className="hero-v10-btn-play"
              >
                <Play size={19} className="fill-black" strokeWidth={0} />
                <span>재생</span>
              </button>

              {/* Details — glass secondary */}
              <button
                onClick={() => navigate(`/drama/${drama.id}`)}
                className="hero-v10-btn-secondary"
              >
                <Info size={17} strokeWidth={2} />
                <span>상세보기</span>
              </button>

              {/* Favorite icon */}
              <button
                onClick={() => toggleFavorite(drama.id)}
                className="hero-v10-btn-icon"
                aria-label={isFav ? "찜 해제" : "찜"}
              >
                {isFav ? (
                  <Check size={18} strokeWidth={2.5} className="text-white" />
                ) : (
                  <Plus size={19} strokeWidth={2} />
                )}
              </button>

              {/* Volume */}
              <button
                onClick={() => setMuted((m) => !m)}
                className="hero-v10-btn-icon"
                aria-label={muted ? "음소거 해제" : "음소거"}
              >
                {muted ? <VolumeX size={17} strokeWidth={2} /> : <Volume2 size={17} strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hero-v10-right" />
      </div>

      {/* ── Slide Indicators ─────────────────────────────────────── */}
      <div className="absolute bottom-6 md:bottom-10 right-5 md:right-12 flex items-center gap-2 z-20">
        {dramas.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={`relative h-[3px] rounded-full transition-all duration-350 ${
              i === index
                ? "w-10 md:w-14 bg-white hero-indicator-active"
                : "w-2 md:w-3 bg-white/28 hover:bg-white/50"
            }`}
          >
            {i === index && !paused && (
              <span
                className="absolute inset-0 rounded-full bg-white/60 origin-left"
                style={{ animation: `hero-progress ${SLIDE_MS}ms linear forwards` }}
              />
            )}
            {i === index && paused && (
              <span className="absolute inset-0 rounded-full bg-white/60" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
