import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";

export default function Header() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuthContext();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
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
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((p) => !p)}
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
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-base/95 backdrop-blur-md shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate("/admin"); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                  >
                    프로필
                  </button>
                  <button
                    onClick={async () => { setProfileMenuOpen(false); await signOut(); }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                  >
                    <LogOut size={14} /> 로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => openAuthModal("login")}
                className="px-3 py-1.5 text-sm font-medium text-text hover:text-gold transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => openAuthModal("signup")}
                className="px-3 py-1.5 rounded-md bg-gold text-black text-sm font-semibold hover:brightness-110 transition-all"
              >
                회원가입
              </button>
            </div>
          )}
        </div>
      </div>

      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} defaultMode={authMode} />
      )}
    </header>
  );
}
