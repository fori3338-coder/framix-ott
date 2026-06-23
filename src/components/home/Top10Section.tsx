/**
 * Top10Section — FRAMIX 실시간 TOP 10 (full rebuild)
 *
 * 순위 존재감 극대화: 카드 좌측에 거대한 메탈릭 순위 숫자가 포스터를
 * 파고드는 새 카드 구조. 데스크탑/모바일 공통 가로 스크롤 레일.
 * TOP3 골드/실버/브론즈 메탈릭 유지.
 * 기능 유지: 작품 이동 / 재생 / 찜.
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Play, Plus, Check } from "lucide-react";
import type { Drama } from "../../types";
import { useFavorites } from "../../hooks/useFavorites";

// CMD-05: 순위 변동 목업 데이터 (mock — 실제 DB 연동 전 표시용)
type RankChange = "up" | "down" | "new" | "same";
const RANK_CHANGES: RankChange[] = [
  "same", "up", "new", "down", "up", "new", "down", "up", "same", "down",
];
const RANK_DELTAS: number[] = [0, 2, 0, 1, 3, 0, 2, 1, 0, 3];

interface Top10SectionProps {
  dramas: Drama[];
}

export default function Top10Section({ dramas }: Top10SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (dramas.length === 0) return null;
  const items = dramas.slice(0, 10);

  return (
    <section ref={sectionRef} className="fxt-section">
      <div className="fxt-head">
        <div className="fxt-head-left">
          <span className="fxt-bar" />
          <div>
            <div className="fxt-title-row">
              <h2 className="fxt-title">실시간 TOP 10</h2>
              <span className="fxt-hot"><Flame size={10} /> HOT</span>
            </div>
            <p className="fxt-sub">오늘 가장 많이 본 작품</p>
          </div>
        </div>
      </div>

      <div className="fxt-rail-wrap">
        <div className="fxt-rail">
          {items.map((drama, i) => (
            <Top10Card
              key={drama.id}
              drama={drama}
              rank={i + 1}
              revealed={revealed}
              index={i}
              rankChange={RANK_CHANGES[i] ?? "same"}
              rankDelta={RANK_DELTAS[i] ?? 0}
            />
          ))}
        </div>
      </div>

      <style>{`
        .fxt-section{position:relative;padding:clamp(34px,5vw,60px) 0}
        .fxt-head{display:flex;align-items:center;justify-content:space-between;
          padding:0 clamp(20px,6vw,118px);margin-bottom:22px}
        .fxt-head-left{display:flex;align-items:center;gap:14px}
        .fxt-bar{width:4px;height:38px;border-radius:4px;background:linear-gradient(to bottom,#ff3e6c,#b91c45);
          box-shadow:0 0 18px rgba(255,62,108,.45)}
        .fxt-title-row{display:flex;align-items:center;gap:10px}
        .fxt-title{font-size:clamp(20px,2.4vw,28px);font-weight:900;color:#fff;letter-spacing:-.02em;margin:0}
        .fxt-hot{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:900;letter-spacing:.1em;
          padding:3px 9px;border-radius:999px;color:#ff6d8c;background:rgba(255,62,108,.14);border:1px solid rgba(255,62,108,.3)}
        .fxt-sub{margin:3px 0 0;font-size:13px;color:rgba(255,255,255,.45)}

        .fxt-rail-wrap{position:relative}
        .fxt-rail{display:flex;gap:clamp(34px,4vw,56px);overflow-x:auto;scroll-snap-type:x mandatory;
          padding:14px clamp(20px,6vw,118px) 30px;scrollbar-width:none}
        .fxt-rail::-webkit-scrollbar{display:none}

        .fxt-card{position:relative;flex:0 0 auto;display:flex;align-items:flex-end;cursor:pointer;
          scroll-snap-align:start;opacity:0}
        .fxt-card.in{animation:fxtIn .5s cubic-bezier(.22,1,.36,1) both}
        @keyframes fxtIn{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}

        .fxt-num{font-weight:900;line-height:.74;letter-spacing:-.06em;
          font-size:clamp(110px,15vw,210px);
          -webkit-text-stroke:2px rgba(255,255,255,.22);color:transparent;
          margin-right:clamp(-26px,-2.4vw,-44px);position:relative;z-index:1;user-select:none;
          font-family:"Arial Black",Helvetica,sans-serif}
        .fxt-num.gold{-webkit-text-stroke:0;background:linear-gradient(160deg,#fff3c4,#ffd700 35%,#b8860b 70%,#ffd700);
          -webkit-background-clip:text;background-clip:text;
          filter:drop-shadow(0 0 20px rgba(255,215,0,.45))}
        .fxt-num.silver{-webkit-text-stroke:0;background:linear-gradient(160deg,#fff,#d8d8d8 40%,#9a9a9a 70%,#eee);
          -webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 12px rgba(220,220,220,.35))}
        .fxt-num.bronze{-webkit-text-stroke:0;background:linear-gradient(160deg,#f0c08a,#cd7f32 45%,#8a5320 75%,#e8a866);
          -webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 12px rgba(205,127,50,.35))}

        .fxt-poster{position:relative;z-index:2;width:clamp(132px,16vw,184px);aspect-ratio:2/3;
          border-radius:14px;overflow:hidden;background:#141519;
          box-shadow:0 18px 44px -14px rgba(0,0,0,.8);
          transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s ease}
        .fxt-card:hover .fxt-poster{transform:translateY(-8px) scale(1.03);
          box-shadow:0 30px 60px -16px rgba(0,0,0,.9),0 0 0 1px rgba(255,62,108,.4)}
        .fxt-poster img{width:100%;height:100%;object-fit:cover}
        .fxt-poster-fallback{width:100%;height:100%;display:grid;place-items:center;text-align:center;
          padding:8px;color:rgba(255,255,255,.4);font-size:12px}
        .fxt-rim{position:absolute;top:0;left:0;right:0;height:3px}
        .fxt-rim.gold{background:linear-gradient(to right,#ffd700,transparent)}
        .fxt-rim.silver{background:linear-gradient(to right,#dcdcdc,transparent)}
        .fxt-rim.bronze{background:linear-gradient(to right,#cd7f32,transparent)}

        .fxt-overlay{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:flex-end;
          gap:8px;padding:12px;opacity:0;
          background:linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.1) 60%,transparent);
          transition:opacity .26s ease}
        .fxt-card:hover .fxt-overlay{opacity:1}
        .fxt-ov-actions{display:flex;align-items:center;gap:8px}
        .fxt-play{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;
          border:0;border-radius:9px;background:#fff;color:#0a0a0c;font-size:12px;font-weight:800;cursor:pointer}
        .fxt-fav{width:34px;height:34px;flex:0 0 auto;display:grid;place-items:center;border-radius:9px;cursor:pointer;
          background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);color:#fff}
        .fxt-fav.on{background:rgba(255,62,108,.25);border-color:#ff3e6c;color:#ff7d9c}

        .fxt-info{position:relative;z-index:2;margin-left:14px;padding-bottom:14px;width:clamp(132px,16vw,184px)}
        .fxt-name{font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fxt-name-meta{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11px;color:rgba(255,255,255,.45)}
        .fxt-star{color:#ffd34d}

        .fxt-rank-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;
          letter-spacing:.06em;padding:2px 6px;border-radius:999px;margin-top:5px}
        .fxt-rank-badge.up{background:rgba(34,197,94,.18);color:#4ade80;border:1px solid rgba(34,197,94,.3)}
        .fxt-rank-badge.down{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.28)}
        .fxt-rank-badge.new{background:rgba(99,102,241,.2);color:#a5b4fc;border:1px solid rgba(99,102,241,.3)}
      `}</style>
    </section>
  );
}

function Top10Card({ drama, rank, revealed, index, rankChange, rankDelta }: { drama: Drama; rank: number; revealed: boolean; index: number; rankChange: RankChange; rankDelta: number }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(drama.id);
  const [imgErr, setImgErr] = useState(false);
  const firstEp = drama.episodes[0]?.id;

  const tier = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";

  return (
    <div
      className={`fxt-card ${revealed ? "in" : ""}`}
      style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
      onClick={() => navigate(`/drama/${drama.id}`)}
    >
      <span className={`fxt-num ${tier}`}>{rank}</span>

      <div>
        <div className="fxt-poster">
          {!imgErr ? (
            <img src={drama.poster || drama.backdrop} alt={drama.title} loading="lazy" onError={() => setImgErr(true)} />
          ) : (
            <div className="fxt-poster-fallback">{drama.title}</div>
          )}
          {tier && <span className={`fxt-rim ${tier}`} />}

          <div className="fxt-overlay">
            <div className="fxt-ov-actions">
              <button
                className="fxt-play"
                onClick={(e) => { e.stopPropagation(); if (firstEp) navigate(`/watch/${drama.id}/${firstEp}`); else navigate(`/drama/${drama.id}`); }}
              >
                <Play size={12} className="fill-black" strokeWidth={0} /> 재생
              </button>
              <button
                className={`fxt-fav ${favorited ? "on" : ""}`}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(drama.id); }}
                aria-label={favorited ? "찜 해제" : "찜"}
              >
                {favorited ? <Check size={14} strokeWidth={3} /> : <Plus size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="fxt-info">
          <p className="fxt-name">{drama.title}</p>
          <div className="fxt-name-meta">
            <span className="fxt-star">★ {drama.rating.toFixed(1)}</span>
            <span>·</span>
            <span>{drama.totalEpisodes}부작</span>
          </div>
          {/* CMD-05: 순위 변동 배지 */}
          {rankChange === "new" && (
            <div className="fxt-rank-badge new">NEW</div>
          )}
          {rankChange === "up" && rankDelta > 0 && (
            <div className="fxt-rank-badge up">▲ {rankDelta}</div>
          )}
          {rankChange === "down" && rankDelta > 0 && (
            <div className="fxt-rank-badge down">▼ {rankDelta}</div>
          )}
        </div>
      </div>
    </div>
  );
}
