/**
 * PremiumPaywallCard — FRAMIX Soft Paywall
 *
 * DramaDetail의 에피소드 목록 중간에 삽입.
 * 무료 시청 가능 회차 (FREE_EPISODE_LIMIT) 초과 시 잠금 안내 + 구독 유도.
 */
import { Link } from "react-router-dom";
import { Crown, Lock, Sparkles, ChevronRight } from "lucide-react";
import { FREE_EPISODE_LIMIT } from "../lib/premiumStats";

interface PremiumPaywallCardProps {
  lockedCount: number;
  totalEpisodes: number;
}

export default function PremiumPaywallCard({
  lockedCount,
  totalEpisodes,
}: PremiumPaywallCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 md:p-6 my-3"
      style={{
        background:
          "linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(160,90,30,0.10) 55%, rgba(20,20,22,0.92) 100%)",
        border: "1px solid rgba(212,175,55,0.32)",
        boxShadow:
          "0 18px 40px -16px rgba(212,175,55,0.32), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* shimmer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 12% 20%, rgba(255,215,120,0.18), transparent 55%)",
        }}
      />

      <div className="relative flex items-center gap-4 md:gap-5">
        <div
          className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #f3d27a 0%, #D4AF37 50%, #a07c1f 100%)",
            boxShadow: "0 10px 24px -8px rgba(212,175,55,0.55)",
          }}
        >
          <Crown size={22} className="text-[#1a1407]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-[0.18em] text-[#D4AF37]">
              FRAMIX PREMIUM
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-white/50">
              <Lock size={10} /> {lockedCount}/{totalEpisodes} 화 잠금
            </span>
          </div>
          <p className="text-white font-black text-[15px] md:text-[17px] leading-snug">
            {FREE_EPISODE_LIMIT}화까지 무료 · 나머지는 Premium 전용
          </p>
          <p className="text-white/55 text-[12px] mt-1 leading-relaxed">
            <Sparkles size={11} className="inline-block mr-1 -mt-0.5 text-[#D4AF37]" />
            구독하고 전 회차 + 광고 없이 4K 무제한 시청
          </p>
        </div>

        <Link
          to="/subscription"
          className="hidden sm:inline-flex items-center gap-1 shrink-0 px-4 py-2.5 rounded-xl font-black text-[12px] tracking-wide text-[#1a1407] transition-transform active:scale-95 hover:scale-[1.03]"
          style={{
            background:
              "linear-gradient(135deg, #f3d27a 0%, #D4AF37 50%, #b8911e 100%)",
            boxShadow: "0 8px 20px -6px rgba(212,175,55,0.55)",
          }}
        >
          업그레이드
          <ChevronRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      {/* Mobile CTA */}
      <Link
        to="/subscription"
        className="sm:hidden relative mt-4 flex items-center justify-center gap-1 w-full py-2.5 rounded-xl font-black text-[12px] tracking-wide text-[#1a1407]"
        style={{
          background:
            "linear-gradient(135deg, #f3d27a 0%, #D4AF37 50%, #b8911e 100%)",
        }}
      >
        Premium 업그레이드
        <ChevronRight size={14} strokeWidth={2.5} />
      </Link>
    </div>
  );
}
