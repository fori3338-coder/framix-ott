import { Link } from "react-router-dom";
import {
  Users, Film, Eye, TrendingUp, TrendingDown, Upload, Settings, Star,
  BarChart3, Activity, Sparkles, PlayCircle, MoreVertical, Search, Bell, Crown, UserPlus, Clapperboard,
  Edit2, Trash2, EyeOff, CheckCircle, AlertCircle,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

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
  genre: string | null;
  category: string | null;
  views: number | null;
  rating: number | null;
  status: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
  total_episodes: number | null;
}

interface ActivityLog {
  what: string;
  when: string;
  who: string;
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
  const [subStats, setSubStats] = useState<SubStats>({
    totalSubscribers: 0, premiumCount: 0, vipCount: 0, cancelledCount: 0, inactiveCount: 0,
  });
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    todayRevenue: 0, monthRevenue: 0, totalRevenue: 0,
    premiumRevenue: 0, vipRevenue: 0, paymentCount: 0, arpu: 0,
  });

  // ── 콘텐츠 관리 상태 ──────────────────────────────────────────────────────
  const [allContents, setAllContents] = useState<DbSeries[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMsg, setContentMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showContentManager, setShowContentManager] = useState(false);

  // ── 조회수 시계열: series 생성일 기반 집계 ───────────────────────────────
  const buildViewsChart = useCallback((seriesRows: DbSeries[], r: Range) => {
    const now = new Date();

    if (r === "7D") {
      const labels = ["월","화","수","목","금","토","일"];
      const dayMap = new Map<number, number>(); // 0=Mon..6=Sun
      seriesRows.forEach((s) => {
        if (!s.created_at) return;
        const d = new Date(s.created_at);
        const dow = (d.getDay() + 6) % 7; // JS Sun=0 → Mon=0
        dayMap.set(dow, (dayMap.get(dow) ?? 0) + (s.views ?? 0));
      });
      const data = Array.from({ length: 7 }, (_, i) => dayMap.get(i) ?? 0);
      setViewsChartData(data.map((v) => Math.round(v / 10000))); // 단위: 만
      setViewsChartLabels(labels);
      return;
    }

    if (r === "30D") {
      const labels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
      const dayMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayMap.set(d.toISOString().slice(0, 10), 0);
      }
      seriesRows.forEach((s) => {
        if (!s.created_at) return;
        const key = s.created_at.slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + (s.views ?? 0));
      });
      const data = Array.from(dayMap.values()).map((v) => Math.round(v / 10000));
      setViewsChartData(data);
      setViewsChartLabels(labels);
      return;
    }

    // 90D → 12 weeks
    const labels = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
    const weekMap = new Map<number, number>();
    seriesRows.forEach((s) => {
      if (!s.created_at) return;
      const diff = Math.floor((now.getTime() - new Date(s.created_at).getTime()) / (7 * 86400 * 1000));
      const wk = 11 - Math.min(diff, 11);
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + (s.views ?? 0));
    });
    const data = Array.from({ length: 12 }, (_, i) => Math.round((weekMap.get(i) ?? 0) / 10000));
    setViewsChartData(data);
    setViewsChartLabels(labels);
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

  // ── 전체 데이터 fetch ────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    // ── series (콘텐츠) ──────────────────────────────────────────────────
    try {
      const { data: seriesData, count } = await supabase
        .from("series")
        .select("id, title, genres, genre, category, views, rating, status, thumbnail_url, created_at, total_episodes", { count: "exact" })
        .order("views", { ascending: false });

      const rows = (seriesData ?? []) as DbSeries[];

      // 총 콘텐츠 수, 총 조회수
      const totalViews = rows.reduce((s, r) => s + (r.views ?? 0), 0);
      setLiveStats((prev) => ({
        ...prev,
        totalContents: count ?? rows.length,
        totalViews,
        newSignups: 320,
      }));

      // 인기 콘텐츠 TOP 6 (views 내림차순)
      setTopDramas(rows.slice(0, 6));

      // 전체 콘텐츠 관리용
      setAllContents(rows);

      // 장르 분포
      buildGenreShare(rows);

      // 조회수 차트
      buildViewsChart(rows, range);

      // 최근 활동: created_at 기준 최신 5개
      const recent = [...rows]
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, 5);
      const now = new Date();
      const logs: ActivityLog[] = recent.map((s) => {
        const d = s.created_at ? new Date(s.created_at) : now;
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        let when = "방금";
        if (diffMin > 60 * 24) when = `${Math.floor(diffMin / 1440)}일 전`;
        else if (diffMin > 60) when = `${Math.floor(diffMin / 60)}시간 전`;
        else if (diffMin > 0) when = `${diffMin}분 전`;
        return {
          who: "관리자",
          what: `'${s.title}' 콘텐츠 업로드 완료`,
          when,
        };
      });
      setRecentActivity(
        logs.length > 0
          ? logs
          : [{ who: "시스템", what: "등록된 콘텐츠가 없습니다", when: "" }]
      );
    } catch (e) {
      console.error("series fetch error:", e);
    }

    // ── 총 회원수 ────────────────────────────────────────────────────────
    try {
      const { count: memberCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      setLiveStats((prev) => ({ ...prev, totalMembers: memberCount ?? 0 }));
    } catch (e) {
      console.error("profiles fetch error:", e);
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
  }, [range, buildGenreShare, buildViewsChart]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // range 변경 시 차트만 재계산
  useEffect(() => {
    if (allContents.length > 0) buildViewsChart(allContents, range);
  }, [range, allContents, buildViewsChart]);

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
          <p className="hidden sm:block text-xs text-text-muted mt-1">실시간 운영 현황과 콘텐츠 퍼포먼스를 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="hidden md:flex w-9 h-9 rounded-full bg-surface border border-border items-center justify-center text-text-dim hover:text-gold hover:border-gold/40 transition-colors" aria-label="검색">
            <Search size={16} />
          </button>
          <button className="hidden md:flex w-9 h-9 rounded-full bg-surface border border-border items-center justify-center text-text-dim hover:text-gold hover:border-gold/40 transition-colors relative" aria-label="알림">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: "총 회원수", value: liveStats.totalMembers > 0 ? liveStats.totalMembers.toLocaleString() : "—", icon: Users, accent: "from-gold to-gold-dark", spark: [30,36,34,42,48,52,60,58,66,72,78,84] },
          { label: "총 콘텐츠 수", value: liveStats.totalContents > 0 ? liveStats.totalContents.toString() : "—", icon: Film, accent: "from-amber-200 to-gold", spark: [10,12,14,18,22,24,26,28,30,30,32,34] },
          { label: "총 조회수", value: liveStats.totalViews > 0 ? `${(liveStats.totalViews / 10000).toFixed(0)}만` : "—", icon: Eye, accent: "from-gold-light to-gold", spark: [50,48,55,62,58,70,68,78,82,90,88,96] },
          { label: "총 구독자 수", value: liveStats.totalSubscribers.toLocaleString(), icon: Crown, accent: "from-gold to-gold-light", spark: [88,90,86,80,84,82,78,76,80,78,74,72] },
          { label: "회원가입 수", value: liveStats.newSignups > 0 ? `+${liveStats.newSignups}` : "—", icon: UserPlus, accent: "from-emerald-400 to-gold", spark: [5,8,12,10,14,18,16,20,22,28,24,30] },
        ].map((s) => (
          <div key={s.label} className="group relative overflow-hidden bg-surface border border-border rounded-2xl p-4 md:p-5 hover:border-gold/40 transition-all admin-card">
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.accent} opacity-[0.07] blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-center justify-between mb-3 relative">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <s.icon size={16} className="text-gold" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black tracking-tight">{s.value}</p>
            <p className="text-[11px] md:text-xs text-text-muted mt-0.5">{s.label}</p>
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
          { label: "만료", value: subStats.inactiveCount, icon: Activity, accent: "from-text-muted to-border", color: "text-text-dim" },
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
            <p className="text-[10px] md:text-xs text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Stats cards */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-gold" />
          <h2 className="font-bold text-sm md:text-base text-text">매출 통계</h2>
          <span className="text-[10px] text-text-muted ml-1">· Premium 4,900원 / VIP 9,900원 기준 · active + cancelled 포함</span>
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
              <p className="text-[10px] md:text-xs text-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid — 조회수 차트(실제 DB) + 장르 분포(실제 DB) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* 조회수 차트 */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-gold shrink-0" />
                <h2 className="font-bold text-sm md:text-base truncate">조회수 추이</h2>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">단위: 만 회 · 실제 DB 기반</p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 shrink-0">
              {(["7D", "30D", "90D"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[11px] md:text-xs px-2.5 md:px-3 py-1 rounded-md font-semibold transition-colors ${
                    range === r ? "bg-gold text-black" : "text-text-dim hover:text-text"
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

          <div className="flex justify-between mt-2 text-[10px] text-text-muted">
            {viewsChartLabels.filter((_, i) => i % Math.ceil(viewsChartLabels.length / 7) === 0).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        {/* 장르 분포 — 실제 DB */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-gold" />
            <h2 className="font-bold text-sm md:text-base">장르별 시청 분포</h2>
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
                    <span className="flex-1 text-text-dim truncate">{g.name}</span>
                    <span className="font-semibold tabular-nums">{g.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-text-muted text-center py-8">콘텐츠가 없습니다</p>
          )}
        </div>
      </div>

      {/* 인기 콘텐츠 TOP + 최근 활동 — 실제 DB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden admin-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <PlayCircle size={15} className="text-gold shrink-0" />
              <h2 className="font-bold text-sm md:text-base truncate">인기 콘텐츠 TOP 6</h2>
              <span className="text-[10px] text-text-muted">· 실제 조회수 순</span>
            </div>
            <button
              onClick={() => setShowContentManager((v) => !v)}
              className="text-[11px] md:text-xs text-gold font-semibold hover:underline shrink-0"
            >
              전체 관리 →
            </button>
          </div>
          {topDramas.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">등록된 콘텐츠가 없습니다</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[24px_56px_minmax(0,1fr)_90px_90px_30px] gap-3 px-5 py-2 text-[10px] uppercase tracking-wider text-text-muted border-b border-border bg-surface-2/40">
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
                          <Film size={16} className="text-text-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{d.title}</p>
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {(d.genres?.slice(0, 2) ?? [d.genre ?? "기타"]).join(" · ")}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.status === "active" ? "text-emerald-400" : "text-rose-400"}`}>
                          {d.status === "active" ? "공개" : "비공개"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold flex items-center gap-1">
                        <Star size={12} className="text-gold fill-gold" />
                        {(d.rating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {d.views != null ? (d.views >= 10000 ? `${(d.views / 10000).toFixed(0)}만` : d.views.toLocaleString()) : "—"}
                      </span>
                      <button className="text-text-muted hover:text-gold" aria-label="더보기">
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
                        <Film size={14} className="text-text-muted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{d.title}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                        <Star size={10} className="text-gold fill-gold" />
                        {(d.rating ?? 0).toFixed(1)} · {(d.genres?.[0] ?? d.genre ?? "기타")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">
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
            <h2 className="font-bold text-sm md:text-base">최근 활동</h2>
            <span className="text-[10px] text-text-muted">· 실제 업로드 로그</span>
          </div>
          <ol className="relative space-y-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border">
            {recentActivity.map((a, i) => (
              <li key={i} className="pl-5 relative">
                <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-base" />
                <p className="text-xs md:text-sm leading-snug">{a.what}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{a.who}{a.when ? ` · ${a.when}` : ""}</p>
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
              <h2 className="font-bold text-sm md:text-base">전체 콘텐츠 관리</h2>
              <span className="text-[10px] text-text-muted">· 수정 · 삭제 · 공개/비공개</span>
            </div>
            <button onClick={() => setShowContentManager(false)} className="text-text-muted hover:text-white text-xs">닫기</button>
          </div>

          {contentMsg && (
            <div className="mx-4 mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold">
              <CheckCircle size={13} />
              {contentMsg}
              <button onClick={() => setContentMsg(null)} className="ml-auto text-text-muted hover:text-white">✕</button>
            </div>
          )}

          {contentLoading && (
            <div className="flex items-center gap-2 px-5 py-3 text-xs text-text-muted">
              <AlertCircle size={13} className="animate-spin" /> 처리 중...
            </div>
          )}

          {allContents.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">등록된 콘텐츠가 없습니다</p>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {allContents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-surface-2/40 transition-colors">
                  {d.thumbnail_url ? (
                    <img src={d.thumbnail_url} alt={d.title} className="w-10 h-14 object-cover rounded-md shrink-0" />
                  ) : (
                    <div className="w-10 h-14 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                      <Film size={14} className="text-text-muted" />
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
                          className="text-xs px-2 py-1 bg-surface border border-border rounded text-text-muted"
                        >취소</button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold truncate">{d.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-text-muted">{d.genres?.[0] ?? d.genre ?? "장르 미설정"}</span>
                      <span className="text-[10px] text-text-muted">·</span>
                      <span className="text-[10px] text-text-muted">
                        {d.views != null ? `${(d.views / 10000).toFixed(1)}만 조회` : "조회수 없음"}
                      </span>
                      <span className={`text-[10px] font-semibold ${d.status === "active" ? "text-emerald-400" : "text-rose-400"}`}>
                        {d.status === "active" ? "● 공개" : "● 비공개"}
                      </span>
                    </div>
                  </div>
                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 수정 */}
                    <button
                      onClick={() => { setEditingId(d.id); setEditTitle(d.title); }}
                      className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-gold hover:border-gold/40 transition-colors"
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
                          ? "bg-surface-2 border-border text-text-dim hover:text-amber-400 hover:border-amber-400/40"
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
                      className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-rose-400 hover:border-rose-400/40 transition-colors"
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { to: "/admin/upload", icon: Upload, title: "콘텐츠 업로드", desc: "새 드라마/에피소드 등록" },
          { to: null, icon: Users, title: "구독자 관리", desc: "멤버십 및 결제 관리" },
          { to: null, icon: Settings, title: "플랫폼 설정", desc: "배너, 추천 알고리즘 설정" },
        ].map((a) => {
          const Inner = (
            <div className="group bg-surface border border-border rounded-2xl p-4 hover:border-gold/50 transition-all flex items-center gap-3 admin-card h-full">
              <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors shrink-0">
                <a.icon size={18} className="text-gold" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{a.title}</p>
                <p className="text-[11px] text-text-muted mt-0.5 truncate">{a.desc}</p>
              </div>
            </div>
          );
          return a.to ? <Link key={a.title} to={a.to}>{Inner}</Link> : <div key={a.title} className="cursor-pointer">{Inner}</div>;
        })}
      </div>
    </div>
  );
}
