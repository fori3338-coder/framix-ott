import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Play, Pause,
  Heart,
  VolumeX, Volume2, Lock, Maximize, Minimize,
  SkipBack, SkipForward, ChevronLeftIcon, ChevronRight,
  SkipForward as NextEpisodeIcon
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { useSubscription } from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";

const EPISODE_DURATION_SECONDS = 720;
const CONTROLS_HIDE_DELAY_MS = 3000;
const RESUME_KEY = (id: string) => `framix_resume_${id}`;

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};
type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function saveWatchHistory(episodeId: string, progressPercent: number) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    const progressSeconds = Math.round((progressPercent / 100) * EPISODE_DURATION_SECONDS);
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

export default function Player() {
  const { id, episodeId } = useParams();
  const navigate = useNavigate();

  const { drama, loading } = useDramaDetail(id);
  const episode = drama?.episodes.find((e) => e.id === episodeId);
  const { isActive: isSubscribed } = useSubscription();

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeAutoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeDismissedRef = useRef(false);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  // resume dialog
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  // auto next overlay
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(5);

  const currentIndex = drama?.episodes.findIndex((e) => e.id === episodeId) ?? -1;
  const prevEpisode = currentIndex > 0 ? drama?.episodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && drama?.episodes[currentIndex + 1] ? drama.episodes[currentIndex + 1] : null;

  // ─── 이어보기 확인 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!episodeId) return;
    if (resumeDismissedRef.current) return;
    const saved = localStorage.getItem(RESUME_KEY(episodeId));
    if (saved) {
      const t = parseFloat(saved);
      if (t > 5) {
        setResumeTime(t);
        setShowResumeDialog(true);
        setPlaying(false);
      }
    }
  }, [episodeId]);

  // ─── 이어보기 카드 5초 후 자동 닫힘 ──────────────────────────────────────
  useEffect(() => {
    if (!showResumeDialog) return;
    if (resumeAutoCloseTimerRef.current) clearTimeout(resumeAutoCloseTimerRef.current);
    resumeAutoCloseTimerRef.current = setTimeout(() => {
      setShowResumeDialog(false);
      resumeDismissedRef.current = true;
      setPlaying(true);
    }, 5000);
    return () => {
      if (resumeAutoCloseTimerRef.current) clearTimeout(resumeAutoCloseTimerRef.current);
    };
  }, [showResumeDialog]);

  const handleResume = () => {
    if (resumeAutoCloseTimerRef.current) clearTimeout(resumeAutoCloseTimerRef.current);
    resumeDismissedRef.current = true;
    if (videoRef.current) videoRef.current.currentTime = resumeTime;
    setShowResumeDialog(false);
    setPlaying(true);
  };
  const handleStartOver = () => {
    if (resumeAutoCloseTimerRef.current) clearTimeout(resumeAutoCloseTimerRef.current);
    resumeDismissedRef.current = true;
    if (videoRef.current) videoRef.current.currentTime = 0;
    setShowResumeDialog(false);
    setPlaying(true);
  };

  // ─── 영상 진행 저장 (localStorage) ───────────────────────────────────────
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);
    if (episodeId) localStorage.setItem(RESUME_KEY(episodeId), String(v.currentTime));

    // 자동 다음화: 종료 10초 전
    const remaining = v.duration - v.currentTime;
    if (remaining <= 10 && remaining > 0 && nextEpisode && !showAutoNext) {
      setShowAutoNext(true);
      setAutoNextCountdown(5);
    }
  };

  // ─── 자동 다음화 카운트다운 ──────────────────────────────────────────────
  useEffect(() => {
    if (!showAutoNext) return;
    if (autoNextCountdown <= 0) {
      if (nextEpisode && id) navigate(`/watch/${id}/${nextEpisode.id}`);
      return;
    }
    const t = setTimeout(() => setAutoNextCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showAutoNext, autoNextCountdown, nextEpisode, id, navigate]);

  const cancelAutoNext = () => {
    setShowAutoNext(false);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
  };

  // ─── 영상 종료 ───────────────────────────────────────────────────────────
  const handleVideoEnded = useCallback(async () => {
    if (!id || !episodeId) return;
    try {
      if (episodeId) localStorage.removeItem(RESUME_KEY(episodeId));
      await saveWatchHistory(episodeId, 100);
      const { error } = await supabase.rpc("increment_series_views", { series_id: id });
      if (error) console.error("VIEW 증가 실패:", error);
      if (nextEpisode) navigate(`/watch/${id}/${nextEpisode.id}`);
    } catch (err) {
      console.error("handleVideoEnded error:", err);
    }
  }, [id, episodeId, nextEpisode, navigate]);

  // ─── 재생/일시정지 sync ──────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.play().catch(() => {}); } else { v.pause(); }
  }, [playing]);

  // ─── 볼륨 sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = muted;
    videoRef.current.volume = volume;
  }, [muted, volume]);

  // ─── 전체화면 ────────────────────────────────────────────────────────────
  const handleFullscreen = useCallback(async () => {
    const container = videoContainerRef.current as FullscreenElement | null;
    const video = videoRef.current as FullscreenVideo | null;
    if (!container) return;
    try {
      if (getFullscreenElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else (document as FullscreenDocument).webkitExitFullscreen?.();
        return;
      }
      if (container.requestFullscreen) await container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (video?.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch (err) {
      console.error("[Player] 전체화면 전환 실패:", err);
    }
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  // ─── 키보드 단축키 ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        revealControls();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seek(10);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMuted((m) => !m);
      } else if (e.key === "Escape" && getFullscreenElement()) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else (document as FullscreenDocument).webkitExitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFullscreen]);

  // ─── 컨트롤 자동 숨김 ───────────────────────────────────────────────────
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (!playing) return;
    hideControlsTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY_MS);
  }, [playing]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  useEffect(() => {
    scheduleHideControls();
    return () => { if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current); };
  }, [playing, scheduleHideControls]);

  // 모바일: 탭하면 컨트롤 표시, 3초 후 자동 숨김
  const handleVideoClick = () => {
    revealControls();
    setPlaying((p) => !p);
  };

  // ─── 볼륨 슬라이더 자동 숨김 ────────────────────────────────────────────
  const scheduleHideVolume = useCallback(() => {
    if (volumeHideTimerRef.current) clearTimeout(volumeHideTimerRef.current);
    volumeHideTimerRef.current = setTimeout(() => setShowVolumeSlider(false), 3000);
  }, []);

  const handleVolumeClick = () => {
    if (!showVolumeSlider) {
      setShowVolumeSlider(true);
      scheduleHideVolume();
    } else {
      setMuted((m) => !m);
      scheduleHideVolume();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    scheduleHideVolume();
  };

  // ─── 10초 이동 ───────────────────────────────────────────────────────────
  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    revealControls();
  };

  // ─── 다음화 이동 ─────────────────────────────────────────────────────────
  const goToNextEpisode = () => {
    if (nextEpisode && id) navigate(`/watch/${id}/${nextEpisode.id}`);
  };

  if (loading) return <div className="text-white p-10">Loading...</div>;
  if (!drama || !episode) return <div className="text-white p-10">Not Found</div>;

  const isLocked = !episode.isFree && !isSubscribed;
  const hasVideo = !!episode.videoUrl && !isLocked;
  const controlsVisible = showControls || isLocked;
  const fadeClass = `transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`;

  return (
    <div
      ref={videoContainerRef}
      className="fixed inset-0 bg-black text-white select-none"
      onMouseMove={revealControls}
      onTouchStart={revealControls}
    >
      {/* VIDEO */}
      {hasVideo ? (
        <video
          ref={videoRef}
          src={episode.videoUrl}
          className="w-full h-full object-cover cursor-pointer"
          autoPlay
          muted={muted}
          onClick={handleVideoClick}
          onDoubleClick={handleFullscreen}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          playsInline
          webkit-playsinline="true"
        />
      ) : !isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center space-y-2">
            <p className="text-white font-bold text-lg">영상이 아직 등록되지 않았습니다</p>
            <p className="text-white/50 text-sm">관리자에서 영상 파일을 업로드해 주세요</p>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      {/* GRADIENT OVERLAY - 상단/하단 */}
      <div className={`absolute inset-0 pointer-events-none ${fadeClass}`}
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.85) 100%)"
        }}
      />

      {/* TOP BAR - 뒤로가기 + 제목 */}
      <div className={`absolute top-0 left-0 right-0 flex items-center p-4 z-20 ${fadeClass}`}>
        <button onClick={() => navigate(-1)} className="p-1 mr-3">
          <ChevronLeft size={28} />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-sm">{drama.title}</div>
          <div className="text-xs opacity-70">{episode.title}</div>
        </div>
        {/* 좋아요 버튼 (우측 상단) */}
        <button onClick={() => setLiked((p) => !p)} className="p-1">
          <Heart size={22} className={liked ? "text-red-500 fill-red-500" : ""} />
        </button>
      </div>

      {/* CENTER CONTROLS - 이전화/다음화 (가운데 중앙) */}
      {!isLocked && (
        <div className={`absolute inset-0 flex items-center justify-center gap-8 pointer-events-none ${fadeClass}`}>
          {prevEpisode && (
            <button
              onClick={() => id && navigate(`/watch/${id}/${prevEpisode.id}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 border border-white/20 text-sm font-semibold pointer-events-auto"
            >
              <ChevronLeftIcon size={16} /> 이전화
            </button>
          )}
          {nextEpisode && (
            <button
              onClick={() => id && navigate(`/watch/${id}/${nextEpisode.id}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 border border-white/20 text-sm font-semibold pointer-events-auto"
            >
              다음화 <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* BOTTOM CONTROLS - Netflix 스타일 */}
      {!isLocked && (
        <div className={`absolute bottom-0 left-0 right-0 px-4 pb-4 z-20 ${fadeClass}`}>
          {/* 프로그레스 바 */}
          <div
            className="h-1 bg-white/30 rounded cursor-pointer pointer-events-auto mb-4"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              setProgress(pct);
              if (videoRef.current?.duration) videoRef.current.currentTime = (pct / 100) * videoRef.current.duration;
              if (episodeId) saveWatchHistory(episodeId, pct);
            }}
          >
            <div className="h-full bg-red-600 rounded transition-all relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
            </div>
          </div>

          {/* 버튼 행 */}
          <div className="flex items-center justify-between pointer-events-auto">
            {/* 좌측: 재생 + 10초 뒤로 + 10초 앞으로 + 볼륨 */}
            <div className="flex items-center gap-3">
              {/* 재생/일시정지 */}
              <button
                onClick={() => { revealControls(); setPlaying((p) => !p); }}
                className="p-1.5 hover:scale-110 transition-transform"
                aria-label={playing ? "일시정지" : "재생"}
              >
                {playing ? <Pause size={28} /> : <Play size={28} />}
              </button>

              {/* 10초 뒤로 */}
              <button
                onClick={() => seek(-10)}
                className="flex flex-col items-center justify-center gap-0.5 p-1 hover:scale-110 transition-transform"
                title="10초 뒤로"
                aria-label="10초 뒤로"
              >
                <SkipBack size={22} />
                <span className="text-[9px] font-bold leading-none">10</span>
              </button>

              {/* 10초 앞으로 */}
              <button
                onClick={() => seek(10)}
                className="flex flex-col items-center justify-center gap-0.5 p-1 hover:scale-110 transition-transform"
                title="10초 앞으로"
                aria-label="10초 앞으로"
              >
                <SkipForward size={22} />
                <span className="text-[9px] font-bold leading-none">10</span>
              </button>

              {/* 볼륨 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleVolumeClick}
                  className="p-1 hover:scale-110 transition-transform"
                  aria-label={muted ? "음소거 해제" : "음소거"}
                >
                  {muted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
                {/* 볼륨 슬라이더 - PC/모바일 동시 지원 */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"}`}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    onMouseMove={scheduleHideVolume}
                    onTouchMove={scheduleHideVolume}
                    className="w-20 accent-white cursor-pointer"
                    style={{ writingMode: "horizontal-tb" }}
                  />
                </div>
              </div>
            </div>

            {/* 우측: 다음화 + 전체화면 */}
            <div className="flex items-center gap-3">
              {/* 다음화 버튼 */}
              {nextEpisode && (
                <button
                  onClick={goToNextEpisode}
                  className="flex items-center gap-1 p-1 hover:scale-110 transition-transform"
                  title="다음화"
                  aria-label="다음화"
                >
                  <NextEpisodeIcon size={22} />
                  <div className="w-0.5 h-5 bg-white rounded" />
                </button>
              )}

              {/* 전체화면 */}
              <button
                onClick={handleFullscreen}
                className="p-1 hover:scale-110 transition-transform"
                aria-label="전체화면"
              >
                {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCK OVERLAY */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
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

      {/* 이어보기 카드 (우측 하단) */}
      {showResumeDialog && (
        <div className="absolute z-30" style={{ right: 16, bottom: 80 }}>
          <div className="bg-zinc-900/95 border border-white/10 rounded-xl p-4 min-w-[240px] space-y-3">
            <p className="text-sm font-bold">이어서 시청하기</p>
            <p className="text-xs text-white/60">
              {Math.floor(resumeTime / 60)}분{Math.floor(resumeTime % 60)}초부터 재생
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleStartOver}
                className="flex-1 py-2 rounded-full border border-white/20 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                처음부터 보기
              </button>
              <button
                onClick={handleResume}
                className="flex-1 py-2 rounded-full bg-yellow-400 text-black text-xs font-bold hover:brightness-110 transition-all"
              >
                이어보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 자동 다음화 오버레이 (Netflix 스타일) */}
      {showAutoNext && nextEpisode && (
        <div className="absolute bottom-20 right-4 z-30 flex flex-col items-end gap-2">
          <div className="bg-zinc-900/95 border border-white/10 rounded-xl p-4 min-w-[200px] space-y-3">
            <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">다음 화</p>
            <p className="text-sm font-bold">{nextEpisode.title}</p>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={cancelAutoNext}
                className="text-xs text-white/60 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => id && navigate(`/watch/${id}/${nextEpisode.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400 text-black text-xs font-bold hover:brightness-110 transition-all"
              >
                다음화 ▶ <span className="tabular-nums">{autoNextCountdown}초</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
