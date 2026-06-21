import { NavLink } from "react-router-dom";
import { Home, Search, Bookmark, Clock, User } from "lucide-react";
import { useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthModal from "../AuthModal";
import Portal from "../Portal";

const tabs = [
  { to: "/", label: "홈", icon: Home, end: true },
  { to: "/search", label: "검색", icon: Search, end: false },
  { to: "/my-list", label: "보관함", icon: Bookmark, end: false },
  { to: "/history", label: "시청기록", icon: Clock, end: false },
  { to: "/my-info", label: "내정보", icon: User, end: false },
];

export default function BottomNav() {
  const { user } = useAuthContext();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleMyInfoClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setAuthModalOpen(true);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-base/95 backdrop-blur-md border-t border-border safe-bottom safe-x">

      <div className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={to === "/my-info" ? handleMyInfoClick : undefined}
            className={({ isActive }: { isActive: boolean }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] transition-colors active:scale-95 ${
                isActive ? "text-gold" : "text-text-muted"
              }`
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={isActive ? "font-semibold" : ""}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {authModalOpen && (
        <Portal>
          <AuthModal onClose={() => setAuthModalOpen(false)} defaultMode="login" />
        </Portal>
      )}
    </nav>
  );
}
