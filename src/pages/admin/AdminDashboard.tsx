import { Link } from "react-router-dom";
import {
  Users, Film, Eye, TrendingUp, TrendingDown, Upload, Settings, Star,
  BarChart3, Activity, Sparkles, PlayCircle, MoreVertical, Search, Bell, Crown, UserPlus, Clapperboard
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { dramas } from "../../data/mockData";
import { supabase } from "../../lib/supabase";

type Range = "7D" | "30D" | "90D";

interface LiveStats {
  totalMembers: number;
  totalContents: number;
  totalViews: number;
  totalSubscribers: number;
  newSignups: number;
}







const sparkPath = (data: number[], w = 100, h = 32) => {
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
};

const dataMap: Record<Range, number[]> = {
  "7D": [42, 58, 49, 70, 65, 88, 95],
  "30D": [30, 42, 38, 50, 48, 55, 62, 58, 66, 72, 68, 75, 78, 82, 80, 86, 88, 84, 90, 92, 88, 95, 92, 96, 98, 94, 100, 96, 102, 108],
  "90D": Array.from({ length: 12 }, (_, i) => 40 + Math.round(Math.sin(i / 2) * 18) + i * 4),
};
const labelMap: Record<Range, string[]> = {
  "7D": ["월","화","수","목","금","토","일"],
  "30D": Array.from({ length: 30 }, (_, i) => `${i + 1}`),
  "90D": ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
};

const recentActivity = [
  { who: "관리자", what: "신작 '재벌집 그녀의 계약' 업로드 완료", when: "방금" },
  { who: "시스템", what: "월간 정산 리포트가 생성되었습니다", when: "12분 전" },
  { who: "관리자", what: "에피소드 4 무료 전환", when: "1시간 전" },
  { who: "시스템", what: "신규 구독자 320명 유입", when: "오늘 09:24" },
  { who: "관리자", what: "추천 알고리즘 가중치 업데이트", when: "어제" },
];

const genreShare = [
  { name: "로맨스", pct: 32 }, { name: "복수", pct: 22 }, { name: "재벌", pct: 16 },
  { name: "회귀", pct: 12 }, { name: "스릴러", pct: 10 }, { name: "기타", pct: 8 },
];

const topDramas = [...dramas].sort((a, b) => b.views - a.views).slice(0, 6);

export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("7D");
  const chartData = dataMap[range];
  const chartLabels = labelMap[range];
  const maxVal = Math.max(...chartData);

  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalMembers: 0,
    totalContents: 0,
    totalViews: 0,
    totalSubscribers: 0,
    newSignups: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // 총 콘텐츠 수 + 총 조회수 (series 테이블)
        const seriesRes = await supabase.from("series").select("id, views", { count: "exact" });
        const totalContents = seriesRes.count ?? 0;
        const totalViews = (seriesRes.data ?? []).reduce((sum: number, s: { views?: number }) => sum + (s.views ?? 0), 0);

        // 총 회원수 (profiles 테이블, 없으면 0)
        let totalMembers = 0;
        try {
          const profilesRes = await supabase.from("profiles").select("id", { count: "exact", head: true });
          totalMembers = profilesRes.count ?? 0;
        } catch { totalMembers = 0; }

        // 총 구독자 수 (subscriptions 테이블, 없으면 0)
        let totalSubscribers = 0;
        try {
          const subsRes = await supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active");
          totalSubscribers = subsRes.count ?? 0;
        } catch { totalSubscribers = 0; }

        // 회원가입 수 (오늘 기준 watch_history 신규 유저 근사치 — profiles 없으면 0)
        let newSignups = 0;
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const signupRes = await supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString());
          newSignups = signupRes.count ?? 0;
        } catch { newSignups = 0; }

        setLiveStats({ totalMembers, totalContents, totalViews, totalSubscribers, newSignups });
      } catch (e) {
        console.error("fetchStats error:", e);
      }
    }
    fetchStats();
  }, []);

  const areaPath = useMemo(() => {
    const w = 600, h = 180;
    const pts = chartData.map((v, i) => {
      const x = (i / (chartData.length - 1)) * w;
      const y = h - (v / maxVal) * (h - 16) - 4;
      return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    return { line, area, pts, w, h };
  }, [chartData, maxVal]);

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
          { label: "총 콘텐츠 수", value: liveStats.totalContents > 0 ? liveStats.totalContents.toString() : dramas.length.toString(), icon: Film, accent: "from-amber-200 to-gold", spark: [10,12,14,18,22,24,26,28,30,30,32,34] },
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-gold shrink-0" />
                <h2 className="font-bold text-sm md:text-base truncate">조회수 추이</h2>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">단위: 만 회 · 전기간 대비 <span className="text-emerald-300 font-semibold">+12.4%</span></p>
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
              <path d={areaPath.area} fill="url(#areaGold)" />
              <path d={areaPath.line} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
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
            {chartLabels.filter((_, i) => i % Math.ceil(chartLabels.length / 7) === 0).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        {/* Genre donut */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-gold" />
            <h2 className="font-bold text-sm md:text-base">장르별 시청 분포</h2>
          </div>
          <div className="flex items-center justify-center mb-4">
            <svg viewBox="0 0 100 100" className="w-32 h-32 md:w-36 md:h-36 -rotate-90">
              {(() => {
                let offset = 0;
                const C = 2 * Math.PI * 36;
                const palette = ["#D4AF37","#f0d77b","#9c7e23","#caa84b","#8a6c1d","#3a2f10"];
                return genreShare.map((g, i) => {
                  const len = (g.pct / 100) * C;
                  const el = (
                    <circle key={g.name} cx="50" cy="50" r="36" fill="none"
                      stroke={palette[i]} strokeWidth="14"
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
            {genreShare.map((g, i) => {
              const palette = ["#D4AF37","#f0d77b","#9c7e23","#caa84b","#8a6c1d","#3a2f10"];
              return (
                <div key={g.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: palette[i] }} />
                  <span className="flex-1 text-text-dim truncate">{g.name}</span>
                  <span className="font-semibold tabular-nums">{g.pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top content + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden admin-card">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <PlayCircle size={15} className="text-gold shrink-0" />
              <h2 className="font-bold text-sm md:text-base truncate">인기 콘텐츠 TOP 6</h2>
            </div>
            <Link to="/admin/upload" className="text-[11px] md:text-xs text-gold font-semibold hover:underline shrink-0">전체 관리 →</Link>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[24px_56px_minmax(0,1fr)_90px_90px_90px_30px] gap-3 px-5 py-2 text-[10px] uppercase tracking-wider text-text-muted border-b border-border bg-surface-2/40">
              <span>#</span><span /><span>제목</span><span>평점</span><span>조회수</span><span>변동</span><span />
            </div>
            <div className="divide-y divide-border">
              {topDramas.map((d, i) => (
                <div key={d.id} className="grid grid-cols-[24px_56px_minmax(0,1fr)_90px_90px_90px_30px] gap-3 items-center px-5 py-3 hover:bg-surface-2/40 transition-colors">
                  <span className="text-gold font-black text-sm tabular-nums">{i + 1}</span>
                  <img src={d.poster} alt={d.title} className="w-12 h-16 object-cover rounded-md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{d.title}</p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">{d.genres.slice(0, 2).join(" · ")}</p>
                  </div>
                  <span className="text-sm font-semibold flex items-center gap-1"><Star size={12} className="text-gold fill-gold" />{d.rating.toFixed(1)}</span>
                  <span className="text-sm font-bold tabular-nums">{(d.views / 10000).toFixed(0)}만</span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${i % 3 === 2 ? "text-rose-300" : "text-emerald-300"}`}>
                    {i % 3 === 2 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                    {(2 + i * 1.7).toFixed(1)}%
                  </span>
                  <button className="text-text-muted hover:text-gold" aria-label="더보기"><MoreVertical size={15} /></button>
                </div>
              ))}
            </div>
          </div>
          {/* Mobile list */}
          <div className="md:hidden divide-y divide-border">
            {topDramas.map((d, i) => (
              <div key={d.id} className="grid grid-cols-[20px_44px_minmax(0,1fr)_auto] gap-3 items-center p-3">
                <span className="text-gold font-black text-sm tabular-nums">{i + 1}</span>
                <img src={d.poster} alt={d.title} className="w-11 h-14 object-cover rounded-md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{d.title}</p>
                  <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                    <Star size={10} className="text-gold fill-gold" />{d.rating.toFixed(1)} · {d.genres[0]}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums">{(d.views / 10000).toFixed(0)}만</p>
                  <p className={`text-[10px] ${i % 3 === 2 ? "text-rose-300" : "text-emerald-300"}`}>
                    {i % 3 === 2 ? "▼" : "▲"} {(2 + i * 1.7).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-5 admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-gold" />
            <h2 className="font-bold text-sm md:text-base">최근 활동</h2>
          </div>
          <ol className="relative space-y-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border">
            {recentActivity.map((a, i) => (
              <li key={i} className="pl-5 relative">
                <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-base" />
                <p className="text-xs md:text-sm leading-snug">{a.what}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{a.who} · {a.when}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

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
