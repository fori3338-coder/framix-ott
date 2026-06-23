/**
 * ContinueWatchingRow — FRAMIX 이어보기 (full rebuild)
 *
 * 이어보기 경험 중심 재설계: 와이드 16:9 카드 + 큰 잔여 진행률 표시 +
 * 두드러진 "이어보기" 레쥼 바. 가로 스크롤 / 좌우 네비게이션 유지.
 * 기능 유지: supabase watch_history 삭제 / onRemove / 재생 이동.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { ContinueWatchingItem } from "../types";
import { supabase } from "../lib/supabase";

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function formatLastWatched(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "방금 시청";
  if (diffMin < 60) return `${diffMin}분 전 시청`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전 시청`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "어제 시청";
  return `${diffDay}일 전 시청`;
}

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onRemove?: (episodeId: string) => void;
}

export default function ContinueWatchingRow({ items, onRemove }: ContinueWatchingRowProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [revealed, setRevealed] = useState(false);

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

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [items.length, updateScroll]);

  const scrollBy = (amount: number) => scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  const handleRemove = async (e: React.MouseEvent, item: ContinueWatchingItem) => {
    e.stopPropagation();
    onRemove?.(item.episodeId);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (uid) {
      await supabase.from("watch_history").delete().eq("user_id", uid).eq("episode_id", item.episodeId);
    }
  };

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="fxc-section">
      <div className="fxc-head">
        <div className="fxc-head-left">
          <span className="fxc-bar" />
          <div>
            <div className="fxc-title-row">
              <h2 className="fxc-title">이어보기</h2>
              <span className="fxc-tag"><RotateCcw size={11} /> 계속 시청</span>
            </div>
            <p className="fxc-sub">중단한 지점부터 바로 이어서 감상하세요</p>
          </div>
        </div>
        <div className="fxc-nav">
          <button onClick={() => scrollBy(-840)} disabled={!canPrev} className="fxc-nav-btn" aria-label="이전">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scrollBy(840)} disabled={!canNext} className="fxc-nav-btn" aria-label="다음">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="fxc-rail-wrap">
        <div className="fxc-fade-l" />
        <div className="fxc-fade-r" />
        <div ref={scrollRef} className="fxc-rail">
          {items.map((item, idx) => (
            <ContinueWatchingCard
              key={item.episodeId}
              item={item}
              idx={idx}
              revealed={revealed}
              onPlay={() => navigate(`/watch/${item.dramaId}/${item.episodeId}`)}
              onRemove={(e) => handleRemove(e, item)}
            />
          ))}
        </div>
      </div>

      <style>{`
        .fxc-section{position:relative;padding:clamp(20px,3vw,40px) 0}
        .fxc-head{display:flex;align-items:flex-end;justify-content:space-between;
          padding:0 clamp(20px,6vw,118px);margin-bottom:20px}
        .fxc-head-left{display:flex;align-items:center;gap:14px;min-width:0}
        .fxc-bar{width:4px;height:38px;border-radius:4px;background:linear-gradient(to bottom,#ff3e6c,#b91c45);
          box-shadow:0 0 18px rgba(255,62,108,.45)}
        .fxc-title-row{display:flex;align-items:center;gap:10px}
        .fxc-title{font-size:clamp(20px,2.4vw,28px);font-weight:900;color:#fff;letter-spacing:-.02em;margin:0}
        .fxc-tag{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;letter-spacing:.08em;
          padding:3px 9px;border-radius:999px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.16)}
        .fxc-sub{margin:3px 0 0;font-size:13px;color:rgba(255,255,255,.45)}
        .fxc-nav{display:flex;gap:8px}
        .fxc-nav-btn{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;cursor:pointer;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.7);
          transition:all .2s ease}
        .fxc-nav-btn:hover:not(:disabled){background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.34)}
        .fxc-nav-btn:disabled{opacity:.25;cursor:default}
        @media(max-width:768px){.fxc-nav{display:none}}

        .fxc-rail-wrap{position:relative}
        .fxc-fade-l,.fxc-fade-r{position:absolute;top:0;bottom:0;width:60px;z-index:4;pointer-events:none}
        .fxc-fade-l{left:0;background:linear-gradient(to right,#06070a,transparent)}
        .fxc-fade-r{right:0;background:linear-gradient(to left,#06070a,transparent)}
        .fxc-rail{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;
          padding:6px clamp(20px,6vw,118px) 26px;scrollbar-width:none}
        .fxc-rail::-webkit-scrollbar{display:none}

        .fxc-card{position:relative;flex:0 0 auto;width:clamp(300px,44vw,420px);scroll-snap-align:start;
          cursor:pointer;border-radius:18px;overflow:hidden;background:#101218;
          border:1px solid rgba(255,255,255,.07);opacity:0;
          transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s ease,border-color .3s ease}
        .fxc-card.in{animation:fxcIn .55s cubic-bezier(.22,1,.36,1) both}
        @keyframes fxcIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .fxc-card:hover{transform:translateY(-6px);border-color:rgba(255,62,108,.4);
          box-shadow:0 26px 56px -18px rgba(0,0,0,.85)}
        .fxc-thumb{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#1a1c22}
        .fxc-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
        .fxc-card:hover .fxc-thumb img{transform:scale(1.06)}
        .fxc-thumb-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85),transparent 55%)}
        .fxc-play-ov{position:absolute;inset:0;display:grid;place-items:center}
        .fxc-play-circle{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;
          background:rgba(255,62,108,.92);box-shadow:0 8px 28px rgba(255,62,108,.5);
          transform:scale(.85);opacity:.85;transition:all .26s ease}
        .fxc-card:hover .fxc-play-circle{transform:scale(1);opacity:1}
        .fxc-ep{position:absolute;top:12px;left:12px;font-size:11px;font-weight:700;color:#fff;
          padding:4px 9px;border-radius:7px;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
          border:1px solid rgba(255,255,255,.12)}
        .fxc-remove{position:absolute;top:11px;right:11px;width:30px;height:30px;border-radius:50%;
          display:grid;place-items:center;cursor:pointer;color:rgba(255,255,255,.7);
          background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.16);opacity:0;transition:all .2s ease;z-index:5}
        .fxc-card:hover .fxc-remove{opacity:1}
        .fxc-remove:hover{background:#000;color:#fff}

        .fxc-bar-track{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.16)}
        .fxc-bar-fill{height:100%;position:relative;border-radius:0 3px 3px 0}
        .fxc-bar-fill::after{content:"";position:absolute;right:0;top:50%;transform:translate(50%,-50%);
          width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 10px rgba(255,255,255,.9)}

        .fxc-body{padding:14px 16px 16px}
        .fxc-row1{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .fxc-name{font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fxc-ep2{font-size:12px;color:rgba(255,255,255,.5);margin-top:3px}
        .fxc-pct{flex:0 0 auto;font-size:13px;font-weight:900;color:#ff7d9c;font-variant-numeric:tabular-nums}
        .fxc-pct.done{color:#ff5252}
        .fxc-metarow{display:flex;align-items:center;justify-content:space-between;margin:12px 0 12px;
          font-size:11px;color:rgba(255,255,255,.42)}
        .fxc-remain{font-weight:700;color:rgba(255,255,255,.6);font-variant-numeric:tabular-nums}
        .fxc-resume{width:100%;height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
          border:0;border-radius:11px;cursor:pointer;font-size:14px;font-weight:800;color:#fff;
          background:linear-gradient(180deg,#ff4e78,#e0214f);
          box-shadow:0 8px 22px -6px rgba(255,62,108,.55);transition:transform .16s ease,box-shadow .16s ease}
        .fxc-resume:hover{transform:translateY(-1px);box-shadow:0 12px 28px -6px rgba(255,62,108,.7)}
        .fxc-resume:active{transform:scale(.98)}
      `}</style>
    </section>
  );
}

function ContinueWatchingCard({
  item, idx, revealed, onPlay, onRemove,
}: {
  item: ContinueWatchingItem;
  idx: number;
  revealed: boolean;
  onPlay: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const remainSec = Math.max(0, item.durationSeconds - item.progressSeconds);
  const progressPct = Math.min(100, Math.max(0, item.progress));
  const isNearDone = progressPct >= 85;
  const remainingEps = item.totalEpisodes && item.episodeNumber
    ? Math.max(0, item.totalEpisodes - item.episodeNumber)
    : null;

  return (
    <div
      className={`fxc-card ${revealed ? "in" : ""}`}
      style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
      onClick={onPlay}
    >
      <div className="fxc-thumb">
        <img
          src={item.thumbnail}
          alt={item.seriesTitle}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.endsWith("/content/fallback-poster.svg")) img.src = "/content/fallback-poster.svg";
          }}
        />
        <div className="fxc-thumb-grad" />
        <div className="fxc-play-ov">
          <div className="fxc-play-circle"><Play size={24} className="text-white fill-white ml-0.5" /></div>
        </div>
        <span className="fxc-ep">{item.episodeNumber}화{item.episodeTitle ? ` · ${item.episodeTitle}` : ""}</span>
        <button className="fxc-remove" onClick={onRemove} aria-label="이어보기에서 삭제"><X size={13} /></button>
        <div className="fxc-bar-track">
          <div
            className="fxc-bar-fill"
            style={{
              width: `${progressPct}%`,
              background: isNearDone ? "linear-gradient(to right,#c0392b,#ff5252)" : "linear-gradient(to right,#ff4e78,#ff3e6c)",
              boxShadow: isNearDone ? "0 0 12px rgba(255,82,82,.6)" : "0 0 12px rgba(255,62,108,.6)",
            }}
          />
        </div>
      </div>

      <div className="fxc-body">
        <div className="fxc-row1">
          <div style={{ minWidth: 0 }}>
            <p className="fxc-name">{item.seriesTitle}</p>
            <p className="fxc-ep2">
              {item.episodeNumber}화 시청 중
              {remainingEps !== null && remainingEps === 0 && " · 마지막 화"}
              {remainingEps !== null && remainingEps === 1 && " · 1화 남음"}
              {remainingEps !== null && remainingEps !== null && remainingEps >= 2 && remainingEps <= 3 && ` · 거의 다 봤어요`}
              {remainingEps !== null && remainingEps !== null && remainingEps > 3 && ` · ${remainingEps}화 남음`}
            </p>
          </div>
          <span className={`fxc-pct ${isNearDone ? "done" : ""}`}>{progressPct}%</span>
        </div>

        <div className="fxc-metarow">
          <span>{item.lastWatched ? formatLastWatched(item.lastWatched) : ""}</span>
          <span className="fxc-remain">{formatTime(remainSec)} 남음</span>
        </div>

        <button className="fxc-resume" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
          <Play size={14} className="fill-white" strokeWidth={0} />
          이어보기
        </button>
      </div>
    </div>
  );
}
