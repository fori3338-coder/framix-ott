import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function Layout() {
  const { pathname } = useLocation();
  const isPlayer = pathname.startsWith("/watch/");

  return (
    <div className="min-h-screen bg-base text-text overflow-x-hidden">
      <Header />
      <main className={isPlayer ? "" : "pb-24 md:pb-12"}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
