/**
 * HeroBanner — FRAMIX Spotlight Hero (full rebuild)
 *
 * FRAMIX 전용 시네마틱 Hero. Netflix/Disney+ 복제 아님.
 * - 풀블리드 backdrop + (있으면) bannerVideoUrl 자동재생 비디오 유지
 * - 좌측 세로 브랜드 레일 "FRAMIX SPOTLIGHT"
 * - 하단 정렬 에디토리얼 타이틀 + 로즈 글로우 CTA
 * - 우측 하단 필름스트립 썸네일 셀렉터(번호/진행 표시)
 * 기능 유지: 슬라이드 자동전환 / 찜 / 음소거 / 재생·상세 네비게이션
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Plus, Check, Volume2, VolumeX } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface HeroBannerProps {
  dramas: Drama[];
}

const SLIDE_MS = 8000;

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (paused || dramas.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % dramas.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [dramas.length, paused]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, index]);

  const drama = dramas[index];
  if (!drama) return null;

  const firstEpisodeId = drama.episodes[0]?.id;
  const isFav = isFavorite(drama.id);
  const heroVideo = drama.bannerVideoUrl || undefined;

  const goPlay = () => {
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };

  return (
    <section
      className="fxh-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* ── Media Layer ─────────────────────────────────────── */}
      <div className="fxh-media">
        {dramas.map((d, i) => (
          <div key={d.id} className="fxh-slide" style={{ opacity: i === index ? 1 : 0 }}>
            <img
              src={d.backdrop}
              alt={d.title}
              className={`fxh-img ${i === index ? "fxh-img-active" : ""}`}
            />
          </div>
        ))}
        {/* Hero Video (유지) — bannerVideoUrl 존재 시 backdrop 위에 재생 */}
        {heroVideo && (
          <video
            ref={videoRef}
            key={heroVideo}
            className="fxh-video"
            src={heroVideo}
            autoPlay
            loop
            muted={muted}
            playsInline
          />
        )}
      </div>

      {/* ── Cinematic scrims ─────────────────────────────────── */}
      <div className="fxh-scrim-bottom" />
      <div className="fxh-scrim-left" />
      <div className="fxh-scrim-top" />

      {/* ── Vertical brand rail ──────────────────────────────── */}
      <div className="fxh-rail">
        <span className="fxh-rail-dot" />
        <span className="fxh-rail-text">FRAMIX&nbsp;&nbsp;SPOTLIGHT</span>
        <span className="fxh-rail-line" />
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="fxh-content" key={drama.id}>
        {drama.isOriginal && (
          <div className="fxh-orig fxh-anim" style={{ animationDelay: "40ms" }}>
            <span className="fxh-orig-mark">F</span>
            FRAMIX ORIGINAL
          </div>
        )}

        <h1 className="fxh-title fxh-anim" style={{ animationDelay: "90ms" }}>
          {drama.title}
        </h1>

        <div className="fxh-meta fxh-anim" style={{ animationDelay: "160ms" }}>
          <span className="fxh-rating">
            <svg width="13" height="13" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 0.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L5 6.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4z" />
            </svg>
            {drama.rating.toFixed(1)}
          </span>
          <span className="fxh-pill">{drama.ageRating}</span>
          {drama.genres[0] && <span className="fxh-meta-txt">{drama.genres[0]}</span>}
          <span className="fxh-sep" />
          <span className="fxh-meta-txt">{drama.totalEpisodes}부작</span>
          {drama.year ? (
            <>
              <span className="fxh-sep" />
              <span className="fxh-meta-txt fxh-dim">{drama.year}</span>
            </>
          ) : null}
        </div>

        <p className="fxh-desc fxh-anim" style={{ animationDelay: "230ms" }}>
          {drama.synopsis}
        </p>

        <div className="fxh-actions fxh-anim" style={{ animationDelay: "300ms" }}>
          <button onClick={goPlay} className="fxh-btn-play">
            <Play size={20} className="fill-black" strokeWidth={0} />
            지금 재생
          </button>
          <button onClick={() => navigate(`/drama/${drama.id}`)} className="fxh-btn-glass">
            <Info size={18} strokeWidth={2} />
            상세 정보
          </button>
          <button
            onClick={() => toggleFavorite(drama.id)}
            className={`fxh-btn-icon ${isFav ? "is-on" : ""}`}
            aria-label={isFav ? "찜 해제" : "찜"}
          >
            {isFav ? <Check size={18} strokeWidth={3} /> : <Plus size={19} strokeWidth={2.2} />}
          </button>
          {heroVideo && (
            <button
              onClick={() => setMuted((m) => !m)}
              className="fxh-btn-icon"
              aria-label={muted ? "음소거 해제" : "음소거"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Filmstrip selector ───────────────────────────────── */}
      {dramas.length > 1 && (
        <div className="fxh-strip">
          {dramas.map((d, i) => (
            <button
              key={d.id}
              className={`fxh-strip-item ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}. ${d.title}`}
            >
              <img src={d.poster || d.backdrop} alt={d.title} />
              <span className="fxh-strip-rank">{String(i + 1).padStart(2, "0")}</span>
              {i === index && !paused && (
                <span
                  className="fxh-strip-prog"
                  style={{ animationDuration: `${SLIDE_MS}ms` }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .fxh-root{position:relative;width:100%;height:clamp(560px,86vh,920px);overflow:hidden;background:#06070a;isolation:isolate}
        @media(max-width:860px){.fxh-root{height:clamp(380px,74vh,560px)}}
        .fxh-media{position:absolute;inset:0}
        .fxh-slide{position:absolute;inset:0;transition:opacity 1200ms ease}
        .fxh-img{width:100%;height:100%;object-fit:cover;transform-origin:center}
        .fxh-img-active{animation:fxhKen 16s ease-out forwards}
        @keyframes fxhKen{from{transform:scale(1.08)}to{transform:scale(1.16)}}
        .fxh-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
        .fxh-scrim-bottom{position:absolute;inset:0;z-index:2;pointer-events:none;
          background:linear-gradient(to top,#06070a 2%,rgba(6,7,10,.78) 24%,rgba(6,7,10,.18) 52%,transparent 78%)}
        .fxh-scrim-left{position:absolute;inset:0;z-index:2;pointer-events:none;
          background:linear-gradient(to right,rgba(6,7,10,.92) 0%,rgba(6,7,10,.45) 38%,transparent 68%)}
        .fxh-scrim-top{position:absolute;inset:0;z-index:2;pointer-events:none;
          background:linear-gradient(to bottom,rgba(6,7,10,.6) 0%,transparent 18%)}

        .fxh-rail{position:absolute;left:clamp(20px,3.4vw,54px);top:clamp(96px,16vh,160px);z-index:5;
          display:flex;flex-direction:column;align-items:center;gap:14px;pointer-events:none}
        .fxh-rail-dot{width:9px;height:9px;border-radius:50%;background:#ff3e6c;box-shadow:0 0 16px 3px rgba(255,62,108,.7)}
        .fxh-rail-text{writing-mode:vertical-rl;font-size:11px;font-weight:800;letter-spacing:.32em;color:rgba(255,255,255,.62);text-transform:uppercase}
        .fxh-rail-line{width:1px;height:70px;background:linear-gradient(to bottom,rgba(255,62,108,.6),transparent)}
        @media(max-width:860px){.fxh-rail{display:none}}

        .fxh-content{position:absolute;left:clamp(20px,6vw,118px);bottom:clamp(118px,16vh,176px);z-index:6;
          width:min(620px,86vw)}
        @media(max-width:860px){.fxh-content{left:16px;right:16px;width:auto;bottom:clamp(80px,14vw,120px)}}
        .fxh-orig{display:inline-flex;align-items:center;gap:9px;margin-bottom:16px;
          font-size:11px;font-weight:900;letter-spacing:.26em;color:#ff5c80}
        .fxh-orig-mark{display:grid;place-items:center;width:20px;height:20px;border-radius:6px;
          background:linear-gradient(135deg,#ff3e6c,#c4204a);color:#fff;font-weight:900;font-size:12px;
          box-shadow:0 4px 14px rgba(255,62,108,.5)}
        .fxh-title{font-size:clamp(2.6rem,6.6vw,5.4rem);line-height:.96;font-weight:900;color:#fff;
          letter-spacing:-.03em;margin:0 0 18px;text-shadow:0 6px 40px rgba(0,0,0,.65);max-width:13ch}
        @media(max-width:860px){.fxh-title{font-size:clamp(1.8rem,7.5vw,2.6rem);margin-bottom:10px}}
        .fxh-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        .fxh-rating{display:inline-flex;align-items:center;gap:5px;font-weight:800;font-size:14px;color:#ffd34d}
        .fxh-pill{font-size:11px;font-weight:800;color:rgba(255,255,255,.85);
          border:1px solid rgba(255,255,255,.28);border-radius:5px;padding:2px 7px}
        .fxh-meta-txt{font-size:14px;font-weight:600;color:rgba(255,255,255,.78)}
        .fxh-dim{color:rgba(255,255,255,.5)}
        .fxh-sep{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.32)}
        .fxh-desc{font-size:clamp(14px,1.15vw,16px);line-height:1.6;color:rgba(255,255,255,.74);
          margin:0 0 28px;max-width:50ch;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        @media(max-width:640px){.fxh-desc{-webkit-line-clamp:2}}
        .fxh-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        @media(max-width:860px){.fxh-meta{gap:8px;margin-bottom:10px}}
        .fxh-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        @media(max-width:860px){.fxh-actions{gap:8px}}
        .fxh-btn-play{display:inline-flex;align-items:center;gap:10px;height:54px;padding:0 30px;border:0;
          border-radius:14px;font-size:16px;font-weight:800;color:#0a0a0c;cursor:pointer;
          background:linear-gradient(180deg,#fff,#ececec);
          box-shadow:0 10px 34px rgba(255,62,108,.34),0 2px 0 rgba(255,255,255,.5) inset;
          transition:transform .18s ease,box-shadow .18s ease}
        @media(max-width:860px){.fxh-btn-play{height:44px;padding:0 20px;font-size:14px;border-radius:11px}}
        .fxh-btn-play:hover{transform:translateY(-2px);box-shadow:0 16px 44px rgba(255,62,108,.5)}
        .fxh-btn-play:active{transform:translateY(0) scale(.98)}
        .fxh-btn-glass{display:inline-flex;align-items:center;gap:9px;height:54px;padding:0 24px;border-radius:14px;
          font-size:15px;font-weight:700;color:#fff;cursor:pointer;
          background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:all .18s ease}
        @media(max-width:860px){.fxh-btn-glass{height:44px;padding:0 16px;font-size:13px;border-radius:11px}}
        .fxh-btn-glass:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.4)}
        .fxh-btn-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:14px;cursor:pointer;
          color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:all .18s ease}
        @media(max-width:860px){.fxh-btn-icon{width:44px;height:44px;border-radius:11px}}
        .fxh-btn-icon:hover{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.4)}
        .fxh-btn-icon.is-on{background:rgba(255,62,108,.22);border-color:#ff3e6c;color:#ff7d9c}

        .fxh-strip{position:absolute;right:clamp(16px,3vw,54px);bottom:clamp(28px,5vh,54px);z-index:6;
          display:flex;gap:10px;max-width:60vw;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
        .fxh-strip::-webkit-scrollbar{display:none}
        .fxh-strip-item{position:relative;flex:0 0 auto;width:clamp(64px,7vw,92px);aspect-ratio:2/3;
          border-radius:11px;overflow:hidden;cursor:pointer;border:0;padding:0;
          opacity:.55;filter:grayscale(.3);transition:all .3s cubic-bezier(.22,1,.36,1)}
        .fxh-strip-item img{width:100%;height:100%;object-fit:cover}
        .fxh-strip-item.is-active{opacity:1;filter:none;outline:2px solid #ff3e6c;outline-offset:0;
          transform:translateY(-6px);box-shadow:0 14px 30px -8px rgba(255,62,108,.55)}
        .fxh-strip-rank{position:absolute;top:5px;left:6px;font-size:11px;font-weight:900;color:#fff;
          text-shadow:0 1px 4px rgba(0,0,0,.9)}
        .fxh-strip-prog{position:absolute;left:0;bottom:0;height:3px;width:100%;background:#ff3e6c;
          transform-origin:left;animation:fxhProg linear forwards}
        @keyframes fxhProg{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @media(max-width:860px){
          .fxh-strip{max-width:92vw;right:16px;bottom:16px;gap:7px}
          .fxh-strip-item{width:clamp(46px,12vw,60px);border-radius:8px}
          .fxh-strip-item.is-active{transform:translateY(-3px)}
        }

        .fxh-anim{opacity:0;animation:fxhUp .6s cubic-bezier(.22,1,.36,1) both}
        @keyframes fxhUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </section>
  );
}
