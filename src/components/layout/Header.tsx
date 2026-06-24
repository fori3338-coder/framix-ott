/**
 * Header — FRAMIX Navigation (full rebuild)
 *
 * 새 내비게이션 구조: 플로팅 글래스 바 + 중앙 필 네비 + 로즈 액티브 인디케이터.
 * 기능 전부 유지: 스크롤 hide/glass / 데스크탑 검색 확장 / 모바일 풀스크린 검색 /
 * 프로필 드롭다운 / 모바일 바텀시트 / 인증 모달 / 아바타 에러 처리.
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, X, User, LogOut, Crown, Settings, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";
import Portal from "../Portal";

const NAV_ITEMS = [
  { key: "home",         label: "홈",       to: "/" },
  { key: "trending",     label: "인기",     to: "/search?cat=trending" },
  { key: "new",          label: "신작",     to: "/search?cat=new" },
  { key: "my-list",      label: "내 목록",  to: "/my-list" },
  { key: "subscription", label: "구독",     to: "/subscription" },
  { key: "admin",        label: "관리센터", to: "/admin" },
];

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

  const progress = Math.min(scrollY / 60, 1);
  return { scrollY, hidden, progress };
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [avatarErr, setAvatarErr] = useState(false);

  const { hidden, progress } = useHeaderScroll();

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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);
  useEffect(() => {
    if (mobileSearchOpen) setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
  }, [mobileSearchOpen]);

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

  const avatarSrc = user?.user_metadata?.avatar_url || "https://picsum.photos/seed/framix-profile/64/64";

  const headerStyle: React.CSSProperties = {
    transform: hidden ? "translate3d(0,-130%,0)" : "translate3d(0,0,0)",
    "--fxn-glass": progress > 0
      ? `rgba(10,11,15,${0.5 + progress * 0.4})`
      : "rgba(10,11,15,0.28)",
    "--fxn-blur": `blur(${10 + progress * 16}px) saturate(${150 + progress * 40}%)`,
    "--fxn-border": `rgba(255,255,255,${0.06 + progress * 0.06})`,
    "--fxn-shadow": progress > 0.3
      ? `0 10px 40px rgba(0,0,0,${0.4 * progress})`
      : "0 6px 24px rgba(0,0,0,0.25)",
  } as React.CSSProperties;

  return (
    <>
      <header className="fxn-header" style={headerStyle} role="banner">
        <div className="fxn-bar">
          {/* Logo */}
          <Link to="/" className="fxn-logo" aria-label="FRAMIX 홈">
            FRAMI<span className="fxn-logo-x">X</span>
            <span className="fxn-logo-dot" />
          </Link>

          {/* Center nav */}
          <nav className="fxn-nav" aria-label="주요 메뉴">
            {NAV_ITEMS.map(({ key, label, to }) => (
              <Link key={key} to={to} className={`fxn-link${activeKey === key ? " is-active" : ""}`}>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="fxn-right">
            <div className={`fxn-search${searchOpen ? " open" : ""}`}>
              {searchOpen ? (
                <>
                  <Search size={17} className="fxn-search-lead" />
                  <input
                    ref={searchInputRef}
                    className="fxn-search-input"
                    placeholder="제목, 장르 검색..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitSearch(searchValue); }}
                    aria-label="검색어 입력"
                  />
                  <button className="fxn-icon" onClick={() => { setSearchOpen(false); setSearchValue(""); }} aria-label="검색 닫기">
                    <X size={17} />
                  </button>
                </>
              ) : (
                <button className="fxn-icon" onClick={() => setSearchOpen(true)} aria-label="검색">
                  <Search size={19} />
                </button>
              )}
            </div>

            <button className="fxn-icon fxn-mobile" onClick={() => setMobileSearchOpen(true)} aria-label="검색">
              <Search size={19} />
            </button>

            {user ? (
              <div className="fxn-profile" ref={profileRef}>
                <button className="fxn-profile-btn" onClick={() => setProfileOpen((p) => !p)} aria-label="프로필 메뉴" aria-expanded={profileOpen}>
                  {avatarErr ? (
                    <span className="fxn-avatar fxn-avatar-fallback"><User size={16} /></span>
                  ) : (
                    <img src={avatarSrc} alt="프로필" className="fxn-avatar" onError={() => setAvatarErr(true)} />
                  )}
                  <ChevronDown size={13} className="fxn-chev" style={{ transform: profileOpen ? "rotate(180deg)" : "none" }} />
                </button>

                {profileOpen && (
                  <div className="fxn-dropdown fxn-desktop" role="menu">
                    <div className="fxn-dd-head">
                      {avatarErr ? (
                        <span className="fxn-dd-avatar fxn-avatar-fallback"><User size={18} /></span>
                      ) : (
                        <img src={avatarSrc} alt="프로필" className="fxn-dd-avatar" onError={() => setAvatarErr(true)} />
                      )}
                      <div className="fxn-dd-id">
                        <p className="fxn-dd-email">{user.email}</p>
                        <p className="fxn-dd-plan">FRAMIX 멤버</p>
                      </div>
                    </div>
                    <div className="fxn-dd-divider" />
                    <button className="fxn-dd-item" role="menuitem" onClick={() => { setProfileOpen(false); navigate("/my-info"); }}><User size={15} /> 내 정보</button>
                    <button className="fxn-dd-item" role="menuitem" onClick={() => { setProfileOpen(false); navigate("/my/subscription"); }}><Crown size={15} /> 내 구독</button>
                    <button className="fxn-dd-item" role="menuitem" onClick={() => { setProfileOpen(false); navigate("/admin"); }}><Settings size={15} /> 관리센터</button>
                    <div className="fxn-dd-divider" />
                    <button className="fxn-dd-item danger" role="menuitem" onClick={async () => { setProfileOpen(false); await signOut(); }}><LogOut size={15} /> 로그아웃</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className="fxn-icon fxn-mobile" onClick={() => openAuth("login")} aria-label="로그인"><User size={19} /></button>
                <div className="fxn-auth fxn-desktop">
                  <button className="fxn-ghost" onClick={() => openAuth("login")}>로그인</button>
                  <button className="fxn-primary" onClick={() => openAuth("signup")}>시작하기</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile profile bottom-sheet */}
      {user && profileOpen && (
        <Portal>
          <div className="fxn-sheet-backdrop fxn-mobile" onClick={() => setProfileOpen(false)} aria-hidden="true" />
          <div className="fxn-sheet fxn-mobile" role="dialog" aria-modal="true">
            <div className="fxn-sheet-handle" />
            <div className="fxn-dd-head">
              {avatarErr ? (
                <span className="fxn-dd-avatar fxn-avatar-fallback"><User size={18} /></span>
              ) : (
                <img src={avatarSrc} alt="프로필" className="fxn-dd-avatar" onError={() => setAvatarErr(true)} />
              )}
              <div className="fxn-dd-id">
                <p className="fxn-dd-email">{user.email}</p>
                <p className="fxn-dd-plan">FRAMIX 멤버</p>
              </div>
            </div>
            <div className="fxn-sheet-nav">
              <button className="fxn-sheet-item" onClick={() => { setProfileOpen(false); navigate("/my-info"); }}><User size={18} /> 내 정보</button>
              <button className="fxn-sheet-item" onClick={() => { setProfileOpen(false); navigate("/my/subscription"); }}><Crown size={18} /> 내 구독</button>
              <button className="fxn-sheet-item" onClick={() => { setProfileOpen(false); navigate("/admin"); }}><Settings size={18} /> 관리센터</button>
              <button className="fxn-sheet-item danger" onClick={async () => { setProfileOpen(false); await signOut(); }}><LogOut size={18} /> 로그아웃</button>
            </div>
          </div>
        </Portal>
      )}

      {/* Mobile full-screen search */}
      {mobileSearchOpen && (
        <Portal>
          <div className="fxn-msearch fxn-mobile" role="dialog" aria-modal="true" aria-label="검색">
            <div className="fxn-msearch-bar">
              <Search size={20} className="fxn-msearch-icon" />
              <input
                ref={mobileSearchInputRef}
                className="fxn-msearch-input"
                placeholder="제목, 장르 검색..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitSearch(searchValue); }}
                aria-label="검색어 입력"
              />
              <button className="fxn-msearch-close" onClick={() => { setMobileSearchOpen(false); setSearchValue(""); }} aria-label="검색 닫기">취소</button>
            </div>
            {searchValue && (
              <div className="fxn-msearch-hint">
                <button className="fxn-msearch-hint-btn" onClick={() => submitSearch(searchValue)}>
                  <Search size={14} /> <span>"{searchValue}" 검색</span>
                </button>
              </div>
            )}
          </div>
        </Portal>
      )}

      {authModalOpen && (
        <Portal>
          <AuthModal onClose={() => setAuthModalOpen(false)} defaultMode={authMode} />
        </Portal>
      )}

      <style>{`
        .fxn-header{position:fixed;top:0;left:0;right:0;z-index:50;padding:14px clamp(16px,5vw,40px) 0;
          transition:transform 400ms cubic-bezier(.4,0,.2,1);will-change:transform}
        @media(max-width:860px){.fxn-header{padding:10px 12px 0}}
        .fxn-bar{display:flex;align-items:center;gap:18px;height:60px;padding:0 10px 0 20px;
          border-radius:18px;background:var(--fxn-glass);border:1px solid var(--fxn-border);
          box-shadow:var(--fxn-shadow);backdrop-filter:var(--fxn-blur);-webkit-backdrop-filter:var(--fxn-blur);
          transition:background .3s ease,box-shadow .3s ease}
        @media(max-width:860px){.fxn-bar{height:52px;padding:0 8px 0 14px;gap:8px;border-radius:14px}}
        .fxn-logo{position:relative;display:inline-flex;align-items:center;font-size:23px;font-weight:900;
          letter-spacing:.06em;color:#fff;text-decoration:none;flex:0 0 auto}
        @media(max-width:860px){.fxn-logo{font-size:19px}}
        .fxn-logo-x{color:#ff3e6c}
        .fxn-logo-dot{position:absolute;top:2px;right:-9px;width:6px;height:6px;border-radius:50%;
          background:#ff3e6c;box-shadow:0 0 10px 2px rgba(255,62,108,.7)}

        .fxn-nav{display:flex;align-items:center;gap:4px;margin-left:6px}
        .fxn-link{position:relative;padding:8px 14px;border-radius:10px;font-size:14px;font-weight:600;
          color:rgba(255,255,255,.62);text-decoration:none;transition:color .2s ease,background .2s ease}
        .fxn-link:hover{color:#fff;background:rgba(255,255,255,.06)}
        .fxn-link.is-active{color:#fff}
        .fxn-link.is-active::after{content:"";position:absolute;left:14px;right:14px;bottom:2px;height:2px;
          border-radius:2px;background:#ff3e6c;box-shadow:0 0 10px rgba(255,62,108,.8)}

        .fxn-right{display:flex;align-items:center;gap:8px;margin-left:auto}
        .fxn-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:11px;cursor:pointer;
          color:rgba(255,255,255,.82);background:transparent;border:0;transition:all .2s ease}
        .fxn-icon:hover{background:rgba(255,255,255,.1);color:#fff}
        @media(max-width:860px){.fxn-icon{width:44px;height:44px;border-radius:12px}}
        .fxn-search{display:flex;align-items:center;border-radius:12px;transition:all .25s ease}
        .fxn-search.open{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);padding-left:12px;width:min(280px,40vw)}
        .fxn-search-lead{color:rgba(255,255,255,.45);flex:0 0 auto}
        .fxn-search-input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:14px;padding:0 6px;height:40px}
        .fxn-search-input::placeholder{color:rgba(255,255,255,.4)}

        .fxn-profile{position:relative}
        .fxn-profile-btn{display:flex;align-items:center;gap:5px;padding:4px 7px 4px 4px;border-radius:999px;cursor:pointer;
          background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);transition:all .2s ease}
        .fxn-profile-btn:hover{background:rgba(255,255,255,.12)}
        .fxn-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover}
        .fxn-avatar-fallback{display:grid;place-items:center;background:rgba(255,255,255,.1);
          border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7)}
        .fxn-chev{color:rgba(255,255,255,.6);transition:transform .2s ease}

        .fxn-auth{display:flex;align-items:center;gap:8px}
        .fxn-ghost{padding:9px 16px;border-radius:11px;font-size:14px;font-weight:600;cursor:pointer;
          color:#fff;background:transparent;border:1px solid rgba(255,255,255,.18)}
        .fxn-ghost:hover{background:rgba(255,255,255,.08)}
        .fxn-primary{padding:9px 18px;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;color:#fff;border:0;
          background:linear-gradient(180deg,#ff4e78,#e0214f);box-shadow:0 8px 22px -6px rgba(255,62,108,.6)}
        .fxn-primary:hover{transform:translateY(-1px)}

        .fxn-dropdown{position:absolute;top:calc(100% + 12px);right:0;width:248px;border-radius:16px;padding:8px;
          background:rgba(16,18,24,.96);border:1px solid rgba(255,255,255,.1);
          box-shadow:0 24px 60px rgba(0,0,0,.6);backdrop-filter:blur(20px);animation:fxnDrop .2s ease}
        @keyframes fxnDrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        .fxn-dd-head{display:flex;align-items:center;gap:11px;padding:10px}
        .fxn-dd-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;flex:0 0 auto}
        .fxn-dd-id{min-width:0}
        .fxn-dd-email{font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
        .fxn-dd-plan{font-size:11px;color:#ff7d9c;margin:2px 0 0;font-weight:600}
        .fxn-dd-divider{height:1px;background:rgba(255,255,255,.08);margin:6px 4px}
        .fxn-dd-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:10px;
          font-size:13px;font-weight:600;color:rgba(255,255,255,.82);background:transparent;border:0;cursor:pointer;text-align:left}
        .fxn-dd-item:hover{background:rgba(255,255,255,.08);color:#fff}
        .fxn-dd-item.danger{color:#ff7d8c}
        .fxn-dd-item.danger:hover{background:rgba(255,62,108,.12)}

        .fxn-desktop{display:flex}
        .fxn-mobile{display:none}
        @media(max-width:860px){
          .fxn-nav{display:none}
          .fxn-search{display:none}
          .fxn-desktop{display:none!important}
          .fxn-mobile{display:grid}
          .fxn-auth.fxn-desktop{display:none!important}
        }

        .fxn-sheet-backdrop{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)}
        .fxn-sheet{position:fixed;left:0;right:0;bottom:0;z-index:61;padding:10px 18px calc(20px + env(safe-area-inset-bottom));
          background:#101218;border-top:1px solid rgba(255,255,255,.1);border-radius:22px 22px 0 0;
          box-shadow:0 -20px 60px rgba(0,0,0,.6);animation:fxnSheet .3s cubic-bezier(.22,1,.36,1)}
        @keyframes fxnSheet{from{transform:translateY(100%)}to{transform:none}}
        .fxn-sheet-handle{width:40px;height:4px;border-radius:3px;background:rgba(255,255,255,.2);margin:4px auto 10px}
        .fxn-sheet-nav{display:flex;flex-direction:column;gap:2px;margin-top:8px}
        .fxn-sheet-item{display:flex;align-items:center;gap:13px;padding:14px 12px;border-radius:12px;
          font-size:15px;font-weight:600;color:rgba(255,255,255,.85);background:transparent;border:0;cursor:pointer;text-align:left}
        .fxn-sheet-item:active{background:rgba(255,255,255,.08)}
        .fxn-sheet-item.danger{color:#ff7d8c}

        .fxn-msearch{position:fixed;inset:0;z-index:62;background:#06070a;padding:16px}
        .fxn-msearch-bar{display:flex;align-items:center;gap:10px;height:50px;padding:0 14px;border-radius:14px;
          background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
        .fxn-msearch-icon{color:rgba(255,255,255,.5);flex:0 0 auto}
        .fxn-msearch-input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:16px}
        .fxn-msearch-input::placeholder{color:rgba(255,255,255,.4)}
        .fxn-msearch-close{flex:0 0 auto;background:none;border:0;color:#ff7d9c;font-size:14px;font-weight:700;cursor:pointer}
        .fxn-msearch-hint{margin-top:14px}
        .fxn-msearch-hint-btn{display:flex;align-items:center;gap:9px;width:100%;padding:14px;border-radius:12px;
          background:rgba(255,255,255,.05);border:0;color:#fff;font-size:14px;cursor:pointer;text-align:left}
      `}</style>
    </>
  );
}
