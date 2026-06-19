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

        // 만료 판정: end_date가 현재 시각보다 이전인 active 구독 → inactive 처리
        await supabase
          .from("subscriptions")
          .update({ status: "inactive" })
          .eq("user_id", userId)
          .eq("status", "active")
          .not("end_date", "is", null)
          .lt("end_date", now);

        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
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

  const isActive = subscription?.status === "active";

  return { subscription, isActive, loading, refetch };
}
