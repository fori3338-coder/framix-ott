import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useSubscription } from "../hooks/useSubscription";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useSubscription();

  const paymentKey = params.get("paymentKey") ?? "";
  const orderId    = params.get("orderId") ?? "";
  const amount     = params.get("amount") ?? "";

  const [seconds, setSeconds] = useState(5);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 결제 성공 시 subscriptions 저장
  useEffect(() => {
    async function saveSubscription() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        // plan 판별: amount <= 4900 → premium, > 4900 → vip
        const plan = Number(amount) <= 4900 ? "premium" : "vip";

        const now = new Date();
        const startDate = now.toISOString();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateISO = endDate.toISOString();

        // 기존 active 구독 조회
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();

        if (existing?.id) {
          // 기존 active 구독 → update
          const { error } = await supabase
            .from("subscriptions")
            .update({
              plan,
              start_date: startDate,
              end_date: endDateISO,
            })
            .eq("id", existing.id);
          if (error) { setSaveError(error.message); return; }
        } else {
          // 없음 → insert
          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan,
              status: "active",
              start_date: startDate,
              end_date: endDateISO,
              created_at: startDate,
            });
          if (error) { setSaveError(error.message); return; }
        }

        // 저장 완료 후 구독 상태 즉시 갱신 → Player isLocked 해제
        refetch();
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : "저장 중 오류 발생");
      }
    }

    if (paymentKey && orderId && amount) {
      saveSubscription();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentKey, orderId, amount]);

  useEffect(() => {
    if (seconds <= 0) { navigate("/"); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-gold/30 p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background: "linear-gradient(145deg, rgba(212,175,55,0.08) 0%, #111113 60%)",
          boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <CheckCircle size={56} className="text-gold" />

        <div>
          <p className="text-xs font-black tracking-widest text-gold uppercase mb-2">결제 완료</p>
          <h1 className="text-2xl font-black text-text mb-1">구독이 시작되었습니다</h1>
          <p className="text-text-muted text-sm">FRAMIX 프리미엄을 마음껏 즐기세요.</p>
        </div>

        {saveError && (
          <p className="text-red-400 text-xs text-center">구독 저장 오류: {saveError}</p>
        )}

        <div className="w-full rounded-xl border border-border bg-surface p-4 space-y-2 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">주문번호</span>
            <span className="text-text font-mono text-xs break-all max-w-[55%] text-right">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">결제금액</span>
            <span className="text-gold font-bold">{Number(amount).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">PaymentKey</span>
            <span className="text-text font-mono text-xs break-all max-w-[55%] text-right">{paymentKey}</span>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-xl font-black text-sm text-black tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #f0d77b 0%, #D4AF37 50%, #9c7e23 100%)",
            boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
          }}
        >
          홈으로 이동 ({seconds}초)
        </button>
      </div>
    </div>
  );
}
