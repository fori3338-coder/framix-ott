import { useState } from "react";
import { Check, Crown, Sparkles, Gem } from "lucide-react";

type PlanId = "premium" | "vip";

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  badge?: string;
  icon: typeof Sparkles;
  perks: string[];
}[] = [
  {
    id: "premium",
    name: "PREMIUM",
    price: 4900,
    badge: "가장 인기",
    icon: Sparkles,
    perks: [
      "모든 에피소드 무제한 시청",
      "잠금 콘텐츠 해제",
      "광고 제거 (예정)",
      "최신 콘텐츠 우선 시청",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    price: 9900,
    icon: Gem,
    perks: [
      "PREMIUM 모든 혜택 포함",
      "VIP 전용 콘텐츠",
      "신규 콘텐츠 우선 공개",
      "향후 이벤트 우선 참여",
    ],
  },
];

export default function Subscription() {
  const [toast, setToast] = useState(false);

  function handleSubscribe() {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen px-4 md:px-8 pt-20 md:pt-28 pb-16 animate-fade-in flex flex-col items-center">

      {/* 토스트 */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-surface border border-gold/40 text-sm font-semibold text-text shadow-2xl animate-fade-in"
          style={{ backdropFilter: "blur(12px)" }}
        >
          결제 준비중입니다
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center mb-10 max-w-xl w-full">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown size={28} className="text-gold" />
          <span className="text-[11px] font-black tracking-widest text-gold uppercase">Premium Membership</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
          <span className="text-gradient-gold">FRAMIX</span>
          <br />
          <span className="text-text">프리미엄</span>
        </h1>
        <p className="text-text-muted text-sm md:text-base">
          끝없는 반전, 광고 없는 몰입. 지금 시작하세요.
        </p>
      </div>

      {/* 플랜 카드 그룹 */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-gold/30 p-7 md:p-9 relative overflow-hidden flex flex-col"
              style={{
                background: "linear-gradient(145deg, rgba(212,175,55,0.08) 0%, #111113 60%)",
                boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              {/* 배경 글로우 */}
              <div
                className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #D4AF37, transparent 70%)" }}
              />

              {/* 인기 배지 */}
              {plan.badge && (
                <span className="absolute -top-3 left-6 bg-gold text-black text-[11px] font-black px-3 py-1 rounded-full tracking-wide shadow">
                  {plan.badge}
                </span>
              )}

              {/* 플랜명 */}
              <div className="flex items-center gap-2 mb-1 mt-2">
                <Icon size={16} className="text-gold" />
                <span className="text-sm font-bold text-gold tracking-wide">{plan.name}</span>
              </div>

              {/* 가격 */}
              <div className="mb-6">
                <span className="text-4xl md:text-5xl font-black text-text">
                  {plan.price.toLocaleString()}
                </span>
                <span className="text-text-muted text-base ml-1">원 / 월</span>
              </div>

              {/* 혜택 목록 */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-3 text-sm text-text-dim">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                      <Check size={11} className="text-gold" strokeWidth={3} />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              {/* CTA 버튼 */}
              <button
                onClick={handleSubscribe}
                className="w-full py-4 rounded-xl font-black text-base text-black tracking-wide transition-all duration-200 hover:brightness-110 active:scale-[0.97] shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #f0d77b 0%, #D4AF37 50%, #9c7e23 100%)",
                  boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
                }}
              >
                {plan.name} 구독하기
              </button>

              <p className="text-center text-text-muted text-xs mt-4">
                언제든지 해지 가능 · 약정 없음
              </p>
            </div>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div className="mt-10 grid grid-cols-3 gap-3 w-full max-w-md text-center">
        {[
          { title: "언제든 해지", desc: "약정 없이 자유롭게" },
          { title: "전 기기 지원", desc: "모바일·태블릿·TV" },
          { title: "독점 오리지널", desc: "FRAMIX만의 콘텐츠" },
        ].map((item) => (
          <div
            key={item.title}
            className="p-3 rounded-xl border border-border bg-surface"
          >
            <p className="font-bold text-xs mb-0.5 text-text">{item.title}</p>
            <p className="text-[10px] text-text-muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
