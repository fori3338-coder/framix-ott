/**
 * FramixOriginalStrip — FRAMIX ORIGINAL 전용 (full rebuild)
 *
 * 브랜드 구분 극대화: 일반 Row 형태 금지. 로즈 글로우 프레임의 와이드
 * 시네마 패널 + 하단 썸네일 셀렉터. "FRAMIX ORIGINAL" 전용 아이덴티티.
 * 기능 유지: 자동 전환 / 재생·상세 이동 / 찜 / 독점 배지.
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Drama } from "../types";
import { useFavorites } from "../hooks/useFavorites";

interface FramixOriginalStripProps {
  dramas: Drama[];
}

export default function FramixOriginalStrip({ dramas }: FramixOriginalStripProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const count = Math.min(dramas.length, 6);
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % count), 6500);
    return () => clearInterval(t);
  }, [count]);

  if (dramas.length === 0) return null;

  const items = dramas.slice(0, 6);
  const active = items[activeIdx];

  return (
    <section ref={sectionRef} className={`fxo-section ${revealed ? "in" : ""}`}>
      {/* Brand header */}
      <div className="fxo-head">
        <div className="fxo-brand">
          <span className="fxo-brand-f">F</span>
          <div className="fxo-brand-txt">
            <span className="fxo-brand-name">FRAMIX</span>
            <span className="fxo-brand-orig">ORIGINAL</span>
          </div>
        </div>
        <div className="fxo-head-meta">
          <Sparkles size={13} className="fxo-spark" />
          <span>오직 FRAMIX에서만</span>
        </div>
      </div>

      {/* Feature panel */}
      <div className="fxo-stage">
        <div className="fxo-panel">
          <div className="fxo-bg">
            {items.map((d, i) => (
              <img
                key={d.id}
                src={d.backdrop || d.poster}
                alt={d.title}
                loading="lazy"
                className="fxo-bg-img"
                style={{ opacity: i === activeIdx ? 1 : 0 }}
              />
            ))}
          </div>
          <div className="fxo-scrim" />

          <ActiveDramaInfo drama={active} />

          {items.length > 1 && (
            <>
              <button className="fxo-arrow fxo-arrow-l" onClick={() => setActiveIdx((i) => (i - 1 + items.length) % items.length)} aria-label="이전">
                <ChevronLeft size={18} />
              </button>
              <button className="fxo-arrow fxo-arrow-r" onClick={() => setActiveIdx((i) => (i + 1) % items.length)} aria-label="다음">
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail selector */}
        {items.length > 1 && (
          <div className="fxo-thumbs">
            {items.map((d, i) => (
              <button
                key={d.id}
                className={`fxo-thumb ${i === activeIdx ? "active" : ""}`}
                onClick={() => setActiveIdx(i)}
                aria-label={d.title}
              >
                <img src={d.backdrop || d.poster} alt={d.title} loading="lazy" />
                <span className="fxo-thumb-grad" />
                <span className="fxo-thumb-name">{d.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fxo-section{position:relative;padding:clamp(34px,5vw,60px) clamp(20px,6vw,118px)}
        @media(max-width:680px){.fxo-section{padding:24px 14px}}
        .fxo-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px}
        @media(max-width:680px){.fxo-head{margin-bottom:14px}}
        .fxo-brand{display:flex;align-items:center;gap:13px}
        .fxo-brand-f{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;
          background:linear-gradient(135deg,#ff3e6c,#b1163f);color:#fff;font-weight:900;font-size:22px;
          box-shadow:0 8px 22px -4px rgba(255,62,108,.6)}
        .fxo-brand-txt{display:flex;flex-direction:column;line-height:1}
        .fxo-brand-name{font-size:clamp(20px,2.6vw,30px);font-weight:900;color:#fff;letter-spacing:.02em}
        .fxo-brand-orig{font-size:clamp(11px,1.3vw,13px);font-weight:800;letter-spacing:.42em;
          color:#ff6d8c;margin-top:2px}
        .fxo-head-meta{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;
          color:rgba(255,255,255,.5);padding:6px 13px;border-radius:999px;
          background:rgba(255,62,108,.08);border:1px solid rgba(255,62,108,.22)}
        .fxo-spark{color:#ff6d8c}

        .fxo-stage{opacity:0}
        .fxo-section.in .fxo-stage{animation:fxoIn .6s cubic-bezier(.22,1,.36,1) both}
        @keyframes fxoIn{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}

        .fxo-panel{position:relative;border-radius:22px;overflow:hidden;
          min-height:clamp(260px,44vw,460px);
          box-shadow:0 40px 100px -28px rgba(0,0,0,.9);
          border:1px solid rgba(255,62,108,.24)}
        @media(max-width:680px){.fxo-panel{border-radius:16px;min-height:clamp(220px,80vw,320px)}}
        .fxo-panel::after{content:"";position:absolute;inset:0;border-radius:22px;pointer-events:none;
          box-shadow:inset 0 0 60px -10px rgba(255,62,108,.22)}
        .fxo-bg{position:absolute;inset:0}
        .fxo-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .8s ease}
        .fxo-scrim{position:absolute;inset:0;
          background:linear-gradient(to right,rgba(7,8,11,.95) 0%,rgba(7,8,11,.6) 42%,rgba(7,8,11,.05) 100%),
            linear-gradient(to top,rgba(7,8,11,.75),transparent 55%)}

        .fxo-info{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;
          height:100%;min-height:clamp(260px,44vw,460px);max-width:560px;padding:clamp(22px,4vw,52px)}
        @media(max-width:680px){.fxo-info{min-height:clamp(220px,80vw,320px);padding:16px;max-width:100%}}
        .fxo-verified{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;margin-bottom:13px;
          font-size:11px;font-weight:900;letter-spacing:.16em;color:#fff;padding:5px 13px 5px 5px;border-radius:999px;
          background:linear-gradient(135deg,rgba(255,62,108,.92),rgba(177,22,63,.88));border:1px solid rgba(255,109,140,.6);
          box-shadow:0 8px 22px -8px rgba(255,62,108,.7)}
        .fxo-verified-f{display:grid;place-items:center;width:19px;height:19px;border-radius:6px;background:#fff;
          color:#e0214f;font-size:12px;font-weight:900;letter-spacing:0}
        .fxo-verified-ko{letter-spacing:.05em}
        .fxo-exclusive{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;margin-bottom:14px;
          font-size:11px;font-weight:900;letter-spacing:.14em;color:#ff6d8c;padding:5px 11px;border-radius:7px;
          background:rgba(255,62,108,.15);border:1px solid rgba(255,62,108,.35)}
        .fxo-title{font-size:clamp(1.7rem,4.4vw,3rem);font-weight:900;color:#fff;line-height:1.04;
          letter-spacing:-.02em;margin:0 0 14px;text-shadow:0 4px 24px rgba(0,0,0,.7)}
        @media(max-width:680px){.fxo-title{font-size:clamp(1.3rem,6vw,1.8rem);margin-bottom:8px}}
        .fxo-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;
          font-size:13px;color:rgba(255,255,255,.62)}
        .fxo-star{display:inline-flex;align-items:center;gap:4px;color:#ffd34d;font-weight:800}
        .fxo-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.35)}
        .fxo-syn{display:none;font-size:14px;line-height:1.6;color:rgba(255,255,255,.6);margin:0 0 22px;
          max-width:44ch;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        @media(min-width:768px){.fxo-syn{display:-webkit-box}}
        .fxo-actions{display:flex;align-items:center;gap:12px}
        .fxo-play{display:inline-flex;align-items:center;gap:9px;height:48px;padding:0 24px;border:0;border-radius:12px;
          cursor:pointer;font-size:14px;font-weight:800;color:#fff;
          background:linear-gradient(180deg,#ff4e78,#e0214f);box-shadow:0 10px 26px -6px rgba(255,62,108,.6)}
        .fxo-play:hover{transform:translateY(-2px)}
        .fxo-fav{width:48px;height:48px;display:grid;place-items:center;border-radius:12px;cursor:pointer;color:#fff;
          background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(12px)}
        .fxo-fav.on{background:rgba(255,62,108,.22);border-color:#ff3e6c;color:#ff7d9c}
        .fxo-detail{font-size:13px;color:rgba(255,255,255,.55);background:none;border:0;cursor:pointer;
          text-decoration:underline;text-underline-offset:3px}
        .fxo-detail:hover{color:#fff}

        .fxo-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:42px;height:42px;border-radius:50%;
          display:grid;place-items:center;cursor:pointer;color:#fff;
          background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(14px);transition:all .2s ease}
        .fxo-arrow:hover{background:rgba(0,0,0,.8);border-color:rgba(255,62,108,.6)}
        .fxo-arrow-l{left:14px}.fxo-arrow-r{right:14px}
        @media(max-width:768px){.fxo-arrow{display:none}}

        .fxo-thumbs{display:flex;gap:11px;margin-top:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
        .fxo-thumbs::-webkit-scrollbar{display:none}
        .fxo-thumb{position:relative;flex:0 0 auto;width:clamp(120px,17vw,180px);aspect-ratio:16/9;
          border-radius:12px;overflow:hidden;cursor:pointer;border:0;padding:0;opacity:.6;
          transition:all .3s cubic-bezier(.22,1,.36,1)}
        .fxo-thumb img{width:100%;height:100%;object-fit:cover}
        .fxo-thumb.active{opacity:1;outline:2px solid #ff3e6c;transform:translateY(-4px);
          box-shadow:0 14px 30px -10px rgba(255,62,108,.55)}
        .fxo-thumb-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.8),transparent 60%)}
        .fxo-thumb-name{position:absolute;left:8px;right:8px;bottom:6px;font-size:11px;font-weight:700;color:#fff;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
        @media(max-width:680px){
          .fxo-thumb{width:clamp(90px,28vw,130px);border-radius:9px}
          .fxo-play{height:40px;padding:0 16px;font-size:13px}
          .fxo-fav{width:40px;height:40px}
        }
      `}</style>
    </section>
  );
}

function ActiveDramaInfo({ drama }: { drama: Drama }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const firstEpisodeId = drama.episodes[0]?.id;

  const handlePlay = () => {
    if (firstEpisodeId) navigate(`/watch/${drama.id}/${firstEpisodeId}`);
    else navigate(`/drama/${drama.id}`);
  };

  return (
    <div className="fxo-info" key={drama.id} style={{ animation: "fxoIn .55s cubic-bezier(.22,1,.36,1) both" }}>
      <span className="fxo-verified">
        <span className="fxo-verified-f">F</span>
        FRAMIX ORIGINAL
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="fxo-verified-ko">인증</span>
      </span>
      {drama.isExclusive && (
        <span className="fxo-exclusive"><Sparkles size={10} /> 독점 공개</span>
      )}
      <h3 className="fxo-title">{drama.title}</h3>
      <div className="fxo-meta">
        <span className="fxo-star">★ {drama.rating.toFixed(1)}</span>
        <span className="fxo-dot" />
        <span>{drama.totalEpisodes}부작</span>
        {drama.genres.slice(0, 2).map((g) => (
          <span key={g}><span className="fxo-dot" style={{ display: "inline-block", marginRight: 8 }} />{g}</span>
        ))}
      </div>
      {drama.synopsis && <p className="fxo-syn">{drama.synopsis}</p>}
      <div className="fxo-actions">
        <button className="fxo-play" onClick={handlePlay}>
          <Play size={14} className="fill-white" strokeWidth={0} /> 지금 시청
        </button>
        <button
          className={`fxo-fav ${favorited ? "on" : ""}`}
          onClick={() => toggleFavorite(drama.id)}
          aria-label={favorited ? "찜 해제" : "보관함 추가"}
        >
          {favorited ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
        </button>
        <button className="fxo-detail" onClick={() => navigate(`/drama/${drama.id}`)}>상세보기</button>
      </div>
    </div>
  );
}
