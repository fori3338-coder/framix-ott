/**
 * MyListSection — 내 보관함 탭 구조
 * 탭: 최근 추가 / 찜 목록 / 이어보기
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Heart, Play } from "lucide-react";
import type { Drama, ContinueWatchingItem } from "../../types";

interface MyListSectionProps {
  favoritedList: Drama[];
  continueWatchingItems: ContinueWatchingItem[];
  allDramas: Drama[];
  isLoggedIn: boolean;
}

type TabKey = "recent" | "favorites" | "continue";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "recent", label: "최근 추가", icon: <Clock size={12} /> },
  { key: "favorites", label: "찜 목록", icon: <Heart size={12} /> },
  { key: "continue", label: "이어보기", icon: <Play size={12} /> },
];

export default function MyListSection({ favoritedList, continueWatchingItems, allDramas, isLoggedIn }: MyListSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("favorites");
  const [animKey, setAnimKey] = useState(0);

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

  // recent = 최근 추가된 favorites
  const recentDramas = [...favoritedList].slice(0, 10);

  // continue watching dramas
  const cwDramas = continueWatchingItems
    .slice(0, 10)
    .map((item) => allDramas.find((d) => d.id === item.dramaId))
    .filter((d): d is Drama => Boolean(d));

  const tabDramas: Record<TabKey, Drama[]> = {
    recent: recentDramas,
    favorites: favoritedList,
    continue: cwDramas,
  };

  const currentDramas = tabDramas[activeTab].slice(0, 10);
  const activeCfg = TABS.find((t) => t.key === activeTab)!;

  if (!isLoggedIn || favoritedList.length === 0) return null;

  const handleTabChange = (key: TabKey) => {
    if (key === activeTab) return;
    setActiveTab(key);
    setAnimKey((k) => k + 1);
  };

  return (
    <section
      ref={sectionRef}
      className={["relative home-section section-reveal", revealed ? "is-visible" : ""].join(" ")}
    >
      {/* Header + Tabs inline */}
      <div className="px-5 md:px-12 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="section-accent-bar" style={{ background: "linear-gradient(to bottom, #D4AF37, #9c7e23)" }} />
          <h2 className="section-title-premium">내 보관함</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {TABS.map((tab, i) => {
            const count = tabDramas[tab.key].length;
            if (count === 0 && tab.key !== "favorites") return null;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold border transition-all duration-200 active:scale-95 focus:outline-none flex-shrink-0"
                style={{
                  opacity: 0,
                  animation: revealed ? `fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` : "none",
                  background: isActive ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                  borderColor: isActive ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)",
                  color: isActive ? "#D4AF37" : "rgba(255,255,255,0.45)",
                  boxShadow: isActive ? "0 4px 16px -6px rgba(212,175,55,0.35)" : "none",
                }}
              >
                <span style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>{tab.icon}</span>
                {tab.label}
                {count > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: isActive ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.06)", color: isActive ? "#D4AF37" : "rgba(255,255,255,0.28)" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card strip */}
      {currentDramas.length > 0 ? (
        <div
          key={animKey}
          className="flex gap-3.5 md:gap-4 px-5 md:px-12 overflow-x-auto scrollbar-hide pb-4"
          style={{ animation: "myListIn 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {currentDramas.map((drama, i) => (
            <MyListCard key={drama.id} drama={drama} index={i} tab={activeTab} cwItem={continueWatchingItems.find((c) => c.dramaId === drama.id)} />
          ))}
        </div>
      ) : (
        <div className="px-5 md:px-12 py-8 text-center">
          <p className="text-[12px] text-white/25">
            {activeCfg.label}이 없습니다
          </p>
        </div>
      )}

      <style>{`
        @keyframes myListIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

function MyListCard({ drama, tab, cwItem }: { drama: Drama; index: number; tab: TabKey; cwItem?: ContinueWatchingItem }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const firstEp = drama.episodes[0]?.id;
  const progress = cwItem ? cwItem.progress : 0;

  return (
    <div
      className="flex-shrink-0 cursor-pointer group"
      style={{ width: "clamp(105px, 22vw, 155px)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/drama/${drama.id}`)}
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          aspectRatio: "2/3",
          transform: hovered ? "scale(1.08) translateY(-8px)" : "scale(1) translateY(0)",
          transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1), box-shadow 0.32s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: hovered
            ? "0 20px 56px -10px rgba(0,0,0,0.80), 0 0 0 1.5px rgba(212,175,55,0.35)"
            : "0 4px 16px -4px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
          willChange: "transform, box-shadow",
        }}
      >
        {!imgErr ? (
          <img
            src={drama.poster || drama.backdrop}
            alt={drama.title}
            loading="lazy"
            className="w-full h-full object-cover"
            style={{
              transform: hovered ? "scale(1.06)" : "scale(1)",
              transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
            }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a1c] flex items-center justify-center">
            <span className="text-[8px] text-white/30 text-center px-1">{drama.title}</span>
          </div>
        )}

        {/* Progress bar for continue watching */}
        {tab === "continue" && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-white/12">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: progress >= 85
                  ? "linear-gradient(to right, #c0392b, #ff5252)"
                  : "#D4AF37",
              }}
            />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col justify-end p-2 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 45%, transparent 75%)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.25s ease",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (tab === "continue" && cwItem?.episodeId) navigate(`/watch/${drama.id}/${cwItem.episodeId}`);
              else if (firstEp) navigate(`/watch/${drama.id}/${firstEp}`);
              else navigate(`/drama/${drama.id}`);
            }}
            className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg bg-white text-black text-[9px] font-bold hover:bg-white/90 active:scale-95 transition-all"
          >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="black"><path d="M5 3l14 9-14 9V3z" /></svg>
            {tab === "continue" ? "이어보기" : "재생"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-white/70 truncate px-0.5 group-hover:text-white/90 transition-colors duration-200">
        {drama.title}
      </p>
    </div>
  );
}
