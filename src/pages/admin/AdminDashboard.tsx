import { Link } from "react-router-dom";
import {
  Users, Film, Eye, TrendingUp, TrendingDown, Upload, Settings, Star,
  BarChart3, Activity, Sparkles, PlayCircle, MoreVertical, Search, Bell, Crown, UserPlus, Clapperboard,
  Edit2, Trash2, EyeOff, CheckCircle, AlertCircle,
  Megaphone, Save, Gem, CalendarPlus, XCircle, RefreshCw, UserCog, Subtitles,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import SubtitleManager from "../../components/admin/SubtitleManager";

type Range = "7D" | "30D" | "90D";

interface LiveStats {
  totalMembers: number;
  totalContents: number;
  totalViews: number;
  totalSubscribers: number;
  newSignups: number;
}

interface SubStats {
  totalSubscribers: number;
  premiumCount: number;
  vipCount: number;
  cancelledCount: number;
  inactiveCount: number;
}

interface RevenueStats {
  todayRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  premiumRevenue: number;
  vipRevenue: number;
  paymentCount: number;
  arpu: number;
}

interface DbSeries {
  id: string;
  title: string;
  genres: string[] | null;
  // genre/category: series 테이블에 실존하는 컬럼이 아님(스키마 기준 genres[]만 존재).
  // select 쿼리에는 포함하지 않으며, 다른 화면(mappers.ts)과 동일하게 방어적
  // optional-fallback 용도로만 타입을 남겨둔다 (항상 undefined로 평가되어 "기타"로 폴백됨).
  genre: string | null;
  category: string | null;
  views: number | null;
  rating: number | null;
  status: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
  total_episodes: number | null;
  banner_enabled: boolean | null;
  banner_order: number | null;
  top10_rank: number | null;
  is_new: boolean | null;
}

interface ActivityLog {
  what: string;
  when: string;
  who: string;
}

// ── 구독자 관리 ──────────────────────────────────────────────────────────
// profiles 테이블: 레포 내 supabase/migrations/*.sql 전체를 확인한 결과
// CREATE TABLE 정의가 존재하지 않음 (Supabase Auth 트리거로 자동 생성되는
// 것으로 추정되며 정확한 컬럼 구성은 코드상 확인 불가). 따라서 select("*")로
// 전체 컬럼을 비가정으로 가져온 뒤, 화면에서는 존재가 확인된 값만 안전하게
// 표시한다 (없는 컬럼을 단정해 하드코딩하지 않음).
type DbProfile = Record<string, unknown> & { id: string };

// subscriptions 테이블: src/hooks/useSubscription.ts, useMySubscription.ts,
// src/pages/PaymentSuccess.tsx 에서 실제로 사용 중인 컬럼 기준 (코드로 확인됨).
interface DbSubscription {
  id: string;
  user_id: string;
  membership_level: string; // 'premium' | 'vip'
  status: string;           // 'active' | 'cancelled' | 'inactive'
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
}

interface PlatformSettings {
  id: number;
  notice: string;
  hero_banner_text: string;
  recommend_algorithm: string;
  top10_auto: boolean;
  new_release_count: number;
  updated_at: string | null;
}

// ── 조회수 그래프용 스파크라인 경로 생성 ────────────────────────────────────
const sparkPath = (data: number[], w = 100, h = 32) => {
  if (data.length < 2) return "";
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
};

export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("7D");

  // ── 실제 DB 조회수 시계열 데이터 ──────────────────────────────────────────
  const [viewsChartData, setViewsChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [viewsChartLabels, setViewsChartLabels] = useState<string[]>(["월","화","수","목","금","토","일"]);

  // ── 실제 장르 분포 ────────────────────────────────────────────────────────
  const [genreShare, setGenreShare] = useState<{ name: string; pct: number }[]>([]);

  // ── 실제 인기 콘텐츠 ─────────────────────────────────────────────────────
  const [topDramas, setTopDramas] = useState<DbSeries[]>([]);

  // ── 실제 최근 활동 (업로드 로그) ─────────────────────────────────────────
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  // ── 통계 ─────────────────────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalMembers: 0, totalContents: 0, totalViews: 0, totalSubscribers: 0, newSignups: 0,
  });
  // 각 통계 영역이 "조회 완료"되었는지 여부. 완료 전에는 "—"(로딩),
  // 완료 후에는 실제 값(0 포함)을 그대로 표시해 "0인데 -로 보이는" 혼동을 없앤다.
  const [statsLoaded, setStatsLoaded] = useState({ content: false, members: false });
  // 각 영역의 실제 쿼리 에러 메시지 (없으면 null). UI에 그대로 노출해
  // "코드는 고쳤지만 실제로는 안 됨" 상태를 숨기지 않는다.
  const [dashboardError, setDashboardError] = useState<{ series: string | null; members: string | null }>({
    series: null, members: null,
  });
  const [subStats, setSubStats] = useState<SubStats>({
    totalSubscribers: 0, premiumCount: 0, vipCount: 0, cancelledCount: 0, inactiveCount: 0,
  });
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    todayRevenue: 0, monthRevenue: 0, totalRevenue: 0,
    premiumRevenue: 0, vipRevenue: 0, paymentCount: 0, arpu: 0,
  });

  // ── 매출 그래프 상태 ──────────────────────────────────────────────────────
  type RevRange = "일간" | "주간" | "월간" | "누적";
  const [revRange, setRevRange] = useState<RevRange>("월간");
  const [revenueChartData, setRevenueChartData] = useState<number[]>([]);
  const [revenueChartLabels, setRevenueChartLabels] = useState<string[]>([]);

  // ── 콘텐츠 관리 상태 ──────────────────────────────────────────────────────
  const [allContents, setAllContents] = useState<DbSeries[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMsg, setContentMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showContentManager, setShowContentManager] = useState(false);

  // ── 자막 관리 패널 상태 ───────────────────────────────────────────────────
  const [subtitleTarget, setSubtitleTarget] = useState<{ id: string; title: string } | null>(null);

  // ── 구독자 관리 상태 ──────────────────────────────────────────────────────
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [members, setMembers] = useState<DbProfile[]>([]);
  const [memberSubs, setMemberSubs] = useState<Map<string, DbSubscription>>(new Map());
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberMsg, setMemberMsg] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  // ── 플랫폼 설정 상태 ──────────────────────────────────────────────────────
  const [showPlatformSettings, setShowPlatformSettings] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    notice: "",
    hero_banner_text: "",
    recommend_algorithm: "balanced",
    top10_auto: true,
    new_release_count: 10,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // ── 조회수 시계열: episode_views.viewed_at 기반 실제 집계 ────────────────
  const fetchViewsChart = useCallback(async (r: Range) => {
    const now = new Date();

    if (r === "7D") {
      // 7일치 일별 집계
      const since = new Date(now);
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("episode_views")
        .select("viewed_at")
        .gte("viewed_at", since.toISOString());

      const dayMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayMap.set(d.toISOString().slice(0, 10), 0);
      }
      (data ?? []).forEach((row: { viewed_at: string }) => {
        const key = row.viewed_at.slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      });
      const days = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const DAYS = ["일","월","화","수","목","금","토"];
      setViewsChartData(days.map(([, v]) => v));
      setViewsChartLabels(days.map(([k]) => {
        const d = new Date(k);
        return DAYS[d.getDay()];
      }));
      return;
    }

    if (r === "30D") {
      const since = new Date(now);
      since.setDate(since.getDate() - 29);
      since.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("episode_views")
        .select("viewed_at")
        .gte("viewed_at", since.toISOString());

      const dayMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayMap.set(d.toISOString().slice(0, 10), 0);
      }
      (data ?? []).forEach((row: { viewed_at: string }) => {
        const key = row.viewed_at.slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      });
      const days = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      setViewsChartData(days.map(([, v]) => v));
      setViewsChartLabels(days.map((_, i) => String(i + 1)));
      return;
    }

    // 90D → 12 weeks
    const since = new Date(now);
    since.setDate(since.getDate() - 89);
    since.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("episode_views")
      .select("viewed_at")
      .gte("viewed_at", since.toISOString());

    const weekMap = new Map<number, number>();
    for (let i = 0; i < 12; i++) weekMap.set(i, 0);
    (data ?? []).forEach((row: { viewed_at: string }) => {
      const diff = Math.floor((now.getTime() - new Date(row.viewed_at).getTime()) / (7 * 86400 * 1000));
      const wk = 11 - Math.min(diff, 11);
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
    });
    setViewsChartData(Array.from({ length: 12 }, (_, i) => weekMap.get(i) ?? 0));
    setViewsChartLabels(Array.from({ length: 12 }, (_, i) => `W${i + 1}`));
  }, []);

  // ── 장르 분포: series.genres[] 또는 category 집계 ───────────────────────
  const buildGenreShare = useCallback((rows: DbSeries[]) => {
    const map = new Map<string, number>();
    rows.forEach((s) => {
      const genres: string[] = s.genres?.length
        ? s.genres
        : s.genre
        ? [s.genre]
        : s.category
        ? [s.category]
        : ["기타"];
      genres.forEach((g) => map.set(g, (map.get(g) ?? 0) + 1));
    });
    const total = rows.length || 1;
    const sorted = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const sumTop = sorted.reduce((s, [, v]) => s + v, 0);
    const other = total - sumTop;
    const result = sorted.map(([name, cnt]) => ({
      name,
      pct: Math.round((cnt / total) * 100),
    }));
    if (other > 0) result.push({ name: "기타", pct: Math.round((other / total) * 100) });
    setGenreShare(result.slice(0, 6));
  }, []);

  // ── 매출 차트: subscriptions.current_period_start 기반 ───────────────────
  const fetchRevenueChart = useCallback(async (r: RevRange) => {
    const PREMIUM_PRICE = 4900; const VIP_PRICE = 9900;
    const now = new Date();
    const getPrice = (level: string) => level === "vip" ? VIP_PRICE : level === "premium" ? PREMIUM_PRICE : 0;

    try {
      if (r === "일간") {
        // 최근 7일 일별
        const since = new Date(now);
        since.setDate(since.getDate() - 6);
        since.setHours(0, 0, 0, 0);
        const { data } = await supabase
          .from("subscriptions")
          .select("membership_level, current_period_start")
          .gte("current_period_start", since.toISOString())
          .in("status", ["active", "cancelled"]);

        const dayMap = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i);
          dayMap.set(d.toISOString().slice(0, 10), 0);
        }
        (data ?? []).forEach((s: { membership_level: string; current_period_start: string }) => {
          const key = s.current_period_start?.slice(0, 10);
          if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + getPrice(s.membership_level));
        });
        const days = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        const DAYS = ["일","월","화","수","목","금","토"];
        setRevenueChartData(days.map(([, v]) => v));
        setRevenueChartLabels(days.map(([k]) => DAYS[new Date(k).getDay()]));

      } else if (r === "주간") {
        // 최근 8주 주별
        const since = new Date(now);
        since.setDate(since.getDate() - 55);
        since.setHours(0, 0, 0, 0);
        const { data } = await supabase
          .from("subscriptions")
          .select("membership_level, current_period_start")
          .gte("current_period_start", since.toISOString())
          .in("status", ["active", "cancelled"]);

        const weekMap = new Map<number, number>();
        for (let i = 0; i < 8; i++) weekMap.set(i, 0);
        (data ?? []).forEach((s: { membership_level: string; current_period_start: string }) => {
          const diff = Math.floor((now.getTime() - new Date(s.current_period_start).getTime()) / (7 * 86400 * 1000));
          const wk = 7 - Math.min(diff, 7);
          weekMap.set(wk, (weekMap.get(wk) ?? 0) + getPrice(s.membership_level));
        });
        setRevenueChartData(Array.from({ length: 8 }, (_, i) => weekMap.get(i) ?? 0));
        setRevenueChartLabels(Array.from({ length: 8 }, (_, i) => `W${i + 1}`));

      } else if (r === "월간") {
        // 최근 6개월
        const since = new Date(now);
        since.setMonth(since.getMonth() - 5);
        since.setDate(1);
        since.setHours(0, 0, 0, 0);
        const { data } = await supabase
          .from("subscriptions")
          .select("membership_level, current_period_start")
          .gte("current_period_start", since.toISOString())
          .in("status", ["active", "cancelled"]);

        const monthMap = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now); d.setMonth(d.getMonth() - i);
          monthMap.set(d.toISOString().slice(0, 7), 0);
        }
        (data ?? []).forEach((s: { membership_level: string; current_period_start: string }) => {
          const key = s.current_period_start?.slice(0, 7);
          if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + getPrice(s.membership_level));
        });
        const months = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        setRevenueChartData(months.map(([, v]) => v));
        setRevenueChartLabels(months.map(([k]) => k.slice(5) + "월"));

      } else {
        // 누적: 전체 월별 (최대 12개월)
        const { data } = await supabase
          .from("subscriptions")
          .select("membership_level, current_period_start")
          .in("status", ["active", "cancelled"])
          .order("current_period_start", { ascending: true });

        const monthMap = new Map<string, number>();
        (data ?? []).forEach((s: { membership_level: string; current_period_start: string }) => {
          if (!s.current_period_start) return;
          const key = s.current_period_start.slice(0, 7);
          monthMap.set(key, (monthMap.get(key) ?? 0) + getPrice(s.membership_level));
        });
        const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
        // 누적합
        let cum = 0;
        const cumData = sorted.map(([, v]) => { cum += v; return cum; });
        setRevenueChartData(cumData);
        setRevenueChartLabels(sorted.map(([k]) => k.slice(5) + "월"));
      }
    } catch (e) {
      console.error("revenue chart fetch error:", e);
    }
  }, []);
  const fetchAll = useCallback(async () => {
    // ── series (콘텐츠) ──────────────────────────────────────────────────
    // 안전 2단계 조회:
    //   1단계: 반드시 존재하는 핵심 컬럼만 조회 (통계 집계 보장)
    //   2단계: genres/banner_enabled 등 마이그레이션 필요 컬럼을 별도 시도
    //          (실패해도 1단계 통계는 유지 → 카드 전체가 0이 되는 현상 방지)
    try {
      // 1단계: 핵심 컬럼 (항상 존재)
      const { data: seriesCore, count, error: coreError } = await supabase
        .from("series")
        .select("id, title, views, rating, status, thumbnail_url, created_at, total_episodes", { count: "exact" })
        .order("views", { ascending: false });

      if (coreError) {
        console.error("series core fetch error:", coreError);
        setDashboardError((prev) => ({ ...prev, series: coreError.message }));
      } else {
        setDashboardError((prev) => ({ ...prev, series: null }));
      }

      // 2단계: 마이그레이션 의존 컬럼 (020_ensure_series_genres_column.sql 필요)
      //        실패해도 통계에 영향 없음 — error만 콘솔에 기록
      const extMap: Map<string, Partial<DbSeries>> = new Map();
      try {
        const { data: extData } = await supabase
          .from("series")
          .select("id, genres, banner_enabled, banner_order, top10_rank, is_new");
        if (extData) {
          (extData as Record<string, unknown>[]).forEach((r) => {
            extMap.set(r.id as string, r as Partial<DbSeries>);
          });
        }
      } catch (extErr) {
        console.warn("series ext columns unavailable (마이그레이션 020 미적용):", extErr);
      }

      // 핵심 + 확장 컬럼 병합
      const rows: DbSeries[] = (seriesCore ?? []).map((r) => {
        const ext = extMap.get(r.id) ?? {};
        return { genre: null, category: null, ...r, ...ext } as DbSeries;
      });

      // 총 콘텐츠 수, 총 조회수
      const totalViews = rows.reduce((s, r) => s + (r.views ?? 0), 0);
      setLiveStats((prev) => ({
        ...prev,
        totalContents: count ?? rows.length,
        totalViews,
      }));

      // 인기 콘텐츠 TOP 6 (views 내림차순)
      setTopDramas(rows.slice(0, 6));

      // 전체 콘텐츠 관리용
      setAllContents(rows);

      // 장르 분포
      buildGenreShare(rows);
    } catch (e) {
      console.error("series fetch error:", e);
      setDashboardError((prev) => ({ ...prev, series: e instanceof Error ? e.message : "콘텐츠 조회 중 오류" }));
    } finally {
      setStatsLoaded((prev) => ({ ...prev, content: true }));
    }

    // ── 총 회원수 + 신규 가입 ────────────────────────────────────────────
    // 주의: profiles는 select("id")만 조회하므로 컬럼 문제로 실패할 가능성은
    // 낮음. count가 0인데 error도 없다면 RLS 정책이 "본인 행만 조회 가능"으로
    // 막고 있고, 현재 세션이 그 회원으로 로그인되어 있지 않을 가능성이 가장
    // 높음 — supabase/migrations/018_admin_visibility_fix.sql 참고.
    try {
      const { count: memberCount, error: memberCountError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (memberCountError) {
        console.error("profiles count error:", memberCountError);
        setDashboardError((prev) => ({ ...prev, members: memberCountError.message }));
      } else {
        setDashboardError((prev) => ({ ...prev, members: null }));
      }
      setLiveStats((prev) => ({ ...prev, totalMembers: memberCount ?? 0 }));

      // 오늘 가입 수
      const todayStr = new Date().toISOString().slice(0, 10);
      const { count: newCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStr);
      setLiveStats((prev) => ({ ...prev, newSignups: newCount ?? 0 }));
    } catch (e) {
      console.error("profiles fetch error:", e);
      setDashboardError((prev) => ({ ...prev, members: e instanceof Error ? e.message : "회원수 조회 중 오류" }));
    } finally {
      setStatsLoaded((prev) => ({ ...prev, members: true }));
    }

    // ── 구독 통계 + 매출 ─────────────────────────────────────────────────
    try {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("membership_level, status, current_period_start");

      const rows = (subs ?? []) as { membership_level: string; status: string; current_period_start: string }[];
      const activeStatuses = ["active", "cancelled"];

      const totalSubscribers = rows.filter((r) => activeStatuses.includes(r.status)).length;
      const premiumCount = rows.filter((r) => r.membership_level === "premium" && activeStatuses.includes(r.status)).length;
      const vipCount = rows.filter((r) => r.membership_level === "vip" && activeStatuses.includes(r.status)).length;
      const cancelledCount = rows.filter((r) => r.status === "cancelled").length;
      const inactiveCount = rows.filter((r) => r.status === "inactive").length;

      setSubStats({ totalSubscribers, premiumCount, vipCount, cancelledCount, inactiveCount });
      setLiveStats((prev) => ({ ...prev, totalSubscribers }));

      const PREMIUM_PRICE = 4900; const VIP_PRICE = 9900;
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);

      const paidRows = rows.filter((r) => activeStatuses.includes(r.status));
      const getPrice = (level: string) => level === "vip" ? VIP_PRICE : level === "premium" ? PREMIUM_PRICE : 0;

      const totalRevenue = paidRows.reduce((s, r) => s + getPrice(r.membership_level), 0);
      const premiumRevenue = paidRows.filter((r) => r.membership_level === "premium").length * PREMIUM_PRICE;
      const vipRevenue = paidRows.filter((r) => r.membership_level === "vip").length * VIP_PRICE;
      const todayRevenue = paidRows.filter((r) => r.current_period_start?.slice(0, 10) === todayStr).reduce((s, r) => s + getPrice(r.membership_level), 0);
      const monthRevenue = paidRows.filter((r) => r.current_period_start?.slice(0, 7) === monthStr).reduce((s, r) => s + getPrice(r.membership_level), 0);
      const paymentCount = paidRows.length;
      const arpu = totalSubscribers > 0 ? Math.round(totalRevenue / totalSubscribers) : 0;

      setRevenueStats({ todayRevenue, monthRevenue, totalRevenue, premiumRevenue, vipRevenue, paymentCount, arpu });
    } catch (e) {
      console.error("subscriptions fetch error:", e);
    }

    // ── 최근 활동: 회원가입 + 결제(구독) + 콘텐츠 시청 ───────────────────
    try {
      const now = new Date();
      const calcWhen = (isoStr: string) => {
        const diffMin = Math.floor((now.getTime() - new Date(isoStr).getTime()) / 60000);
        if (diffMin <= 0) return "방금";
        if (diffMin > 60 * 24) return `${Math.floor(diffMin / 1440)}일 전`;
        if (diffMin > 60) return `${Math.floor(diffMin / 60)}시간 전`;
        return `${diffMin}분 전`;
      };

      const logs: ActivityLog[] = [];

      // 최근 회원가입 (profiles)
      const { data: recentProfiles } = await supabase
        .from("profiles")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      (recentProfiles ?? []).forEach((p: Record<string, unknown>) => {
        if (p.created_at) logs.push({ who: "신규 회원", what: "회원가입 완료", when: calcWhen(p.created_at as string) });
      });

      // 최근 결제(구독 시작)
      const { data: recentSubs } = await supabase
        .from("subscriptions")
        .select("membership_level, current_period_start, status")
        .order("current_period_start", { ascending: false })
        .limit(3);
      (recentSubs ?? []).forEach((s: Record<string, unknown>) => {
        if (s.current_period_start && s.status === "active") {
          const level = (s.membership_level as string)?.toUpperCase() ?? "구독";
          logs.push({ who: "결제", what: `${level} 멤버십 결제 완료`, when: calcWhen(s.current_period_start as string) });
        }
      });

      // 최근 콘텐츠 시청 (episode_views)
      const { data: recentViews } = await supabase
        .from("episode_views")
        .select("series_id, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(3);
      (recentViews ?? []).forEach((v: Record<string, unknown>) => {
        if (v.viewed_at) logs.push({ who: "시청", what: "콘텐츠 재생 시작", when: calcWhen(v.viewed_at as string) });
      });

      // 최근 콘텐츠 업로드 (series)
      const { data: recentSeries } = await supabase
        .from("series")
        .select("title, created_at")
        .order("created_at", { ascending: false })
        .limit(2);
      (recentSeries ?? []).forEach((s: Record<string, unknown>) => {
        if (s.created_at) logs.push({ who: "관리자", what: `'${s.title as string}' 콘텐츠 업로드 완료`, when: calcWhen(s.created_at as string) });
      });

      // 최신순 정렬 후 상위 6개
      logs.sort((a, b) => {
        const toMin = (w: string) => {
          if (w === "방금") return 0;
          const m = w.match(/(\d+)(분|시간|일)/);
          if (!m) return 9999;
          const n = Number(m[1]);
          if (m[2] === "분") return n;
          if (m[2] === "시간") return n * 60;
          return n * 1440;
        };
        return toMin(a.when) - toMin(b.when);
      });

      setRecentActivity(
        logs.length > 0
          ? logs.slice(0, 6)
          : [{ who: "시스템", what: "활동 데이터가 없습니다", when: "" }]
      );
    } catch (e) {
      console.error("recent activity fetch error:", e);
    }
  }, [buildGenreShare]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // range 변경 시 episode_views 기반 차트 재조회
  useEffect(() => {
    fetchViewsChart(range);
  }, [range, fetchViewsChart]);

  // 초기 로드 시 차트 데이터 조회
  useEffect(() => {
    fetchViewsChart(range);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 매출 차트
  useEffect(() => {
    fetchRevenueChart(revRange);
  }, [revRange, fetchRevenueChart]);

  useEffect(() => {
    fetchRevenueChart(revRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 콘텐츠 수정 ──────────────────────────────────────────────────────────
  const handleEditSave = async (id: string) => {
    if (!editTitle.trim()) return;
    setContentLoading(true);
    const { error } = await supabase.from("series").update({ title: editTitle.trim() }).eq("id", id);
    if (error) setContentMsg(`수정 실패: ${error.message}`);
    else { setContentMsg("제목이 수정되었습니다."); await fetchAll(); }
    setEditingId(null);
    setContentLoading(false);
  };

  // ── 콘텐츠 삭제 ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" 을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setContentLoading(true);
    // 에피소드 먼저 삭제 (FK)
    await supabase.from("episodes").delete().eq("series_id", id);
    const { error } = await supabase.from("series").delete().eq("id", id);
    if (error) setContentMsg(`삭제 실패: ${error.message}`);
    else { setContentMsg(`"${title}" 삭제 완료`); await fetchAll(); }
    setContentLoading(false);
  };

  // ── 공개/비공개 토글 ─────────────────────────────────────────────────────
  const handleToggleStatus = async (id: string, currentStatus: string | null) => {
    const next = currentStatus === "active" ? "inactive" : "active";
    setContentLoading(true);
    const { error } = await supabase.from("series").update({ status: next }).eq("id", id);
    if (error) setContentMsg(`상태 변경 실패: ${error.message}`);
    else { setContentMsg(`공개 상태가 "${next === "active" ? "공개" : "비공개"}"로 변경되었습니다.`); await fetchAll(); }
    setContentLoading(false);
  };

  // ── 배너 ON/OFF (대표 작품 지정) ────────────────────────────────────────
  const handleToggleBanner = async (id: string, current: boolean | null) => {
    const next = !current;
    setContentLoading(true);
    // 배너 ON으로 새로 켤 때는 정렬순서 맨 뒤(현재 배너 개수)로 배치
    const nextOrder = next
      ? allContents.filter((c) => c.banner_enabled).length
      : 0;
    const { error } = await supabase
      .from("series")
      .update({ banner_enabled: next, banner_order: nextOrder })
      .eq("id", id);
    if (error) setContentMsg(`배너 변경 실패: ${error.message}`);
    else { setContentMsg(next ? "배너에 등록되었습니다." : "배너에서 제외되었습니다."); await fetchAll(); }
    setContentLoading(false);
  };

  // ── 배너 정렬순서 변경 ───────────────────────────────────────────────────
  const handleBannerOrderChange = async (id: string, order: number) => {
    setContentLoading(true);
    const { error } = await supabase.from("series").update({ banner_order: order }).eq("id", id);
    if (error) setContentMsg(`배너 순서 변경 실패: ${error.message}`);
    else await fetchAll();
    setContentLoading(false);
  };

  // ── TOP10 수동 지정 / 자동(해제) ─────────────────────────────────────────
  const handleTop10RankChange = async (id: string, rank: number | null) => {
    setContentLoading(true);
    const { error } = await supabase.from("series").update({ top10_rank: rank }).eq("id", id);
    if (error) setContentMsg(`TOP10 순위 변경 실패: ${error.message}`);
    else { setContentMsg(rank == null ? "TOP10 자동 집계로 전환되었습니다." : `TOP10 ${rank}위로 수동 지정되었습니다.`); await fetchAll(); }
    setContentLoading(false);
  };

  // ── 신작(NEW 배지) ON/OFF ───────────────────────────────────────────────
  const handleToggleNew = async (id: string, current: boolean | null) => {
    const next = !current;
    setContentLoading(true);
    const { error } = await supabase.from("series").update({ is_new: next }).eq("id", id);
    if (error) setContentMsg(`신작 상태 변경 실패: ${error.message}`);
    else { setContentMsg(next ? "신작으로 등록되었습니다." : "신작에서 해제되었습니다."); await fetchAll(); }
    setContentLoading(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // 구독자 관리 (profiles + subscriptions 실 조회/반영)
  // ════════════════════════════════════════════════════════════════════════

  // ── 실제 조회 코드: profiles 전체 컬럼 + subscriptions 전체 컬럼 ─────────
  const fetchMembers = useCallback(async () => {
    setMemberLoading(true);
    setMemberMsg(null);
    try {
      // profiles: 컬럼 구성이 코드상 확인되지 않으므로 select("*")로 비가정 조회.
      // id는 다른 화면(총 회원수 카운트)에서도 사용되는 보장된 컬럼.
      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("id", { ascending: false })
        .limit(200);

      if (profileError) {
        setMemberMsg(`회원 목록 조회 실패: ${profileError.message}`);
        setDashboardError((prev) => ({ ...prev, members: profileError.message }));
        setMembers([]);
        setMemberLoading(false);
        return;
      }
      setDashboardError((prev) => ({ ...prev, members: null }));
      setMembers((profileRows ?? []) as DbProfile[]);

      // subscriptions: 회원별 최신 구독 1건만 매핑 (created_at 내림차순 우선)
      const { data: subRows, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (subError) {
        setMemberMsg(`구독 정보 조회 실패: ${subError.message}`);
      } else {
        const map = new Map<string, DbSubscription>();
        ((subRows ?? []) as DbSubscription[]).forEach((s) => {
          if (!map.has(s.user_id)) map.set(s.user_id, s); // 이미 최신순 정렬됨 → 첫 값만 채택
        });
        setMemberSubs(map);
      }
    } catch (e) {
      setMemberMsg(e instanceof Error ? e.message : "회원 목록 조회 중 오류가 발생했습니다.");
    }
    setMemberLoading(false);
  }, []);

  useEffect(() => {
    if (showMemberManager) fetchMembers();
  }, [showMemberManager, fetchMembers]);

  // ── 실제 저장 코드: Premium/VIP 부여 (subscriptions upsert) ──────────────
  const handleGrantMembership = async (userId: string, level: "premium" | "vip") => {
    setMemberLoading(true);
    setMemberMsg(null);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const existing = memberSubs.get(userId);
    let error;
    if (existing) {
      // 기존 구독 row가 있으면 갱신 (membership_level/status/기간 재설정)
      ({ error } = await supabase
        .from("subscriptions")
        .update({
          membership_level: level,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", existing.id));
    } else {
      // 신규 구독 row 생성
      ({ error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        membership_level: level,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      }));
    }
    if (error) setMemberMsg(`${level.toUpperCase()} 부여 실패: ${error.message}`);
    else { setMemberMsg(`${level.toUpperCase()} 멤버십이 부여되었습니다.`); await fetchMembers(); }
    setMemberLoading(false);
  };

  // ── 실제 저장 코드: 구독 취소 ─────────────────────────────────────────────
  // MySubscription.tsx의 기존 해지 로직(status: 'active' → 'cancelled')과
  // 동일한 값 체계를 그대로 사용 (새로운 상태값을 만들지 않음).
  const handleCancelSubscription = async (userId: string) => {
    const existing = memberSubs.get(userId);
    if (!existing) return;
    setMemberLoading(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", existing.id);
    if (error) setMemberMsg(`구독 취소 실패: ${error.message}`);
    else { setMemberMsg("구독이 취소 처리되었습니다."); await fetchMembers(); }
    setMemberLoading(false);
  };

  // ── 실제 저장 코드: 구독 연장 (+30일) ─────────────────────────────────────
  const handleExtendSubscription = async (userId: string) => {
    const existing = memberSubs.get(userId);
    if (!existing) return;
    setMemberLoading(true);
    const base = existing.current_period_end ? new Date(existing.current_period_end) : new Date();
    const newEnd = new Date(Math.max(base.getTime(), Date.now()));
    newEnd.setDate(newEnd.getDate() + 30);
    const { error } = await supabase
      .from("subscriptions")
      .update({ current_period_end: newEnd.toISOString() })
      .eq("id", existing.id);
    if (error) setMemberMsg(`구독 연장 실패: ${error.message}`);
    else { setMemberMsg("구독 기간이 30일 연장되었습니다."); await fetchMembers(); }
    setMemberLoading(false);
  };

  // ── 회원 검색 (이메일/이름 등 profiles에 존재하는 모든 텍스트 컬럼 대상) ──
  const filteredMembers = members.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.trim().toLowerCase();
    return Object.values(m).some(
      (v) => typeof v === "string" && v.toLowerCase().includes(q)
    );
  });

  const memberDisplayName = (m: DbProfile) =>
    (m.email as string) ?? (m.display_name as string) ?? (m.username as string) ?? (m.name as string) ?? m.id;

  // ════════════════════════════════════════════════════════════════════════
  // 플랫폼 설정 (platform_settings 실 조회/저장)
  // ════════════════════════════════════════════════════════════════════════

  const fetchPlatformSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsMsg(null);
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      // platform_settings 테이블 미생성 시 007_platform_settings.sql 실행 필요
      if (error.message?.includes("schema cache") || error.message?.includes("does not exist") || error.code === "PGRST106" || error.code === "42P01") {
        setSettingsMsg("플랫폼 설정 테이블이 없습니다. Supabase SQL Editor에서 007_platform_settings.sql을 실행하세요.");
      } else {
        setSettingsMsg(`설정 조회 실패: ${error.message}`);
      }
    } else if (data) {
      const s = data as PlatformSettings;
      setPlatformSettings(s);
      setSettingsForm({
        notice: s.notice ?? "",
        hero_banner_text: s.hero_banner_text ?? "",
        recommend_algorithm: s.recommend_algorithm ?? "balanced",
        top10_auto: s.top10_auto ?? true,
        new_release_count: s.new_release_count ?? 10,
      });
    }
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    if (showPlatformSettings) fetchPlatformSettings();
  }, [showPlatformSettings, fetchPlatformSettings]);

  // ── 실제 저장 코드: 플랫폼 설정 저장 (싱글톤 row upsert) ──────────────────
  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    setSettingsMsg(null);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({
        id: 1,
        notice: settingsForm.notice,
        hero_banner_text: settingsForm.hero_banner_text,
        recommend_algorithm: settingsForm.recommend_algorithm,
        top10_auto: settingsForm.top10_auto,
        new_release_count: settingsForm.new_release_count,
        updated_at: new Date().toISOString(),
      });
    if (error) setSettingsMsg(`저장 실패: ${error.message}`);
    else { setSettingsMsg("설정이 저장되었습니다."); await fetchPlatformSettings(); }
    setSettingsLoading(false);
  };

  // ── 차트 경로 계산 ────────────────────────────────────────────────────────
  const maxVal = Math.max(...viewsChartData, 1);
  const areaPath = useMemo(() => {
    const w = 600, h = 180;
    const pts = viewsChartData.map((v, i) => {
      const x = (i / Math.max(viewsChartData.length - 1, 1)) * w;
      const y = h - (v / maxVal) * (h - 16) - 4;
      return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = pts.length >= 2 ? `${line} L${w},${h} L0,${h} Z` : "";
    return { line, area, pts, w, h };
  }, [viewsChartData, maxVal]);

  const palette = ["#D4AF37","#f0d77b","#9c7e23","#caa84b","#8a6c1d","#3a2f10"];

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in admin-grid-bg min-h-screen">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-6 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold/80 mb-1">
            <Crown size={12} /> Framix Studio
          </div>
          <h1 className="text-xl md:text-3xl font-black truncate">
            <span className="text-gradient-gold">FRAMIX</span>{" "}
            <span className="text-text">관리자 센터</span>
          </h1>
          <p className="hidden sm:block text-xs text-white mt-1">실시간 운영 현황과 콘텐츠 퍼포먼스를 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="hidden md:flex w-9 h-9 rounded-full bg-surface border border-border items-center justify-center text-white hover:text-gold hover:border-gold/40 transition-colors" aria-label="검색">
            <Search size={16} />
          </button>
          <button className="hidden md:flex w-9 h-9 rounded-full bg-surface border border-border items-center justify-center text-white hover:text-gold hover:border-gold/40 transition-colors relative" aria-label="알림">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
          </button>
          <Link
            to="/admin/upload"
            className="flex items-center gap-2 bg-surface border border-gold/30 text-gold font-bold text-xs md:text-sm px-3.5 md:px-4 py-2 md:py-2.5 rounded-md hover:border-gold/60 hover:bg-gold/10 transition-all"
          >
            <Clapperboard size={15} />
            <span className="hidden xs:inline">STUDIO</span>
          </Link>
          <Link
            to="/admin/upload"
            className="flex items-center gap-2 bg-gradient-gold text-black font-bold text-xs md:text-sm px-3.5 md:px-5 py-2 md:py-2.5 rounded-md hover:brightness-110 transition-all shadow-lg shadow-gold/20 ring-1 ring-gold/40"
          >
            <Upload size={15} />
            <span className="hidden xs:inline">콘텐츠 업로드</span>
            <span className="xs:hidden">업로드</span>
          </Link>
        </div>
      </div>

      {/* Live Stat cards */}
      {(dashboardError.series || dashboardError.members) && (
        <div className="mb-4 flex flex-col gap-1.5 text-xs px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
          {dashboardError.series && <p>콘텐츠 통계 조회 실패: {dashboardError.series}</p>}
          {dashboardError.members && <p>회원 통계 조회 실패: {dashboardError.members}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: "총 회원수", value: statsLoaded.members ? liveStats.totalMembers.toLocaleString() : "—", icon: Users, accent: "from-gold to-gold-dark", spark: [30,36,34,42,48,52,60,58,66,72,78,84] },
          { label: "총 콘텐츠 수", value: statsLoaded.content ? liveStats.totalContents.toString() : "—", icon: Film, accent: "from-amber-200 to-gold", spark: [10,12,14,18,22,24,26,28,30,30,32,34] },
          { label: "총 조회수", value: statsLoaded.content ? (liveStats.totalViews >= 10000 ? `${(liveStats.totalViews / 10000).toFixed(1)}만` : liveStats.totalViews.toLocaleString()) : "—", icon: Eye, accent: "from-gold-light to-gold", spark: [50,48,55,62,58,70,68,78,82,90,88,96] },
          { label: "총 구독자 수", value: liveStats.totalSubscribers.toLocaleString(), icon: Crown, accent: "from-gold to-gold-light", spark: [88,90,86,80,84,82,78,76,80,78,74,72] },
          { label: "회원가입 수", value: statsLoaded.members ? `+${liveStats.newSignups}` : "—", icon: UserPlus, accent: "from-emerald-400 to-gold", spark: [5,8,12,10,14,18,16,20,22,28,24,30] },
        ].map((s) => (
          <div key={s.label} className="group relative overflow-hidden bg-surface border border-border rounded-2xl p-4 md:p-5 hover:border-gold/40 transition-all admin-card">
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.accent} opacity-[0.07] blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-center justify-between mb-3 relative">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <s.icon size={16} className="text-gold" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black tracking-tight text-white">{s.value}</p>
            <p className="text-[11px] md:text-xs text-white mt-0.5">{s.label}</p>
            <svg viewBox="0 0 100 32" className="w-full h-8 mt-2 overflow-visible">
              <defs>
                <linearGradient id={`g-${s.label}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${sparkPath(s.spark)} L100,32 L0,32 Z`} fill={`url(#g-${s.label})`} />
              <path d={sparkPath(s.spark)} fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </div>

      {/* Subscription Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: "총 구독자수", value: subStats.totalSubscribers, icon: Crown, accent: "from-gold to-gold-dark", color: "text-gold" },
          { label: "Premium 회원", value: subStats.premiumCount, icon: Star, accent: "from-amber-300 to-gold", color: "text-amber-300" },
          { label: "VIP 회원", value: subStats.vipCount, icon: Sparkles, accent: "from-gold-light to-gold", color: "text-gold-light" },
          { label: "해지 예약", value: subStats.cancelledCount, icon: TrendingDown, accent: "from-rose-400 to-rose-600", color: "text-rose-400" },
          { label: "만료", value: subStats.inactiveCount, icon: Activity, accent: "from-text-muted to-border", color: "text-white" },
          { label: "총 회원수", value: liveStats.totalMembers, icon: Users, accent: "from-emerald-400 to-gold", color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="group relative overflow-hidden bg-surface border border-border rounded-2xl p-3 md:p-4 hover:border-gold/40 transition-all admin-card">
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.accent} opacity-[0.07] blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-center justify-between mb-2 relative">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <s.icon size={14} className={s.color} />
              </div>
            </div>
            <p className={`text-lg md:text-xl font-black tracking-tight ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-[10px] md:text-xs text-white mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Stats cards */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-gold" />
          <h2 className="font-bold text-sm text-white md:text-[1rem]">매출 통계</h2>
          <span className="text-[10px] text-white ml-1">· Premium 4,900원 / VIP 9,900원 기준 · active + cancelled 포함</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
          {[
            { label: "오늘 매출", value: revenueStats.todayRevenue, icon: TrendingUp, color: "text-emerald-300", accent: "from-emerald-400 to-emerald-600", fmt: "won" },
            { label: "이번달 매출", value: revenueStats.monthRevenue, icon: BarChart3, color: "text-gold", accent: "from-gold to-gold-dark", fmt: "won" },
            { label: "누적 매출", value: revenueStats.totalRevenue, icon: Sparkles, color: "text-gold-light", accent: "from-gold-light to-gold", fmt: "won" },
            { label: "Premium 매출", value: revenueStats.premiumRevenue, icon: Star, color: "text-amber-300", accent: "from-amber-300 to-gold", fmt: "won" },
            { label: "VIP 매출", value: revenueStats.vipRevenue, icon: Crown, color: "text-gold", accent: "from-gold to-gold-dark", fmt: "won" },
            { label: "결제 건수", value: revenueStats.paymentCount, icon: Activity, color: "text-sky-300", accent: "from-sky-400 to-sky-600", fmt: "count" },
            { label: "ARPU", value: revenueStats.arpu, icon: Users, color: "text-rose-300", accent: "from-rose-400 to-rose-600", fmt: "won" },
          ].map((s) => (
            <div key={s.label} className="group relative overflow-hidden bg-surface border border-border rounded-2xl p-3 md:p-4 hover:border-gold/40 transition-all admin-card">
              <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.accent} opacity-[0.07] blur-2xl group-hover:opacity-20 transition-opacity`} />
              <div className="flex items-center justify-between mb-2 relative">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <s.icon size={14} className={s.color} />
                </div>
              </div>
              <p className={`text-base md:text-lg font-black tracking-tight ${s.color} tabular-nums`}>
                {s.fmt === "won" ? `${s.value.toLocaleString()}원` : `${s.value.toLocaleString()}건`}
              </p>
              <p className="text-[10px] md:text-xs text-white mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 매출 통계 그래프 — subscriptions 기반 실제 데이터 */}
      <div className="mb-6 md:mb-8 bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-gold shrink-0" />
              <h2 className="font-bold text-sm text-white md:text-[1rem] truncate">매출 통계 그래프</h2>
            </div>
            <p className="text-[11px] text-white mt-0.5">단위: 원 · subscriptions 실제 집계</p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 shrink-0">
            {(["일간", "주간", "월간", "누적"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRevRange(r)}
                className={`text-[11px] md:text-xs px-2.5 md:px-3 py-1 rounded-md font-semibold transition-colors ${
                  revRange === r ? "bg-gold text-black" : "text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {revenueChartData.length > 0 ? (
          <>
            <div className="relative">
              <svg viewBox="0 0 600 140" className="w-full h-32 md:h-40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revAreaGold" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((p) => (
                  <line key={p} x1="0" x2="600" y1={140 * p} y2={140 * p} stroke="#2a2a2c" strokeDasharray="3 4" />
                ))}
                {(() => {
                  const maxR = Math.max(...revenueChartData, 1);
                  const pts = revenueChartData.map((v, i) => {
                    const x = (i / Math.max(revenueChartData.length - 1, 1)) * 600;
                    const y = 140 - (v / maxR) * 124 - 4;
                    return [x, y] as const;
                  });
                  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
                  const area = pts.length >= 2 ? `${line} L600,140 L0,140 Z` : "";
                  return (
                    <>
                      {area && <path d={area} fill="url(#revAreaGold)" />}
                      {line && <path d={line} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
                      {pts.map(([x, y], i) =>
                        i === pts.length - 1 ? (
                          <g key={i}>
                            <circle cx={x} cy={y} r="6" fill="#D4AF37" opacity="0.25" />
                            <circle cx={x} cy={y} r="3" fill="#D4AF37" />
                          </g>
                        ) : null
                      )}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white">
              {revenueChartLabels
                .filter((_, i) => i % Math.ceil(revenueChartLabels.length / 8) === 0 || i === revenueChartLabels.length - 1)
                .map((l, i) => <span key={i}>{l}</span>)}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {revenueChartData.slice(-3).map((v, i) => (
                <div key={i} className="text-[11px]">
                  <span className="text-white">{revenueChartLabels[revenueChartData.length - 3 + i] ?? ""}</span>
                  <span className="ml-1.5 font-bold text-gold">{v.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-white text-center py-8">매출 데이터를 불러오는 중...</p>
        )}
      </div>

      {/* Main grid — 조회수 차트(실제 DB) + 장르 분포(실제 DB) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* 조회수 차트 */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-gold shrink-0" />
                <h2 className="font-bold text-sm text-white md:text-[1rem] truncate">조회수 추이</h2>
              </div>
              <p className="text-[11px] text-white mt-0.5">단위: 회 · episode_views 실제 집계</p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 shrink-0">
              {(["7D", "30D", "90D"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[11px] md:text-xs px-2.5 md:px-3 py-1 rounded-md font-semibold transition-colors ${
                    range === r ? "bg-gold text-black" : "text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <svg viewBox={`0 0 ${areaPath.w} ${areaPath.h}`} className="w-full h-44 md:h-56" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGold" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((p) => (
                <line key={p} x1="0" x2={areaPath.w} y1={areaPath.h * p} y2={areaPath.h * p}
                  stroke="#2a2a2c" strokeDasharray="3 4" />
              ))}
              {areaPath.area && <path d={areaPath.area} fill="url(#areaGold)" />}
              {areaPath.line && <path d={areaPath.line} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {areaPath.pts.map(([x, y], i) =>
                i === areaPath.pts.length - 1 ? (
                  <g key={i}>
                    <circle cx={x} cy={y} r="6" fill="#D4AF37" opacity="0.25" />
                    <circle cx={x} cy={y} r="3" fill="#D4AF37" />
                  </g>
                ) : null
              )}
            </svg>
          </div>

          <div className="flex justify-between mt-2 text-[10px] text-white">
            {viewsChartLabels.filter((_, i) => i % Math.ceil(viewsChartLabels.length / 7) === 0).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        {/* 장르 분포 — 실제 DB */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-gold" />
            <h2 className="font-bold text-sm text-white md:text-[1rem]">장르별 시청 분포</h2>
          </div>
          {genreShare.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <svg viewBox="0 0 100 100" className="w-32 h-32 md:w-36 md:h-36 -rotate-90">
                  {(() => {
                    let offset = 0;
                    const C = 2 * Math.PI * 36;
                    return genreShare.map((g, i) => {
                      const len = (g.pct / 100) * C;
                      const el = (
                        <circle key={g.name} cx="50" cy="50" r="36" fill="none"
                          stroke={palette[i % palette.length]} strokeWidth="14"
                          strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
                      );
                      offset += len;
                      return el;
                    });
                  })()}
                  <circle cx="50" cy="50" r="26" fill="#0f0f10" />
                </svg>
              </div>
              <div className="space-y-1.5">
                {genreShare.map((g, i) => (
                  <div key={g.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: palette[i % palette.length] }} />
                    <span className="flex-1 text-white truncate">{g.name}</span>
                    <span className="font-semibold tabular-nums text-white">{g.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-white text-center py-8">콘텐츠가 없습니다</p>
          )}
        </div>
      </div>

      {/* 인기 콘텐츠 TOP + 최근 활동 — 실제 DB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden admin-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <PlayCircle size={15} className="text-gold shrink-0" />
              <h2 className="font-bold text-sm text-white md:text-[1rem] truncate">인기 콘텐츠 TOP 6</h2>
              <span className="text-[10px] text-white">· 실제 조회수 순</span>
            </div>
            <button
              onClick={() => setShowContentManager((v) => !v)}
              className="text-[11px] md:text-xs text-gold font-semibold hover:underline shrink-0"
            >
              전체 관리 →
            </button>
          </div>
          {topDramas.length === 0 ? (
            <p className="text-xs text-white text-center py-8">등록된 콘텐츠가 없습니다</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[24px_56px_minmax(0,1fr)_90px_90px_30px] gap-3 px-5 py-2 text-[10px] uppercase tracking-wider text-white border-b border-border bg-surface-2/40">
                  <span>#</span><span /><span>제목</span><span>평점</span><span>조회수</span><span />
                </div>
                <div className="divide-y divide-border">
                  {topDramas.map((d, i) => (
                    <div key={d.id} className="grid grid-cols-[24px_56px_minmax(0,1fr)_90px_90px_30px] gap-3 items-center px-5 py-3 hover:bg-surface-2/40 transition-colors">
                      <span className="text-gold font-black text-sm tabular-nums">{i + 1}</span>
                      {d.thumbnail_url ? (
                        <img src={d.thumbnail_url} alt={d.title} className="w-12 h-16 object-cover rounded-md" />
                      ) : (
                        <div className="w-12 h-16 rounded-md bg-surface-2 flex items-center justify-center">
                          <Film size={16} className="text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-white">{d.title}</p>
                        <p className="text-[11px] text-white truncate mt-0.5">
                          {(d.genres?.slice(0, 2) ?? [d.genre ?? "기타"]).join(" · ")}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.status === "active" ? "text-emerald-400" : "text-rose-400"}`}>
                          {d.status === "active" ? "공개" : "비공개"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold flex items-center gap-1 text-white">
                        <Star size={12} className="text-gold fill-gold" />
                        {(d.rating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-white">
                        {d.views != null ? (d.views >= 10000 ? `${(d.views / 10000).toFixed(0)}만` : d.views.toLocaleString()) : "—"}
                      </span>
                      <button className="text-white hover:text-gold" aria-label="더보기">
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mobile list */}
              <div className="md:hidden divide-y divide-border">
                {topDramas.map((d, i) => (
                  <div key={d.id} className="grid grid-cols-[20px_44px_minmax(0,1fr)_auto] gap-3 items-center p-3">
                    <span className="text-gold font-black text-sm tabular-nums">{i + 1}</span>
                    {d.thumbnail_url ? (
                      <img src={d.thumbnail_url} alt={d.title} className="w-11 h-14 object-cover rounded-md" />
                    ) : (
                      <div className="w-11 h-14 rounded-md bg-surface-2 flex items-center justify-center">
                        <Film size={14} className="text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-white">{d.title}</p>
                      <p className="text-[11px] text-white mt-0.5 flex items-center gap-1">
                        <Star size={10} className="text-gold fill-gold" />
                        {(d.rating ?? 0).toFixed(1)} · {(d.genres?.[0] ?? d.genre ?? "기타")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-white">
                        {d.views != null ? `${(d.views / 10000).toFixed(0)}만` : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 최근 활동 — 실제 업로드 로그 */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-5 admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-gold" />
            <h2 className="font-bold text-sm text-white md:text-[1rem]">최근 활동</h2>
            <span className="text-[10px] text-white">· 회원가입 · 결제 · 시청</span>
          </div>
          <ol className="relative space-y-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border">
            {recentActivity.map((a, i) => (
              <li key={i} className="pl-5 relative">
                <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-base" />
                <p className="text-xs md:text-sm leading-snug text-white">{a.what}</p>
                <p className="text-[10px] text-white mt-0.5">{a.who}{a.when ? ` · ${a.when}` : ""}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── 전체 콘텐츠 관리 패널 ─────────────────────────────────────────────── */}
      {showContentManager && (
        <div className="mb-6 md:mb-8 bg-surface border border-gold/30 rounded-2xl overflow-hidden admin-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border bg-gold/5">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-gold" />
              <h2 className="font-bold text-sm text-white md:text-[1rem]">전체 콘텐츠 관리</h2>
              <span className="text-[10px] text-white">· 수정 · 삭제 · 공개/비공개</span>
            </div>
            <button onClick={() => setShowContentManager(false)} className="text-white hover:text-white text-xs">닫기</button>
          </div>

          {contentMsg && (
            <div className="mx-4 mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold">
              <CheckCircle size={13} />
              {contentMsg}
              <button onClick={() => setContentMsg(null)} className="ml-auto text-white hover:text-white">✕</button>
            </div>
          )}

          {contentLoading && (
            <div className="flex items-center gap-2 px-5 py-3 text-xs text-white">
              <AlertCircle size={13} className="animate-spin" /> 처리 중...
            </div>
          )}

          {allContents.length === 0 ? (
            <p className="text-xs text-white text-center py-8">등록된 콘텐츠가 없습니다</p>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {allContents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-surface-2/40 transition-colors">
                  {d.thumbnail_url ? (
                    <img src={d.thumbnail_url} alt={d.title} className="w-10 h-14 object-cover rounded-md shrink-0" />
                  ) : (
                    <div className="w-10 h-14 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                      <Film size={14} className="text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {editingId === d.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 bg-surface-2 border border-gold/40 rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-gold"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(d.id); if (e.key === "Escape") setEditingId(null); }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditSave(d.id)}
                          className="text-xs px-2 py-1 bg-gold text-black rounded font-semibold"
                        >저장</button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-2 py-1 bg-surface border border-border rounded text-white"
                        >취소</button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold truncate text-white">{d.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-white">{d.genres?.[0] ?? d.genre ?? "장르 미설정"}</span>
                      <span className="text-[10px] text-white">·</span>
                      <span className="text-[10px] text-white">
                        {d.views != null ? `${(d.views / 10000).toFixed(1)}만 조회` : "조회수 없음"}
                      </span>
                      <span className={`text-[10px] font-semibold ${d.status === "active" ? "text-emerald-400" : "text-rose-400"}`}>
                        {d.status === "active" ? "● 공개" : "● 비공개"}
                      </span>
                      {d.banner_enabled && (
                        <span className="text-[10px] font-semibold text-gold">★ 배너 #{d.banner_order ?? 0}</span>
                      )}
                      {d.top10_rank != null && (
                        <span className="text-[10px] font-semibold text-sky-400">TOP10 #{d.top10_rank}</span>
                      )}
                      {d.is_new && (
                        <span className="text-[10px] font-semibold text-emerald-300">NEW</span>
                      )}
                    </div>
                    {/* 배너 / TOP10 / 신작 관리 컨트롤 */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <button
                        onClick={() => handleToggleBanner(d.id, d.banner_enabled)}
                        className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                          d.banner_enabled
                            ? "bg-gold/10 border-gold/40 text-gold"
                            : "bg-surface-2 border-border text-white hover:text-gold hover:border-gold/40"
                        }`}
                        title="배너 ON/OFF"
                      >
                        <Star size={10} className={d.banner_enabled ? "fill-gold" : ""} />
                        배너 {d.banner_enabled ? "ON" : "OFF"}
                      </button>
                      {d.banner_enabled && (
                        <input
                          type="number"
                          className="w-14 bg-surface-2 border border-border rounded px-1.5 py-1 text-[10px] text-text focus:outline-none focus:border-gold"
                          value={d.banner_order ?? 0}
                          onChange={(e) => handleBannerOrderChange(d.id, Number(e.target.value))}
                          title="배너 정렬순서"
                        />
                      )}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          placeholder="자동"
                          className="w-14 bg-surface-2 border border-border rounded px-1.5 py-1 text-[10px] text-text placeholder:text-text-muted focus:outline-none focus:border-gold"
                          value={d.top10_rank ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            handleTop10RankChange(d.id, v === "" ? null : Number(v));
                          }}
                          title="TOP10 수동 순위 (비우면 자동 집계)"
                        />
                        {d.top10_rank != null && (
                          <button
                            onClick={() => handleTop10RankChange(d.id, null)}
                            className="text-[10px] px-1.5 py-1 rounded-md bg-surface-2 border border-border text-white hover:text-sky-400 hover:border-sky-400/40"
                            title="자동 집계로 전환"
                          >
                            자동
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleNew(d.id, d.is_new)}
                        className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                          d.is_new
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-surface-2 border-border text-white hover:text-emerald-300 hover:border-emerald-400/40"
                        }`}
                        title="신작(NEW 배지) ON/OFF"
                      >
                        <Sparkles size={10} />
                        NEW {d.is_new ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 자막 관리 */}
                    <button
                      onClick={() => setSubtitleTarget({ id: d.id, title: d.title })}
                      className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-white hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-colors"
                      aria-label="자막 관리"
                      title="자막 관리"
                    >
                      <Subtitles size={13} />
                    </button>
                    {/* 수정 */}
                    <button
                      onClick={() => { setEditingId(d.id); setEditTitle(d.title); }}
                      className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-white hover:text-gold hover:border-gold/40 transition-colors"
                      aria-label="제목 수정"
                      title="제목 수정"
                    >
                      <Edit2 size={13} />
                    </button>
                    {/* 공개/비공개 토글 */}
                    <button
                      onClick={() => handleToggleStatus(d.id, d.status)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                        d.status === "active"
                          ? "bg-surface-2 border-border text-white hover:text-amber-400 hover:border-amber-400/40"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                      aria-label={d.status === "active" ? "비공개로 전환" : "공개로 전환"}
                      title={d.status === "active" ? "비공개로 전환" : "공개로 전환"}
                    >
                      <EyeOff size={13} />
                    </button>
                    {/* 삭제 */}
                    <button
                      onClick={() => handleDelete(d.id, d.title)}
                      className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-white hover:text-rose-400 hover:border-rose-400/40 transition-colors"
                      aria-label="삭제"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 구독자 관리 패널 ──────────────────────────────────────────────────── */}
      {showMemberManager && (
        <div className="mb-6 md:mb-8 bg-surface border border-gold/30 rounded-2xl overflow-hidden admin-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border bg-gold/5">
            <div className="flex items-center gap-2">
              <UserCog size={15} className="text-gold" />
              <h2 className="font-bold text-sm text-white md:text-[1rem]">구독자 관리</h2>
              <span className="text-[10px] text-white">· 회원 목록 · Premium/VIP 부여 · 취소 · 연장</span>
            </div>
            <button onClick={() => setShowMemberManager(false)} className="text-white hover:text-white text-xs">닫기</button>
          </div>

          {/* 검색 */}
          <div className="px-4 md:px-5 pt-3">
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2">
              <Search size={14} className="text-white shrink-0" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="이메일, 이름 등으로 회원 검색"
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          {memberMsg && (
            <div className="mx-4 md:mx-5 mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold">
              <CheckCircle size={13} />
              {memberMsg}
              <button onClick={() => setMemberMsg(null)} className="ml-auto text-white hover:text-white">✕</button>
            </div>
          )}

          {memberLoading && (
            <div className="flex items-center gap-2 px-5 py-3 text-xs text-white">
              <AlertCircle size={13} className="animate-spin" /> 처리 중...
            </div>
          )}

          {!memberLoading && members.length === 0 ? (
            <div className="text-xs text-white text-center py-8 px-6 space-y-1.5">
              {dashboardError.members ? (
                <p className="text-rose-300">회원 데이터를 불러올 수 없습니다: {dashboardError.members}</p>
              ) : (
                <>
                  <p>조회된 회원이 없습니다.</p>
                  <p>실제 가입된 회원이 있는데도 이 화면에 보이지 않는다면, profiles 테이블의
                    RLS(Row Level Security) 정책이 "본인 행만 조회 가능"으로 설정되어 있어
                    관리자 화면에서는 비어 보이는 경우가 가장 흔합니다.
                    supabase/migrations/018_admin_visibility_fix.sql 적용 여부를 확인하세요.</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[520px] overflow-y-auto mt-2">
              {filteredMembers.map((m) => {
                const sub = memberSubs.get(m.id);
                const isActiveSub = sub && (sub.status === "active" || sub.status === "cancelled");
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-surface-2/40 transition-colors flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0">
                      <Users size={14} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-white">{memberDisplayName(m)}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-white font-mono truncate max-w-[160px]">{m.id}</span>
                        {sub ? (
                          <span
                            className={`text-[10px] font-semibold ${
                              sub.status === "active"
                                ? "text-emerald-400"
                                : sub.status === "cancelled"
                                ? "text-amber-400"
                                : "text-white"
                            }`}
                          >
                            ● {sub.membership_level?.toUpperCase()} ·{" "}
                            {sub.status === "active" ? "구독중" : sub.status === "cancelled" ? "해지예약" : "만료"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white">구독 없음</span>
                        )}
                      </div>
                    </div>
                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleGrantMembership(m.id, "premium")}
                        className="text-[10px] px-2 py-1.5 rounded-md bg-surface-2 border border-border text-white hover:text-gold hover:border-gold/40 flex items-center gap-1"
                        title="Premium 부여"
                      >
                        <Sparkles size={11} /> Premium
                      </button>
                      <button
                        onClick={() => handleGrantMembership(m.id, "vip")}
                        className="text-[10px] px-2 py-1.5 rounded-md bg-surface-2 border border-border text-white hover:text-gold hover:border-gold/40 flex items-center gap-1"
                        title="VIP 부여"
                      >
                        <Gem size={11} /> VIP
                      </button>
                      <button
                        onClick={() => handleExtendSubscription(m.id)}
                        disabled={!sub}
                        className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-white hover:text-emerald-400 hover:border-emerald-400/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="구독 30일 연장"
                        aria-label="구독 연장"
                      >
                        <CalendarPlus size={13} />
                      </button>
                      <button
                        onClick={() => handleCancelSubscription(m.id)}
                        disabled={!isActiveSub || sub?.status !== "active"}
                        className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-white hover:text-rose-400 hover:border-rose-400/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="구독 취소"
                        aria-label="구독 취소"
                      >
                        <XCircle size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 플랫폼 설정 패널 ──────────────────────────────────────────────────── */}
      {showPlatformSettings && (
        <div className="mb-6 md:mb-8 bg-surface border border-gold/30 rounded-2xl overflow-hidden admin-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border bg-gold/5">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-gold" />
              <h2 className="font-bold text-sm text-white md:text-[1rem]">플랫폼 설정</h2>
              <span className="text-[10px] text-white">· 공지사항 · 배너 문구 · 추천 알고리즘</span>
            </div>
            <button onClick={() => setShowPlatformSettings(false)} className="text-white hover:text-white text-xs">닫기</button>
          </div>

          {settingsMsg && (
            <div className="mx-4 md:mx-5 mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold">
              <CheckCircle size={13} />
              {settingsMsg}
              <button onClick={() => setSettingsMsg(null)} className="ml-auto text-white hover:text-white">✕</button>
            </div>
          )}

          <div className="p-4 md:p-5 space-y-4">
            {/* 공지사항 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1.5">
                <Megaphone size={12} className="text-gold" /> 공지사항
              </label>
              <textarea
                value={settingsForm.notice}
                onChange={(e) => setSettingsForm((f) => ({ ...f, notice: e.target.value }))}
                rows={2}
                placeholder="사이트 상단 등에 노출할 공지 문구"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
              />
            </div>

            {/* 메인 배너 문구 */}
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">메인 배너 문구</label>
              <input
                value={settingsForm.hero_banner_text}
                onChange={(e) => setSettingsForm((f) => ({ ...f, hero_banner_text: e.target.value }))}
                placeholder="홈 히어로 배너에 노출할 캐치프레이즈"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 추천 알고리즘 */}
              <div>
                <label className="text-xs font-semibold text-white mb-1.5 block">추천 알고리즘</label>
                <select
                  value={settingsForm.recommend_algorithm}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, recommend_algorithm: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-gold"
                >
                  <option value="balanced">균형(평점+조회수+신작)</option>
                  <option value="views">조회수 우선</option>
                  <option value="rating">평점 우선</option>
                  <option value="latest">최신순</option>
                </select>
              </div>

              {/* TOP10 자동 여부 */}
              <div>
                <label className="text-xs font-semibold text-white mb-1.5 block">TOP10 자동 집계</label>
                <button
                  onClick={() => setSettingsForm((f) => ({ ...f, top10_auto: !f.top10_auto }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    settingsForm.top10_auto
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-surface-2 border-border text-white"
                  }`}
                >
                  {settingsForm.top10_auto ? "자동 ON (조회수 기준)" : "자동 OFF (수동 우선)"}
                </button>
              </div>

              {/* 신작 노출 개수 */}
              <div>
                <label className="text-xs font-semibold text-white mb-1.5 block">신작 노출 개수</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settingsForm.new_release_count}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, new_release_count: Number(e.target.value) }))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveSettings}
                disabled={settingsLoading}
                className="flex items-center gap-2 bg-gradient-gold text-black font-bold text-xs md:text-sm px-4 py-2.5 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
              >
                <Save size={14} /> 설정 저장
              </button>
              <button
                onClick={fetchPlatformSettings}
                disabled={settingsLoading}
                className="flex items-center gap-2 bg-surface-2 border border-border text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-md hover:text-gold hover:border-gold/40 transition-all disabled:opacity-50"
              >
                <RefreshCw size={13} className={settingsLoading ? "animate-spin" : ""} /> 새로고침
              </button>
              {platformSettings?.updated_at && (
                <span className="text-[10px] text-white ml-auto">
                  마지막 저장: {new Date(platformSettings.updated_at).toLocaleString("ko-KR")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { to: "/admin/upload", icon: Upload, title: "콘텐츠 업로드", desc: "새 드라마/에피소드 등록", onClick: undefined as (() => void) | undefined },
          { to: null, icon: Users, title: "구독자 관리", desc: "멤버십 및 결제 관리", onClick: () => setShowMemberManager((v) => !v) },
          { to: null, icon: Settings, title: "플랫폼 설정", desc: "배너, 추천 알고리즘 설정", onClick: () => setShowPlatformSettings((v) => !v) },
        ].map((a) => {
          const Inner = (
            <div className="group bg-surface border border-border rounded-2xl p-4 hover:border-gold/50 transition-all flex items-center gap-3 admin-card h-full">
              <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors shrink-0">
                <a.icon size={18} className="text-gold" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate text-white">{a.title}</p>
                <p className="text-[11px] text-white mt-0.5 truncate">{a.desc}</p>
              </div>
            </div>
          );
          return a.to ? (
            <Link key={a.title} to={a.to}>{Inner}</Link>
          ) : (
            <div key={a.title} className="cursor-pointer" onClick={a.onClick}>{Inner}</div>
          );
        })}
      </div>

      {/* ── 자막 관리 모달 ─────────────────────────────────────────────────── */}
      {subtitleTarget && (
        <SubtitleManager
          seriesId={subtitleTarget.id}
          seriesTitle={subtitleTarget.title}
          onClose={() => setSubtitleTarget(null)}
        />
      )}
    </div>
  );
}
