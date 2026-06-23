import { useSearchParams, useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentFail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const code    = params.get("code") ?? "UNKNOWN";
  const message = params.get("message") ?? "알 수 없는 오류가 발생했습니다.";
  const orderId = params.get("orderId") ?? "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background: "linear-gradient(145deg, rgba(255,80,80,0.06) 0%, #111113 60%)",
          boxShadow: "0 0 60px rgba(255,80,80,0.06), 0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <XCircle size={56} className="text-red-400" />

        <div>
          <p className="text-xs font-black tracking-widest text-red-400 uppercase mb-2">결제 실패</p>
          <h1 className="text-2xl font-black text-text mb-1">결제가 취소되었습니다</h1>
          <p className="text-text-muted text-sm">{message}</p>
        </div>

        {orderId && (
          <div className="w-full rounded-xl border border-border bg-surface p-4 space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">오류 코드</span>
              <span className="text-red-400 font-mono text-xs">{code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">주문번호</span>
              <span className="text-text font-mono text-xs break-all max-w-[55%] text-right">{orderId}</span>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => navigate("/subscription")}
            className="w-full py-3 rounded-xl font-black text-sm text-black tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #ff7196 0%, #ff3e6c 50%, #d31a52 100%)",
              boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
            }}
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl font-bold text-sm text-text-muted border border-border hover:bg-surface transition-all"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
