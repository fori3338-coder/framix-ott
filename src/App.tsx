import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import DramaDetail from "./pages/DramaDetail";
import Player from "./pages/Player";
import Search from "./pages/Search";
import MyList from "./pages/MyList";
import WatchHistory from "./pages/WatchHistory";
import Subscription from "./pages/Subscription";
import MySubscription from "./pages/MySubscription";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ContentUpload from "./pages/admin/ContentUpload";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFail from "./pages/PaymentFail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/drama/:id" element={<DramaDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/history" element={<WatchHistory />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/my/subscription" element={<MySubscription />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/upload" element={<ContentUpload />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
        </Route>
        <Route path="/watch/:id/:episodeId" element={<Player />} />
      </Routes>
    </BrowserRouter>
  );
}
