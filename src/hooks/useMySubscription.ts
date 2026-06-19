import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// /my/subscription 전용 조회 훅.
// 기존 useSubscription.ts(STEP1/STEP2 로직)는 수정하지 않고 그대로 둔다.
// 차이점: useSubscription은 "유효 구독(active/cancelled)"만 조회하지만,
// 이 훅은 active/cancelled/inactive를 가리지 않고 가장 최근 구독 1건을 그대로 보여준다.
// (= "구독 만료" 상태도 화면에 표시해야 하므로)

export interface MySubscriptionRow {
  id: string;
  user_id: string;
  membership_level: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
}

export interface UseMySubscriptionResult {
  subscription: MySubscriptionRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMySubscription(): UseMySubscriptionResult {
  const [subscription, setSubscription] = useState<MySubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchMySubscription() {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          if (!cancelled) { setSubscription(null); setLoading(false); }
          return;
        }

        const now = new Date().toISOString();

        // 기존 STEP1 만료 판정 로직과 동일한 조건으로 만료된 구독을 inactive 처리.
        // (useSubscription.ts와 같은 update 호출이지만, 화면 표시 전 상태 동기화 목적으로
        //  이 훅에서도 동일하게 수행 — 새로운 해지/만료 로직을 만든 것이 아니라 기존 조건 재사용)
        await supabase
          .from("subscriptions")
          .update({ status: "inactive" })
          .eq("user_id", userId)
          .in("status", ["active", "cancelled"])
          .not("current_period_end", "is", null)
          .lt("current_period_end", now);

        // 상태 무관 최신 구독 1건 조회
        const { data, error: err } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          if (err) {
            setError(err.message);
            setSubscription(null);
          } else {
            setSubscription(data ?? null);
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "구독 정보를 불러오지 못했습니다.");
          setSubscription(null);
          setLoading(false);
        }
      }
    }

    fetchMySubscription();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchMySubscription();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [tick]);

  return { subscription, loading, error, refetch };
}
