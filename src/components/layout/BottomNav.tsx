import { NavLink } from "react-router-dom";
import { Home, Search, Bookmark, Clock, User } from "lucide-react";

const tabs = [
  { to: "/", label: "홈", icon: Home, end: true },
  { to: "/search", label: "검색", icon: Search, end: false },
  { to: "/my-list", label: "보관함", icon: Bookmark, end: false },
  { to: "/history", label: "시청기록", icon: Clock, end: false },
  { to: "/admin", label: "관리", icon: User, end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-base/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors ${
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
      </div>
    </nav>
  );
}
