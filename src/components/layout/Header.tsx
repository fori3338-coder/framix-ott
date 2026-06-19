import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, LogIn, UserPlus, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuthContext();
  const [scrolled, setScrolled] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            <Link to="/admin" className="hover:text-gold transition-colors">STUDIO</Link>
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

            {!loading && (
              user ? (
                /* 로그인 상태 */
                <>
                  <button
                    onClick={() => navigate("/admin")}
                    className="hidden sm:flex items-center gap-1.5 rounded-md overflow-hidden border border-border hover:border-gold/60 transition-colors p-0.5"
                    aria-label="프로필"
                  >
                    <img
                      src="https://picsum.photos/seed/framix-profile/64/64"
                      alt="profile"
                      className="w-7 h-7 rounded-sm object-cover"
                    />
                    <ChevronDown size={14} className="text-text-dim mr-1" />
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="hidden sm:flex items-center gap-1.5 text-xs text-text-dim hover:text-gold transition-colors"
                    aria-label="로그아웃"
                  >
                    <LogOut size={16} />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                /* 비로그인 상태 */
                <>
                  <button
                    onClick={() => setAuthModal("login")}
                    className="hidden sm:flex items-center gap-1.5 text-xs text-text-dim hover:text-gold transition-colors"
                  >
                    <LogIn size={16} />
                    <span>로그인</span>
                  </button>
                  <button
                    onClick={() => setAuthModal("signup")}
                    className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors font-semibold"
                  >
                    <UserPlus size={16} />
                    <span>회원가입</span>
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {authModal && (
        <AuthModal
          defaultMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </>
  );
}
