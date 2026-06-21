import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function Layout() {
  const { pathname } = useLocation();
  const isPlayer = pathname.startsWith("/watch");

  return (
    <div className="min-h-screen bg-base text-text overflow-x-hidden">
      {!isPlayer && <Header />}
      <main className={isPlayer ? "" : "pb-24 md:pb-12"}>
        {isPlayer ? (
          // Player 페이지는 자체 position:fixed 전체화면 스테이지를 사용하므로
          // 페이지 전환 래퍼(transform 영향 가능성)를 적용하지 않고 그대로 렌더링한다.
          <Outlet />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      {!isPlayer && <BottomNav />}
    </div>
  );
}
