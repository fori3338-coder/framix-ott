import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, LogOut, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";
import Portal from "../Portal";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [scrolledDesktop, setScrolledDesktop] = useState(false);
  const { user, signOut } = useAuthContext();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // 상단 메뉴 active 판별: 트렌딩/신작은 같은 /search 경로를 cat 쿼리로 구분하므로
  // 단순 pathname 매칭(NavLink 기본 동작)으로는 정확히 구분할 수 없어 직접 계산한다.
  const activeKey = useMemo(() => {
    const { pathname, search } = location;
    if (pathname === "/") return "home";
    if (pathname.startsWith("/search")) {
      const cat = new URLSearchParams(search).get("cat");
      if (cat === "new") return "new";
      if (cat === "trending") return "trending";
      return "";
    }
    if (pathname.startsWith("/my-list")) return "my-list";
    if (pathname.startsWith("/subscription")) return "subscription";
    if (pathname.startsWith("/admin")) return "admin";
    return "";
  }, [location]);

  const navLinkClass = (key: string) =>
    `transition-colors max-md:hover:text-gold-hot header-nav-link-desktop ${
      activeKey === key
        ? "text-gold-hot font-bold is-active"
        : "text-gold-bright font-medium"
    }`;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setScrolledDesktop(window.scrollY > 50);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 safe-top transition-colors duration-300 header-glass-desktop ${
        scrolledDesktop ? "is-scrolled" : ""
      } ${
        scrolled
          ? "max-md:bg-base/95 max-md:backdrop-blur-md max-md:border-b max-md:border-border"
          : "max-md:bg-gradient-to-b max-md:from-black/70 max-md:to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 md:py-3 md:px-8 safe-x gap-2">

        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-gold-bright header-logo-desktop">FRAMIX</span>
        </Link>

        <nav className="flex flex-1 md:flex-none items-center gap-4 md:gap-9 text-sm md:ml-10 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link to="/" className={navLinkClass("home")}>홈</Link>
          <Link to="/search?cat=trending" className={navLinkClass("trending")}>트렌딩</Link>
          <Link to="/search?cat=new" className={navLinkClass("new")}>신작</Link>
          <Link to="/my-list" className={navLinkClass("my-list")}>내 보관함</Link>
          <Link to="/subscription" className={navLinkClass("subscription")}>구독</Link>
          <Link to="/admin" className={navLinkClass("admin")}>관리센터</Link>
        </nav>

        <div className="hidden sm:flex items-center gap-3 md:gap-4 shrink-0">
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
                    onClick={() => { setProfileMenuOpen(false); navigate("/my/subscription"); }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                  >
                    <Crown size={14} /> 내 구독
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
        <Portal>
          <AuthModal onClose={() => setAuthModalOpen(false)} defaultMode={authMode} />
        </Portal>
      )}
    </header>
  );
}
