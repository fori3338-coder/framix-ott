import { useState } from "react";
import { Check, Crown } from "lucide-react";
import { subscriptionPlans } from "../data/mockData";

export default function Subscription() {
  const [selected, setSelected] = useState("premium");

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in">
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <Crown size={32} className="text-gold mx-auto mb-3" />
        <h1 className="text-2xl md:text-4xl font-black mb-2">
          <span className="text-gradient-gold">FRAMIX</span> 멤버십
        </h1>
        <p className="text-text-dim text-sm md:text-base">
          끝없는 반전, 광고 없는 몰입. 나에게 맞는 플랜을 선택하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {subscriptionPlans.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative text-left rounded-2xl border p-5 md:p-6 transition-all ${
                isSelected
                  ? "border-gold bg-gradient-to-b from-gold/10 to-surface ring-1 ring-gold/40 scale-[1.02]"
                  : "border-border bg-surface hover:border-gold/40"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-5 bg-gold text-black text-[11px] font-bold px-2.5 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg md:text-xl font-bold mb-1">{plan.name}</h3>
              <p className="mb-4">
                <span className="text-2xl md:text-3xl font-black text-text">
                  {plan.price.toLocaleString()}원
                </span>
                <span className="text-text-muted text-sm"> /월</span>
              </p>
              <ul className="space-y-2 mb-5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-text-dim">
                    <Check size={16} className="text-gold mt-0.5 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <div
                className={`w-full text-center py-2.5 rounded-md font-bold text-sm transition-colors ${
                  isSelected ? "bg-gold text-black" : "bg-surface-2 text-text-dim border border-border"
                }`}
              >
                {isSelected ? "선택됨" : "선택하기"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="max-w-5xl mx-auto mt-8">
        <button className="w-full md:w-auto md:mx-auto md:block bg-gold text-black font-bold py-3.5 px-10 rounded-md text-base hover:bg-gold-light transition-colors">
          {subscriptionPlans.find((p) => p.id === selected)?.name} 플랜 시작하기
        </button>
        <p className="text-center text-text-muted text-xs mt-3">
          언제든지 해지할 수 있습니다. 첫 결제 시 7일 무료 체험이 제공됩니다.
        </p>
      </div>

      <div className="max-w-3xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <p className="font-bold mb-1">언제든 해지</p>
          <p className="text-xs text-text-muted">약정 없이 자유롭게 해지 가능</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <p className="font-bold mb-1">전 기기 지원</p>
          <p className="text-xs text-text-muted">모바일, 태블릿, TV에서 시청</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <p className="font-bold mb-1">독점 오리지널</p>
          <p className="text-xs text-text-muted">FRAMIX만의 독점 콘텐츠 제공</p>
        </div>
      </div>
    </div>
  );
}
