import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, X, User, LogOut, Crown, Settings, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";
import Portal from "../Portal";

/* ─────────────────────────────────────────────────────────
   Nav items
───────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "home",         label: "홈",       to: "/" },
  { key: "trending",    label: "인기",     to: "/search?cat=trending" },
  { key: "new",         label: "신작",     to: "/search?cat=new" },
  { key: "my-list",     label: "내 목록",   to: "/my-list" },
  { key: "subscription",label: "구독",     to: "/subscription" },
  { key: "admin",       label: "관리센터", to: "/admin" },
];

/* ─────────────────────────────────────────────────────────
   Hook — scroll state (opacity/blur/hide-on-scroll-down)
───────────────────────────────────────────────────────── */
function useHeaderScroll() {
  const [scrollY, setScrollY] = useState(0);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // hide on scroll-down past 80px, reveal on scroll-up
        setHidden(y > 80 && y > lastY.current + 4);
        lastY.current = y;
        setScrollY(y);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 0 → transparent, 60+ → fully glass
  const progress = Math.min(scrollY / 60, 1);

  return { scrollY, hidden, progress };
}

/* ─────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────── */
export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Desktop search expand
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile full-screen search overlay
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Profile dropdown (desktop) / bottom-sheet (mobile)
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { hidden, progress } = useHeaderScroll();

  /* ── Active nav key ── */
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

  /* ── ESC closes search / profile ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileSearchOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Close profile on outside click ── */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  /* ── Auto-focus search input ── */
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);
  useEffect(() => {
    if (mobileSearchOpen) setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
  }, [mobileSearchOpen]);

  /* ── Submit search ── */
  const submitSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setSearchOpen(false);
      setMobileSearchOpen(false);
      setSearchValue("");
    }
  }, [navigate]);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  /* ── Inline styles for dynamic glass effect ── */
  const headerStyle: React.CSSProperties = {
    transform: hidden ? "translate3d(0,-100%,0)" : "translate3d(0,0,0)",
    transition: "transform 380ms cubic-bezier(0.4,0,0.2,1), background 300ms ease, backdrop-filter 300ms ease, box-shadow 300ms ease",
    willChange: "transform, opacity",
    background: progress > 0
      ? `rgba(8,8,10,${0.72 + progress * 0.18})`
      : "transparent",
    backdropFilter: progress > 0 ? `blur(${progress * 20}px) saturate(${140 + progress * 40}%)` : "none",
    WebkitBackdropFilter: progress > 0 ? `blur(${progress * 20}px) saturate(${140 + progress * 40}%)` : "none",
    boxShadow: progress > 0.5
      ? `0 1px 0 rgba(255,255,255,${0.06 * progress}), 0 4px 24px rgba(0,0,0,${0.3 * progress})`
      : "none",
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════
          HEADER ELEMENT
      ═══════════════════════════════════════════════ */}
      <header
        className="framix-header"
        style={headerStyle}
        role="banner"
      >
        <div className="framix-header-inner">

          {/* ── Logo ── */}
          <Link to="/" className="framix-logo" aria-label="FRAMIX 홈">
            FRAMIX
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="framix-nav" aria-label="주요 메뉴">
            {NAV_ITEMS.map(({ key, label, to }) => (
              <Link
                key={key}
                to={to}
                className={`framix-nav-link${activeKey === key ? " is-active" : ""}`}
              >
                {label}
                <span className="framix-nav-indicator" aria-hidden="true" />
              </Link>
            ))}
          </nav>

          {/* ── Right Controls ── */}
          <div className="framix-header-right">

            {/* Desktop Search — expand on click */}
            <div className={`framix-search-wrap${searchOpen ? " is-open" : ""}`}>
              {searchOpen ? (
                <>
                  <input
                    ref={searchInputRef}
                    className="framix-search-input"
                    placeholder="제목, 장르 검색..."
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submitSearch(searchValue); }}
                    aria-label="검색어 입력"
                  />
                  <button
                    className="framix-icon-btn"
                    onClick={() => { setSearchOpen(false); setSearchValue(""); }}
                    aria-label="검색 닫기"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <button
                  className="framix-icon-btn"
                  onClick={() => setSearchOpen(true)}
                  aria-label="검색"
                >
                  <Search size={20} />
                </button>
              )}
            </div>

            {/* Mobile search icon */}
            <button
              className="framix-icon-btn framix-mobile-only"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="검색"
            >
              <Search size={20} />
            </button>

            {/* Auth / Profile */}
            {user ? (
              <div className="framix-profile-wrap" ref={profileRef}>
                <button
                  className="framix-profile-btn"
                  onClick={() => setProfileOpen(p => !p)}
                  aria-label="프로필 메뉴"
                  aria-expanded={profileOpen}
                >
                  <img
                    src="https://picsum.photos/seed/framix-profile/64/64"
                    alt="프로필"
                    className="framix-avatar"
                  />
                  <ChevronDown
                    size={13}
                    className="framix-chevron"
                    style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                  />
                </button>

                {/* Desktop dropdown */}
                {profileOpen && (
                  <div className="framix-dropdown framix-desktop-only" role="menu">
                    <div className="framix-dropdown-header">
                      <img
                        src="https://picsum.photos/seed/framix-profile/64/64"
                        alt="프로필"
                        className="framix-dropdown-avatar"
                      />
                      <div>
                        <p className="framix-dropdown-email">{user.email}</p>
                        <p className="framix-dropdown-plan">FRAMIX 멤버</p>
                      </div>
                    </div>
                    <div className="framix-dropdown-divider" />
                    <button
                      className="framix-dropdown-item"
                      role="menuitem"
                      onClick={() => { setProfileOpen(false); navigate("/my-info"); }}
                    >
                      <User size={15} />
                      내 정보
                    </button>
                    <button
                      className="framix-dropdown-item"
                      role="menuitem"
                      onClick={() => { setProfileOpen(false); navigate("/my/subscription"); }}
                    >
                      <Crown size={15} />
                      내 구독
                    </button>
                    <button
                      className="framix-dropdown-item"
                      role="menuitem"
                      onClick={() => { setProfileOpen(false); navigate("/admin"); }}
                    >
                      <Settings size={15} />
                      관리센터
                    </button>
                    <div className="framix-dropdown-divider" />
                    <button
                      className="framix-dropdown-item framix-dropdown-item--danger"
                      role="menuitem"
                      onClick={async () => { setProfileOpen(false); await signOut(); }}
                    >
                      <LogOut size={15} />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="framix-auth-btns">
                <button
                  className="framix-btn-ghost"
                  onClick={() => openAuth("login")}
                >
                  로그인
                </button>
                <button
                  className="framix-btn-primary"
                  onClick={() => openAuth("signup")}
                >
                  시작하기
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          MOBILE — Profile bottom-sheet (logged in)
      ═══════════════════════════════════════════════ */}
      {user && profileOpen && (
        <Portal>
          <div
            className="framix-bottom-sheet-backdrop framix-mobile-only"
            onClick={() => setProfileOpen(false)}
            aria-hidden="true"
          />
          <div className="framix-bottom-sheet framix-mobile-only" role="dialog" aria-modal="true">
            <div className="framix-bottom-sheet-handle" />
            <div className="framix-dropdown-header">
              <img
                src="https://picsum.photos/seed/framix-profile/64/64"
                alt="프로필"
                className="framix-dropdown-avatar"
              />
              <div>
                <p className="framix-dropdown-email">{user.email}</p>
                <p className="framix-dropdown-plan">FRAMIX 멤버</p>
              </div>
            </div>
            <div className="framix-bottom-sheet-nav">
              <button className="framix-bottom-sheet-item" onClick={() => { setProfileOpen(false); navigate("/my-info"); }}>
                <User size={18} /> 내 정보
              </button>
              <button className="framix-bottom-sheet-item" onClick={() => { setProfileOpen(false); navigate("/my/subscription"); }}>
                <Crown size={18} /> 내 구독
              </button>
              <button className="framix-bottom-sheet-item" onClick={() => { setProfileOpen(false); navigate("/admin"); }}>
                <Settings size={18} /> 관리센터
              </button>
              <button
                className="framix-bottom-sheet-item framix-bottom-sheet-item--danger"
                onClick={async () => { setProfileOpen(false); await signOut(); }}
              >
                <LogOut size={18} /> 로그아웃
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* ═══════════════════════════════════════════════
          MOBILE — Full-screen search overlay
      ═══════════════════════════════════════════════ */}
      {mobileSearchOpen && (
        <Portal>
          <div className="framix-mobile-search framix-mobile-only" role="dialog" aria-modal="true" aria-label="검색">
            <div className="framix-mobile-search-bar">
              <Search size={20} className="framix-mobile-search-icon" />
              <input
                ref={mobileSearchInputRef}
                className="framix-mobile-search-input"
                placeholder="제목, 장르 검색..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitSearch(searchValue); }}
                aria-label="검색어 입력"
              />
              <button
                className="framix-mobile-search-close"
                onClick={() => { setMobileSearchOpen(false); setSearchValue(""); }}
                aria-label="검색 닫기"
              >
                취소
              </button>
            </div>
            {searchValue && (
              <div className="framix-mobile-search-hint">
                <button
                  className="framix-mobile-search-hint-btn"
                  onClick={() => submitSearch(searchValue)}
                >
                  <Search size={14} />
                  <span>"{searchValue}" 검색</span>
                </button>
              </div>
            )}
          </div>
        </Portal>
      )}

      {/* AuthModal */}
      {authModalOpen && (
        <Portal>
          <AuthModal onClose={() => setAuthModalOpen(false)} defaultMode={authMode} />
        </Portal>
      )}
    </>
  );
}
