import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Crown,
  Settings,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Mail,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "정보 없음";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 관리자 판별: auth.users.app_metadata 기준.
// app_metadata는 service_role(서버/Supabase 대시보드)만 변경 가능한 보안 메타데이터로,
// 로그인 세션(JWT)에 이미 포함되어 있어 별도 DB 조회 없이 즉시 판별 가능하다.
// (profiles 테이블/컬럼 존재를 가정하지 않음)
// app_metadata.role === "admin" 또는 app_metadata.is_admin === true 둘 중 하나만 만족해도 관리자로 판별.
function checkIsAdmin(appMetadata: Record<string, unknown> | undefined | null): boolean {
  if (!appMetadata) return false;
  if (appMetadata.role === "admin") return true;
  if (appMetadata.is_admin === true) return true;
  return false;
}

interface MenuRowProps {
  icon: typeof UserIcon;
  label: string;
  desc?: string;
  onClick: () => void;
  accent?: boolean;
  expanded?: boolean;
}

function MenuRow({ icon: Icon, label, desc, onClick, accent, expanded }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition-colors active:scale-[0.99]"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          accent ? "bg-gold/10 border-gold/30 text-gold" : "bg-surface-2 border-border text-text-dim"
        }`}
      >
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-sm ${accent ? "text-gold" : "text-white"}`}>{label}</p>
        {desc && <p className="text-text-muted text-xs mt-0.5 truncate">{desc}</p>}
      </div>
      {expanded === undefined ? (
        <ChevronRight size={16} className="text-text-muted shrink-0" />
      ) : expanded ? (
        <ChevronDown size={16} className="text-text-muted shrink-0" />
      ) : (
        <ChevronRight size={16} className="text-text-muted shrink-0" />
      )}
    </button>
  );
}

export default function MyInfo() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const isAdmin = checkIsAdmin(user?.app_metadata as Record<string, unknown> | undefined);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 비로그인
  if (!user) {
    return (
      <div className="min-h-screen px-4 md:px-8 pt-20 md:pt-28 pb-16 animate-fade-in flex flex-col items-center">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <LogIn size={26} className="text-text-muted" />
          </div>
          <p className="text-text-dim font-medium">로그인이 필요합니다</p>
          <p className="text-text-muted text-sm mt-1">내정보를 확인하려면 로그인하세요.</p>
        </div>
      </div>
    );
  }

  const displayName =
    ((user.user_metadata as Record<string, unknown> | undefined)?.display_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "회원";

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen px-4 md:px-8 pt-20 pb-16 animate-fade-in flex flex-col items-center">
      <div className="w-full max-w-xl">
        {/* 상단 타이틀 */}
        <div className="mb-6">
          <span className="text-[11px] font-black tracking-widest text-gold uppercase">My Page</span>
          <h1 className="text-2xl md:text-3xl font-black mt-1">
            <span className="text-gradient-gold">내정보</span>
          </h1>
        </div>

        {/* 프로필 카드 */}
        <div className="flex items-center gap-4 bg-surface border border-border rounded-2xl p-5 mb-6">
          <img
            src="https://picsum.photos/seed/framix-profile/96/96"
            alt="profile"
            className="w-14 h-14 rounded-full object-cover border border-gold/30 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-lg text-white truncate">{displayName}</p>
            <p className="text-text-muted text-sm truncate">{user.email}</p>
          </div>
        </div>

        {/* 메뉴 목록 */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <MenuRow
            icon={UserIcon}
            label="프로필"
            desc={displayName}
            expanded={profileOpen}
            onClick={() => setProfileOpen((v) => !v)}
          />
          {profileOpen && (
            <div className="px-4 pb-4 -mt-1 space-y-2.5 bg-white/[0.02]">
              <div className="flex items-center gap-2.5 text-sm text-text-dim">
                <Mail size={14} className="text-text-muted shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-dim">
                <CalendarDays size={14} className="text-text-muted shrink-0" />
                <span>가입일 {formatDate(user.created_at)}</span>
              </div>
            </div>
          )}

          <MenuRow
            icon={Crown}
            label="내 구독"
            desc="멤버십 확인 및 관리"
            onClick={() => navigate("/my/subscription")}
          />

          <MenuRow
            icon={Settings}
            label="설정"
            desc="계정 정보"
            expanded={settingsOpen}
            onClick={() => setSettingsOpen((v) => !v)}
          />
          {settingsOpen && (
            <div className="px-4 pb-4 -mt-1 space-y-2.5 bg-white/[0.02]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">계정 이메일</span>
                <span className="text-text-dim truncate ml-3">{user.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">가입일</span>
                <span className="text-text-dim">{formatDate(user.created_at)}</span>
              </div>
            </div>
          )}

          {isAdmin && (
            <MenuRow
              icon={ShieldCheck}
              label="관리자센터"
              desc="콘텐츠 · 회원 · 매출 관리"
              accent
              onClick={() => navigate("/admin")}
            />
          )}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 mt-6 px-4 py-3.5 rounded-2xl border border-border bg-surface text-text-dim font-semibold text-sm hover:text-rose-400 hover:border-rose-400/40 transition-colors"
        >
          <LogOut size={16} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
