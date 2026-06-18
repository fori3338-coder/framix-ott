import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, Bookmark, Clock, User, LogIn } from "lucide-react";
import { useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";

const staticTabs = [
  { to: "/", label: "홈", icon: Home, end: true },
  { to: "/search", label: "검색", icon: Search, end: false },
  { to: "/my-list", label: "보관함", icon: Bookmark, end: false },
  { to: "/history", label: "시청기록", icon: Clock, end: false },
];

export default function BottomNav() {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-base/95 backdrop-blur-md border-t border-border safe-bottom safe-x">
        <div className="grid grid-cols-5">
          {staticTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] transition-colors active:scale-95 ${
                  isActive ? "text-gold" : "text-text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={isActive ? "font-semibold" : ""}>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* 프로필/로그인 탭 */}
          {user ? (
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] text-text-muted active:scale-95 transition-colors"
            >
              <User size={20} strokeWidth={1.8} />
              <span>내 정보</span>

              {showMenu && (
                <div
                  className="fixed bottom-16 right-3 w-44 rounded-xl border border-border shadow-2xl overflow-hidden py-1 text-left"
                  style={{ background: "var(--color-surface)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { navigate("/admin"); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-sm text-text-dim hover:text-gold hover:bg-white/5 transition-colors"
                  >
                    관리자 대시보드
                  </button>
                  <button
                    onClick={() => { signOut(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] text-text-muted active:scale-95 transition-colors"
            >
              <LogIn size={20} strokeWidth={1.8} />
              <span>로그인</span>
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
