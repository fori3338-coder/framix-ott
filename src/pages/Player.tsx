import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Play, Pause, SkipForward, SkipBack,
  Heart, MessageCircle, Share2, List,
  Volume2, VolumeX, Maximize, Lock
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { supabase } from "../lib/supabase";

// watch history 저장
const EPISODE_DURATION_SECONDS = 720;

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
    console.log(e);
  }
}

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
  const [showControls, setShowControls] = useState(true);

  // =========================
  // ✅ VIEW + HISTORY END FIX (핵심)
  // =========================
  const handleVideoEnded = useCallback(() => {
    if (!id || !episodeId) return;

    // 1) watch history 100%
    saveWatchHistory(episodeId, 100);

    // 2) views 증가 (RPC)
    supabase.rpc("increment_series_views", {
      series_id: id,
    });

    // 다음 에피소드 자동 이동
    const currentIndex = drama?.episodes.findIndex((e) => e.id === episodeId);
    const next = drama?.episodes?.[currentIndex + 1];
    if (next) {
      navigate(`/watch/${id}/${next.id}`);
    }
  }, [id, episodeId, drama]);

  // video play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.play().catch(() => {}) : v.pause();
  }, [playing]);

  // mute sync
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

      {/* TOP */}
      <div className="absolute top-0 left-0 right-0 flex justify-between p-4">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft />
        </button>
        <div>
          <div>{drama.title}</div>
          <div className="text-sm opacity-70">{episode.title}</div>
        </div>
        <button>
          <List />
        </button>
      </div>

      {/* CENTER CONTROLS */}
      {!isLocked && (
        <div className="absolute inset-0 flex items-center justify-center gap-10">
          <button onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={40} /> : <Play size={40} />}
          </button>
        </div>
      )}

      {/* RIGHT ACTIONS */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-4">
        <button onClick={() => setLiked((p) => !p)}>
          <Heart className={liked ? "text-red-500 fill-red-500" : ""} />
        </button>
        <MessageCircle />
        <Share2 />
      </div>

      {/* BOTTOM PROGRESS */}
      <div className="absolute bottom-0 w-full p-4">
        <div
          className="h-1 bg-white/20"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setProgress(pct);

            if (videoRef.current?.duration) {
              videoRef.current.currentTime =
                (pct / 100) * videoRef.current.duration;
            }

            saveWatchHistory(episodeId!, pct);
          }}
        >
          <div
            className="h-full bg-yellow-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* LOCK */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Lock className="mx-auto mb-2" />
            <div>VIP 콘텐츠</div>
            <button onClick={() => navigate("/subscription")}>
              구독하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
