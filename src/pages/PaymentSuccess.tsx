import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const paymentKey = params.get("paymentKey") ?? "";
  const orderId    = params.get("orderId") ?? "";
  const amount     = params.get("amount") ?? "";

  const [seconds, setSeconds] = useState(5);

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
