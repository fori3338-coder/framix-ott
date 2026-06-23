import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Volume2, VolumeX, Plus, Eye } from "lucide-react";
import type { Drama } from "../types";
import type { ContinueWatchingItem } from "../types";

interface HeroBannerProps {
  dramas: Drama[];
  continueWatchingItems?: ContinueWatchingItem[];
}

const SLIDE_MS = 7000;

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % dramas.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [dramas.length, paused, index]);

  const drama = dramas[index];
  if (!drama) return null;

  return (
    <div
      className="relative w-full h-[72vh] md:h-[92vh] min-h-[500px] overflow-hidden bg-base"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Backdrop layers with Ken Burns ─────────────────────────── */}
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

      {/* ── Cinematic Scrim (deeper, more premium) ──────────────────── */}
      <div className="hero-cinematic-scrim pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-base pointer-events-none" />

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="hero-content-layout-v3">
        <div className="hero-left-v3" key={drama.id}>

          {/* Original badge */}
          {drama.isOriginal && (
            <div className="flex items-center gap-2 mb-4 hero-fade-in">
              <span className="hero-original-badge">FRAMIX ORIGINAL</span>
            </div>
          )}

          {/* ── Title — Much larger, bolder ────────────────────────── */}
          <h1
            className="hero-title-v5"
            style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
          >
            {drama.title}
          </h1>

          {/* ── Synopsis ─────────────────────────────────────────────── */}
          <p
            className="hero-synopsis-v5 hero-fade-in"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            {drama.synopsis}
          </p>

          {/* ── Glass Metadata Panel ─────────────────────────────────── */}
          <div
            className="hero-glass-panel hero-fade-in"
            style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
          >
            {/* Rating */}
            <div className="hero-meta-item">
              <svg width="13" height="13" viewBox="0 0 10 10" fill="rgba(255,255,255,0.9)">
                <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
              </svg>
              <span className="hero-meta-value">{drama.rating.toFixed(1)}</span>
            </div>
            <div className="hero-meta-divider" />
            {/* Genre */}
            <span className="hero-meta-label">{drama.genres[0]}</span>
            <div className="hero-meta-divider" />
            {/* Episodes */}
            <span className="hero-meta-label">{drama.totalEpisodes}부작</span>
            <div className="hero-meta-divider" />
            {/* Views */}
            {drama.views !== undefined && (
              <>
                <div className="flex items-center gap-1">
                  <Eye size={11} className="text-white/50" />
                  <span className="hero-meta-label">
                    {drama.views >= 10000
                      ? `${(drama.views / 10000).toFixed(1)}만`
                      : drama.views.toLocaleString()}
                  </span>
                </div>
                <div className="hero-meta-divider" />
              </>
            )}
            {/* Year + Age */}
            <span className="hero-meta-label">{drama.year}</span>
            <span className="hero-age-badge">{drama.ageRating}</span>
          </div>

          {/* ── Genre tags ──────────────────────────────────────────── */}
          <div
            className="flex flex-wrap gap-1.5 mb-6 md:mb-8 hero-fade-in"
            style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
          >
            {drama.genres.map((g) => (
              <span key={g} className="hero-genre-tag">{g}</span>
            ))}
          </div>

          {/* ── Action Buttons ───────────────────────────────────────── */}
          <div
            className="hero-actions-v5 hero-fade-in"
            style={{ animationDelay: "360ms", animationFillMode: "backwards" }}
          >
            <button
              onClick={() => {
                const firstEp = drama.episodes[0];
                if (firstEp) navigate(`/watch/${drama.id}/${firstEp.id}`);
                else navigate(`/drama/${drama.id}`);
              }}
              className="hero-btn-play"
            >
              <Play size={20} className="fill-black" />
              <span>재생</span>
            </button>

            <button
              onClick={() => navigate(`/drama/${drama.id}`)}
              className="hero-btn-info"
            >
              <Info size={18} />
              <span className="hidden sm:inline">상세보기</span>
              <span className="sm:hidden">정보</span>
            </button>

            <button aria-label="찜하기" className="hero-btn-icon hidden sm:flex">
              <Plus size={18} />
            </button>

            <button
              onClick={() => setMuted((m) => !m)}
              aria-label="음소거 토글"
              className="hero-btn-icon ml-auto"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide Indicators ─────────────────────────────────────────── */}
      <div className="absolute bottom-4 md:bottom-7 right-5 md:right-14 flex items-center gap-2">
        {dramas.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={`relative h-[2px] rounded-full overflow-hidden transition-all duration-300 ${
              i === index ? "w-10 md:w-14 bg-white/15" : "w-3 md:w-4 bg-white/20 hover:bg-white/35"
            }`}
          >
            {i === index && !paused && (
              <span
                key={`${drama.id}-${i}`}
                className="absolute inset-0 bg-white origin-left animate-[hero-progress_7s_linear_forwards]"
              />
            )}
            {i === index && paused && <span className="absolute inset-0 bg-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}
