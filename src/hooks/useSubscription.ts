import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface UseSubscriptionResult {
  subscription: Subscription | null;
  isActive: boolean;
  loading: boolean;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubscription() {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          if (!cancelled) { setSubscription(null); setLoading(false); }
          return;
        }

        const now = new Date().toISOString();

        // 만료 판정: end_date 경과한 active/cancelled 구독 → inactive 처리 (STEP1 + 해지 만료)
        await supabase
          .from("subscriptions")
          .update({ status: "inactive" })
          .eq("user_id", userId)
          .in("status", ["active", "cancelled"])
          .not("end_date", "is", null)
          .lt("end_date", now);

        // 조회: active(정상) + cancelled(해지했지만 기간 내) 모두 유효 구독으로 취급
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["active", "cancelled"])
          .or(`end_date.is.null,end_date.gt.${now}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setSubscription(error ? null : (data ?? null));
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setSubscription(null); setLoading(false); }
      }
    }

    fetchSubscription();

    // 로그인/로그아웃 변경 감지
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchSubscription();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [tick]);

  // active: 정상 구독 / cancelled: 해지했지만 end_date 전까지 시청 가능 → 둘 다 isActive=true
  const isActive =
    subscription !== null &&
    (subscription.status === "active" || subscription.status === "cancelled");

  return { subscription, isActive, loading, refetch };
}
