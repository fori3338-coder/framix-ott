import { NavLink, useLocation } from "react-router-dom";
import { Home, TrendingUp, Sparkles, Bookmark, CreditCard } from "lucide-react";
import { useMemo } from "react";

/* ─────────────────────────────────────────────────────────
   모바일 Bottom Navigation
   홈 / 인기 / 신작 / 내 목록 / 구독
   - Glass UI, Safe Area 대응, 44px+ 터치 영역
   - Active: 아이콘 + 텍스트 + 흰색 indicator dot
───────────────────────────────────────────────────────── */

const TABS = [
  { key: "home",          label: "홈",      icon: Home,        to: "/",                   end: true  },
  { key: "trending",      label: "인기",    icon: TrendingUp,  to: "/search?cat=trending", end: false },
  { key: "new",           label: "신작",    icon: Sparkles,    to: "/search?cat=new",      end: false },
  { key: "my-list",       label: "내 목록", icon: Bookmark,    to: "/my-list",             end: false },
  { key: "subscription",  label: "구독",    icon: CreditCard,  to: "/subscription",        end: false },
];

export default function BottomNav() {
  const location = useLocation();

  /* search 경로는 cat 파라미터로 trending/new 구분 */
  const activeKey = useMemo(() => {
    const { pathname, search } = location;
    if (pathname === "/") return "home";
    if (pathname.startsWith("/search")) {
      const cat = new URLSearchParams(search).get("cat");
      if (cat === "trending") return "trending";
      if (cat === "new") return "new";
      return "";
    }
    if (pathname.startsWith("/my-list")) return "my-list";
    if (pathname.startsWith("/subscription")) return "subscription";
    return "";
  }, [location]);

  return (
    <nav
      className="fbnav"
      role="navigation"
      aria-label="하단 메뉴"
    >
      <div className="fbnav-inner">
        {TABS.map(({ key, label, icon: Icon, to }) => {
          const isActive = activeKey === key;
          return (
            <NavLink
              key={key}
              to={to}
              end={key === "home"}
              className="fbnav-tab"
              aria-current={isActive ? "page" : undefined}
            >
              <span className={`fbnav-icon-wrap${isActive ? " is-active" : ""}`}>
                <Icon
                  size={isActive ? 23 : 21}
                  strokeWidth={isActive ? 2.3 : 1.7}
                  aria-hidden="true"
                />
              </span>
              <span className={`fbnav-label${isActive ? " is-active" : ""}`}>
                {label}
              </span>
              {isActive && <span className="fbnav-dot" aria-hidden="true" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
