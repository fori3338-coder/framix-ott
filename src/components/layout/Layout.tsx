import { Outlet } from "react-router-dom";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-base text-text">
      <Header />
      <main className="pb-20 md:pb-12">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
