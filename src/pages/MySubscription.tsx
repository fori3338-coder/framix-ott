import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Gem,
  Sparkles,
  LogIn,
  AlertTriangle,
  CalendarDays,
  CalendarCheck,
  TimerReset,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { useMySubscription } from "../hooks/useMySubscription";

// 플랜 아이콘 매핑 (Subscription.tsx의 PLANS 정의와 동일한 표기 기준)
const PLAN_ICON: Record<string, typeof Sparkles> = {
  premium: Sparkles,
  vip: Gem,
};

function planLabel(plan: string) {
  if (plan === "premium") return "PREMIUM";
  if (plan === "vip") return "VIP";
  return plan.toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 남은 기간 계산: end_date - 오늘, 일 단위
function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// 상태 배지: active=초록 "구독중" / cancelled=주황 "해지 예약됨" / inactive(그 외)=회색 "구독 만료"
function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        구독중
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        해지 예약됨
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-text-muted border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      구독 만료
    </span>
  );
}

export default function MySubscription() {
  const { user } = useAuthContext();
  const { subscription, loading, error, refetch } = useMySubscription();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // 구독 해지: 기존 STEP2 로직(Subscription.tsx handleCancelConfirm)을 그대로 재사용.
  // status='active' → 'cancelled' (end_date 유지 → 기간 내 시청 가능). 새 해지 로직 생성 없음.
  async function handleCancelConfirm() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { setCancelError("로그인 정보를 확인할 수 없습니다."); return; }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("status", "active");

      if (updateError) { setCancelError(updateError.message); return; }

      setShowCancelModal(false);
      refetch();
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : "해지 중 오류가 발생했습니다.");
    } finally {
      setCancelling(false);
    }
  }

  // 비로그인
  if (!user) {
    return (
      <div className="min-h-screen px-4 md:px-8 pt-20 md:pt-28 pb-16 animate-fade-in flex flex-col items-center">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <LogIn size={26} className="text-text-muted" />
          </div>
          <p className="text-text-dim font-medium">로그인이 필요합니다</p>
          <p className="text-text-muted text-sm mt-1">내 구독 정보를 확인하려면 로그인하세요.</p>
        </div>
      </div>
    );
  }

  const remaining = subscription ? daysRemaining(subscription.end_date) : null;
  const startLabel = subscription ? formatDate(subscription.start_date) : null;
  const endLabel = subscription ? formatDate(subscription.end_date) : null;
  const PlanIcon = subscription ? (PLAN_ICON[subscription.plan] ?? Crown) : Crown;

  return (
    <div className="min-h-screen px-4 md:px-8 pt-20 md:pt-28 pb-16 animate-fade-in flex flex-col items-center">

      {/* 헤더 */}
      <div className="text-center mb-10 max-w-xl w-full">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown size={28} className="text-gold" />
          <span className="text-[11px] font-black tracking-widest text-gold uppercase">My Membership</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
          <span className="text-gradient-gold">내 구독</span>
        </h1>
        <p className="text-text-muted text-sm md:text-base">
          현재 구독 상태와 이용 기간을 확인하세요.
        </p>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="w-full max-w-2xl rounded-2xl border border-border p-7 animate-pulse">
          <div className="h-5 w-32 bg-surface-2 rounded mb-4" />
          <div className="h-4 w-48 bg-surface-2 rounded mb-2" />
          <div className="h-4 w-40 bg-surface-2 rounded" />
        </div>
      )}

      {/* 오류 */}
      {!loading && error && (
        <div className="w-full max-w-2xl flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          데이터 로드 오류: {error}
        </div>
      )}

      {/* 구독 이력 없음 */}
      {!loading && !error && !subscription && (
        <div className="w-full max-w-2xl text-center py-16 rounded-2xl border border-border bg-surface">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <Crown size={26} className="text-text-muted" />
          </div>
          <p className="text-text-dim font-medium">구독 내역이 없습니다</p>
          <p className="text-text-muted text-sm mt-1 mb-5">PREMIUM 또는 VIP 멤버십을 시작해보세요.</p>
          <Link
            to="/subscription"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm text-black"
            style={{
              background: "linear-gradient(135deg, #f0d77b 0%, #D4AF37 50%, #9c7e23 100%)",
            }}
          >
            구독 플랜 보기
          </Link>
        </div>
      )}

      {/* 구독 정보 카드 */}
      {!loading && !error && subscription && (
        <div
          className="w-full max-w-2xl rounded-2xl border border-gold/30 p-7 md:p-9 relative"
          style={{
            background: "linear-gradient(145deg, rgba(212,175,55,0.08) 0%, #111113 60%)",
            boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #D4AF37, transparent 70%)" }}
            />
          </div>

          {/* 플랜 + 상태 배지 */}
          <div className="relative flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              <PlanIcon size={20} className="text-gold" />
              <span className="text-xl md:text-2xl font-black text-text">{planLabel(subscription.plan)}</span>
            </div>
            <StatusBadge status={subscription.status} />
          </div>

          {/* 정보 그리드 */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
            <div className="rounded-xl border border-border p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1.5">
                <CalendarDays size={13} />
                구독 시작일
              </div>
              <p className="text-sm font-bold text-text">{startLabel ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-border p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1.5">
                <CalendarCheck size={13} />
                만료일
              </div>
              <p className="text-sm font-bold text-text">{endLabel ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-border p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1.5">
                <TimerReset size={13} />
                남은 기간
              </div>
              <p className="text-sm font-bold text-gold">
                {remaining === null ? "-" : remaining > 0 ? `${remaining}일 남음` : "만료됨"}
              </p>
            </div>
          </div>

          {/* 해지 예약 안내 */}
          {subscription.status === "cancelled" && endLabel && (
            <p className="relative text-xs text-text-muted mt-4">
              <span className="text-gold font-bold">{endLabel}</span>까지 계속 이용하실 수 있으며, 이후 자동으로 만료됩니다.
            </p>
          )}

          {/* 구독 해지 버튼 - active 상태에서만 노출 */}
          {subscription.status === "active" && (
            <div className="relative mt-7 pt-6 border-t border-border flex justify-end">
              <button
                onClick={() => { setCancelError(null); setShowCancelModal(true); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-text-muted border border-border hover:border-red-500/50 hover:text-red-400 transition-all"
              >
                구독 해지
              </button>
            </div>
          )}

          {/* 만료된 구독 → 재구독 유도 */}
          {subscription.status === "inactive" && (
            <div className="relative mt-7 pt-6 border-t border-border flex justify-end">
              <Link
                to="/subscription"
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-black"
                style={{
                  background: "linear-gradient(135deg, #f0d77b 0%, #D4AF37 50%, #9c7e23 100%)",
                }}
              >
                다시 구독하기
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 구독 해지 확인 모달 (기존 STEP2 로직 재사용) */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCancelModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border p-7 flex flex-col gap-5"
            style={{ background: "#111113", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle size={36} className="text-red-400" />
              <h2 className="text-lg font-black text-text">정말 구독을 해지하시겠습니까?</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                해지 후에도 <span className="text-text font-bold">현재 결제 기간이 끝날 때까지</span> 계속 이용하실 수 있습니다.
                {endLabel && (
                  <><br /><span className="text-gold font-bold">{endLabel}</span> 이후 자동 만료됩니다.</>
                )}
              </p>
            </div>

            {cancelError && (
              <p className="text-red-400 text-xs text-center">{cancelError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-text border border-border hover:border-text/40 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500/80 hover:bg-red-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelling ? "처리 중..." : "해지하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
