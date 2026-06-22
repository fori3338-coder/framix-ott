/**
 * HeroBanner V10 — Cinematic Dual-Column Layout
 * Left: Premium text content with metadata
 * Right: Full cinematic artwork with Ken Burns
 * Desktop-first responsive scaling
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Plus, Volume2, VolumeX } from "lucide-react";
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

  return (
    <div
      className="hero-v11-root relative w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Backdrop Layer (Right side cinematic artwork) ──────────────── */}
      {dramas.map((d, i) => (
        <div
          key={d.id}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={d.backdrop}
            alt={d.title}
            className={`w-full h-full object-cover ${i === index ? "animate-ken-burns" : ""}`}
            style={{ willChange: "transform" }}
          />
        </div>
      ))}

      {/* ── Hero Gradient Scrim: Strong bottom-to-top black gradient ──── */}
      <div className="hero-v10-scrim absolute inset-0 pointer-events-none" />

      {/* ── Dual-Column Layout Container ──────────────────────────────── */}
      <div className="hero-v10-container relative z-10 h-full flex items-center">
        {/* LEFT COLUMN: Premium Text Content */}
        <div className="hero-v10-left">
          <div className="hero-v10-content" key={drama.id}>
            {/* Badge: ORIGINAL / PREMIUM / VIP */}
            {drama.isOriginal && (
              <div
                className="hero-v10-badge hero-fade-in"
                style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
              >
                FRAMIX ORIGINAL
              </div>
            )}

            {/* TITLE: 40% larger (now clamp(3rem, 7vw, 6.5rem)) */}
            <h1
              className="hero-v10-title hero-fade-in"
              style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
            >
              {drama.title}
            </h1>

            {/* DESCRIPTION: 3-line limit */}
            <p
              className="hero-v10-description hero-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
            >
              {drama.synopsis}
            </p>

            {/* METADATA ROW: Rating, Genre, Episodes, Views */}
            <div
              className="hero-v10-metadata hero-fade-in"
              style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
            >
              {/* Rating */}
              <div className="hero-v10-meta-item">
                <svg width="14" height="14" viewBox="0 0 10 10" fill="rgba(255,255,255,0.95)">
                  <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
                </svg>
                <span className="text-sm font-semibold">{drama.rating.toFixed(1)}</span>
              </div>

              {/* Genre */}
              <span className="text-sm text-white/65 font-medium">{drama.genres[0]}</span>

              {/* Episodes */}
              <span className="text-sm text-white/65 font-medium">{drama.totalEpisodes}부작</span>

              {/* Views */}
              {drama.views !== undefined && (
                <span className="text-sm text-white/65 font-medium">
                  조회 {drama.views >= 10000 ? `${(drama.views / 10000).toFixed(1)}만` : drama.views.toLocaleString()}
                </span>
              )}
            </div>

            {/* GENRES as tags */}
            <div
              className="hero-v10-genre-tags hero-fade-in"
              style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
            >
              {drama.genres.map((g) => (
                <span key={g} className="hero-v10-genre-tag">{g}</span>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div
              className="hero-v10-actions hero-fade-in"
              style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
            >
              <button
                onClick={() => {
                  if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
                  else navigate(`/drama/${drama.id}`);
                }}
                className="hero-v10-btn-play"
              >
                <Play size={20} className="fill-black" />
                <span className="font-bold">재생</span>
              </button>

              <button
                onClick={() => navigate(`/drama/${drama.id}`)}
                className="hero-v10-btn-secondary"
              >
                <Info size={18} />
                <span className="font-semibold">상세보기</span>
              </button>

              <button
                onClick={() => toggleFavorite(drama.id)}
                className="hero-v10-btn-icon"
                aria-label="찜"
              >
                <Plus size={20} className={isFav ? "text-gold" : ""} />
              </button>

              <button
                onClick={() => setMuted((m) => !m)}
                className="hero-v10-btn-icon"
                aria-label="음소거"
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Large Cinematic Artwork (implicit via background) */}
        <div className="hero-v10-right" />
      </div>

      {/* ── Slide Indicators (Bottom right) ─────────────────────────── */}
      <div className="absolute bottom-6 md:bottom-10 right-5 md:right-12 flex items-center gap-2 z-20">
        {dramas.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={`relative h-1 rounded-full transition-all duration-300 ${
              i === index
                ? "w-10 md:w-14 bg-white/80"
                : "w-2 md:w-3 bg-white/30 hover:bg-white/55"
            }`}
          >
            {i === index && !paused && (
              <span className="absolute inset-0 bg-white origin-left animate-[hero-progress_7s_linear_forwards]" />
            )}
            {i === index && paused && <span className="absolute inset-0 bg-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}
