/**
 * CollectionSection — Disney+ Collection 스타일
 * 대형 3개 컬렉션 카드, 가로 스크롤
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Drama } from "../../types";

interface Collection {
  title: string;
  subtitle: string;
  color: string;
  accent: string;
  dramas: Drama[];
}

interface CollectionSectionProps {
  romance: Drama[];
  chaebol: Drama[];
  timeloop: Drama[];
}

export default function CollectionSection({ romance, chaebol, timeloop }: CollectionSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const collections: Collection[] = [
    { title: "복수 컬렉션", subtitle: "통쾌한 반전과 복수의 카타르시스", color: "rgba(127,29,29,0.35)", accent: "#ef4444", dramas: chaebol.length > 0 ? chaebol : romance },
    { title: "재벌 컬렉션", subtitle: "화려한 상류층의 은밀한 이야기", color: "rgba(120,90,0,0.35)", accent: "#ff3e6c", dramas: chaebol },
    { title: "타임루프 컬렉션", subtitle: "운명을 바꾸는 두 번째 기회", color: "rgba(30,58,138,0.35)", accent: "#60a5fa", dramas: timeloop.length > 0 ? timeloop : romance },
  ].filter((c) => c.dramas.length > 0);

  if (collections.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={["relative home-section section-reveal", revealed ? "is-visible" : ""].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 md:px-12 mb-6">
        <div className="section-accent-bar" style={{ background: "linear-gradient(to bottom, #60a5fa, #1d4ed8)" }} />
        <div>
          <h2 className="section-title-premium">추천 컬렉션</h2>
          <p className="section-subtitle-premium hidden md:block">테마별로 골라 보는 큐레이션 모음</p>
        </div>
      </div>

      {/* Collection Cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 px-5 md:px-12 overflow-x-auto md:overflow-visible scrollbar-hide md:grid md:grid-cols-3 pb-2 md:pb-0">
        {collections.map((col, i) => (
          <CollectionCard key={col.title} collection={col} index={i} revealed={revealed} />
        ))}
      </div>
    </section>
  );
}

function CollectionCard({ collection, index, revealed }: { collection: Collection; index: number; revealed: boolean }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const items = collection.dramas.slice(0, 4);

  return (
    <div
      className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group/col"
      style={{
        minWidth: "clamp(240px, 70vw, 340px)",
        aspectRatio: "16/10",
        background: collection.color,
        border: `1px solid ${collection.accent}22`,
        opacity: 0,
        animation: revealed ? `fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 100}ms both` : "none",
        transform: hovered ? "scale(1.015)" : "scale(1)",
        transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
        boxShadow: hovered ? `0 24px 60px -16px rgba(0,0,0,0.7), 0 0 0 1px ${collection.accent}33` : "0 8px 32px -8px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Mini poster grid (bg) */}
      <div className="absolute inset-0 grid grid-cols-2 gap-0.5 opacity-40">
        {items.map((d, i) => (
          <CollectionThumb key={d.id} drama={d} index={i} />
        ))}
      </div>

      {/* Gradient scrim */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${collection.color.replace("0.35", "0.92")} 0%, rgba(5,5,5,0.4) 100%)` }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 z-10">
        <div
          className="w-1 h-6 rounded-full mb-3"
          style={{ background: `linear-gradient(to bottom, ${collection.accent}, transparent)` }}
        />
        <h3
          className="font-black text-white mb-1"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
        >
          {collection.title}
        </h3>
        <p className="text-[11px] md:text-[12px] text-white/55 mb-3">{collection.subtitle}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] md:text-[11px] font-bold" style={{ color: collection.accent }}>
            {collection.dramas.length}개 작품
          </span>
          <ChevronRight size={11} style={{ color: collection.accent }} />
        </div>
      </div>

      {/* Click handler overlay */}
      <button
        className="absolute inset-0 z-20"
        onClick={() => navigate(`/drama/${collection.dramas[0]?.id}`)}
        aria-label={collection.title}
      />
    </div>
  );
}

function CollectionThumb({ drama, index }: { drama: Drama; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const isTop = index < 2;
  const src = isTop ? drama.backdrop || drama.poster : drama.poster || drama.backdrop;

  return (
    <div className="overflow-hidden" style={{ aspectRatio: isTop ? "16/9" : "9/16" }}>
      {!imgErr ? (
        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgErr(true)} />
      ) : (
        <div className="w-full h-full bg-[#1a1a1c]" />
      )}
    </div>
  );
}
