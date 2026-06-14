import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Play, Pause,
  Heart, MessageCircle, Share2, List,
  VolumeX, Volume2, Lock
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { supabase } from "../lib/supabase";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const EPISODE_DURATION_SECONDS = 720; // 기본 12분 (실제 duration 파싱 전 fallback)

// ─── watch_history upsert ────────────────────────────────────────────────────
async function saveWatchHistory(episodeId: string, progressPercent: number) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const progressSeconds = Math.round(
      (progressPercent / 100) * EPISODE_DURATION_SECONDS
    );

    await supabase.from("watch_history").upsert(
      {
        user_id: userId,
        episode_id: episodeId,
        progress_seconds: progressSeconds,
        completed: progressPercent >= 100,
        watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,episode_id" }
    );
  } catch (e) {
    console.error("saveWatchHistory error:", e);
  }
}

// ─── Player ──────────────────────────────────────────────────────────────────
export default function Player() {
  const { id, episodeId } = useParams();
  const navigate = useNavigate();

  const { drama, loading } = useDramaDetail(id);
  const episode = drama?.episodes.find((e) => e.id === episodeId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);

  // ─── 영상 종료 핸들러 (수정: 두 로직이 한 함수 안에서 완전히 동작) ────────
  const handleVideoEnded = useCallback(async () => {
    if (!id || !episodeId) return;

    try {
      // 1) 시청 완료 기록
      await saveWatchHistory(episodeId, 100);

      // 2) 시리즈 조회수 증가
      const { error } = await supabase.rpc("increment_series_views", {
        series_id: id,
      });
      if (error) console.error("VIEW 증가 실패:", error);

      // 3) 다음 에피소드 자동 이동
      const currentIndex = drama?.episodes.findIndex((e) => e.id === episodeId) ?? -1;
      const next = drama?.episodes?.[currentIndex + 1];
      if (next) {
        navigate(`/watch/${id}/${next.id}`);
      }
    } catch (err) {
      console.error("handleVideoEnded error:", err);
    }
  }, [id, episodeId, drama, navigate]);

  // ─── 재생/일시정지 sync ────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.play().catch(() => {}) : v.pause();
  }, [playing]);

  // ─── 음소거 sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  if (loading) return <div className="text-white p-10">Loading...</div>;
  if (!drama || !episode) return <div className="text-white p-10">Not Found</div>;

  const isLocked = !episode.isFree;

  return (
    <div className="fixed inset-0 bg-black text-white">

      {/* VIDEO */}
      <video
        ref={videoRef}
        src={episode.videoUrl}
        className="w-full h-full object-cover"
        autoPlay
        muted={muted}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v?.duration) {
            setProgress((v.currentTime / v.duration) * 100);
          }
        }}
        onEnded={handleVideoEnded}
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/40" />

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={28} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm">{drama.title}</div>
          <div className="text-xs opacity-70">{episode.title}</div>
        </div>
        <button className="p-1">
          <List size={22} />
        </button>
      </div>

      {/* CENTER CONTROLS */}
      {!isLocked && (
        <div className="absolute inset-0 flex items-center justify-center gap-10">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center"
          >
            {playing ? <Pause size={36} /> : <Play size={36} />}
          </button>
        </div>
      )}

      {/* RIGHT ACTIONS */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-5 items-center">
        <button onClick={() => setLiked((p) => !p)} className="flex flex-col items-center gap-1">
          <Heart size={26} className={liked ? "text-red-500 fill-red-500" : ""} />
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle size={26} />
        </button>
        <button className="flex flex-col items-center gap-1">
          <Share2 size={26} />
        </button>
        <button onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1">
          {muted ? <VolumeX size={26} /> : <Volume2 size={26} />}
        </button>
      </div>

      {/* BOTTOM PROGRESS */}
      <div className="absolute bottom-0 w-full px-4 pb-6">
        <div
          className="h-1 bg-white/20 rounded cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setProgress(pct);
            if (videoRef.current?.duration) {
              videoRef.current.currentTime = (pct / 100) * videoRef.current.duration;
            }
            if (episodeId) saveWatchHistory(episodeId, pct);
          }}
        >
          <div
            className="h-full bg-yellow-400 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* LOCK OVERLAY */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-3">
            <Lock size={40} className="mx-auto text-gold" />
            <p className="font-bold text-lg">VIP 전용 콘텐츠</p>
            <p className="text-sm text-white/60">구독 후 무제한 시청하세요</p>
            <button
              onClick={() => navigate("/subscription")}
              className="mt-2 px-6 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-sm"
            >
              구독하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
