import { Link } from "react-router-dom";
import { Users, Film, Eye, DollarSign, TrendingUp, Upload, Settings, Star } from "lucide-react";
import { dramas } from "../../data/mockData";

const stats = [
  { label: "총 구독자", value: "284,920", change: "+4.2%", icon: Users },
  { label: "총 콘텐츠", value: dramas.length.toString(), change: "+2", icon: Film },
  { label: "월 누적 조회수", value: "12.8M", change: "+18.5%", icon: Eye },
  { label: "월 매출", value: "₩482M", change: "+9.1%", icon: DollarSign },
];

const topDramas = [...dramas].sort((a, b) => b.views - a.views).slice(0, 6);

export default function AdminDashboard() {
  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">관리자 대시보드</h1>
        <Link
          to="/admin/upload"
          className="flex items-center gap-2 bg-gold text-black font-bold text-sm px-4 py-2 rounded-md hover:bg-gold-light transition-colors"
        >
          <Upload size={16} />
          콘텐츠 업로드
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={18} className="text-gold" />
              <span className="text-xs text-green-400 flex items-center gap-0.5">
                <TrendingUp size={12} />
                {s.change}
              </span>
            </div>
            <p className="text-lg md:text-2xl font-black">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 md:p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">최근 7일 조회수 추이</h2>
          <span className="text-xs text-text-muted">단위: 만 회</span>
        </div>
        <div className="flex items-end gap-2 md:gap-4 h-40">
          {[42, 58, 49, 70, 65, 88, 95].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-surface-2 rounded-t-md relative" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gold-dark to-gold rounded-t-md transition-all"
                  style={{ height: `${v}%` }}
                />
              </div>
              <span className="text-[10px] text-text-muted">{["월", "화", "수", "목", "금", "토", "일"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold">인기 콘텐츠 TOP 6</h2>
          <Link to="/admin/upload" className="text-xs text-gold">전체 관리 →</Link>
        </div>
        <div className="divide-y divide-border">
          {topDramas.map((d, i) => (
            <div key={d.id} className="flex items-center gap-3 p-3 md:p-4">
              <span className="text-gold font-black text-sm w-5 text-center">{i + 1}</span>
              <img src={d.poster} alt={d.title} className="w-10 h-14 object-cover rounded-md shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{d.title}</p>
                <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                  <Star size={11} className="text-gold fill-gold" /> {d.rating.toFixed(1)} · {d.genres[0]}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">{(d.views / 10000).toFixed(0)}만</p>
                <p className="text-[10px] text-text-muted">조회수</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Link to="/admin/upload" className="bg-surface border border-border rounded-xl p-4 hover:border-gold/50 transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
            <Upload size={18} className="text-gold" />
          </div>
          <div>
            <p className="font-semibold text-sm">콘텐츠 업로드</p>
            <p className="text-xs text-text-muted">새 드라마/에피소드 등록</p>
          </div>
        </Link>
        <div className="bg-surface border border-border rounded-xl p-4 hover:border-gold/50 transition-colors flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
            <Users size={18} className="text-gold" />
          </div>
          <div>
            <p className="font-semibold text-sm">구독자 관리</p>
            <p className="text-xs text-text-muted">멤버십 및 결제 관리</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:border-gold/50 transition-colors flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
            <Settings size={18} className="text-gold" />
          </div>
          <div>
            <p className="font-semibold text-sm">플랫폼 설정</p>
            <p className="text-xs text-text-muted">배너, 추천 알고리즘 설정</p>
          </div>
        </div>
      </div>
    </div>
  );
}
