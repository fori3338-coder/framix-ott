import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, LogOut, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";

export default function Header() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const { user, signOut } = useAuthContext();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showMenu]);

  const openLogin = () => { setAuthMode("login"); setShowAuth(true); };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split("@")[0]
    ?? "사용자";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 safe-top transition-colors duration-300 ${
          scrolled ? "bg-base/95 backdrop-blur-md border-b border-border" : "bg-gradient-to-b from-black/70 to-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2.5 sm:py-3 md:px-8 safe-x">

          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-xl md:text-2xl font-black tracking-tight text-gradient-gold">FRAMIX</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-dim ml-8">
            <Link to="/" className="hover:text-gold transition-colors">홈</Link>
            <Link to="/search?cat=trending" className="hover:text-gold transition-colors">트렌딩</Link>
            <Link to="/search?cat=new" className="hover:text-gold transition-colors">신작</Link>
            <Link to="/my-list" className="hover:text-gold transition-colors">내 보관함</Link>
            <Link to="/subscription" className="hover:text-gold transition-colors">구독</Link>
          </nav>

          <div className="flex items-center gap-3 md:gap-4 ml-auto">
            <button
              aria-label="검색"
              onClick={() => navigate("/search")}
              className="p-1.5 text-text hover:text-gold transition-colors"
            >
              <Search size={22} />
            </button>
            <button aria-label="알림" className="p-1.5 text-text hover:text-gold transition-colors relative">
              <Bell size={22} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gold" />
            </button>

            {/* 프로필 / 로그인 버튼 */}
            {user ? (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
                  className="hidden sm:flex items-center gap-1.5 rounded-md overflow-hidden border border-border hover:border-gold/60 transition-colors p-0.5"
                  aria-label="프로필"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="profile" className="w-7 h-7 rounded-sm object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-sm bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown size={14} className="text-text-dim mr-1" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border shadow-2xl overflow-hidden py-1"
                    style={{ background: "var(--color-surface)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-text truncate">{displayName}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate("/admin"); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-dim hover:text-gold hover:bg-white/5 transition-colors"
                    >
                      관리자 대시보드
                    </button>
                    <button
                      onClick={() => { signOut(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gold/50 text-gold text-sm font-semibold hover:bg-gold/10 transition-colors"
              >
                <LogIn size={15} />
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuth && (
        <AuthModal defaultMode={authMode} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
