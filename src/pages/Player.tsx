import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Play, Pause,
  Heart, MessageCircle, Share2,
  VolumeX, Volume2, Lock, Maximize, Minimize
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { supabase } from "../lib/supabase";
import { recordEpisodeView } from "../lib/viewTracking";
import { dramas as mockDramas } from "../data/mockData";
import {
  showcaseTop10,
  showcaseNewEpisodes,
  showcaseRecommended,
  showcaseRomance,
  showcaseRevenge,
  showcaseOriginals,
} from "../data/showcaseData";
import type { Drama } from "../types";

// 모든 로컬 mock 드라마를 id 기준으로 검색 (중복 id는 최초 항목 사용)
function findLocalDrama(id: string | undefined): Drama | null {
  if (!id) return null;
  const allLocal = [
    ...mockDramas,
    ...showcaseTop10,
    ...showcaseNewEpisodes,
    ...showcaseRecommended,
    ...showcaseRomance,
    ...showcaseRevenge,
    ...showcaseOriginals,
  ];
  const seen = new Set<string>();
  for (const d of allLocal) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    if (d.id === id) return d;
  }
  return null;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────
const EPISODE_DURATION_SECONDS = 720; // 기본 12분 (실제 duration 파싱 전 fallback)
const CONTROLS_HIDE_DELAY_MS = 2000; // 마우스가 멈춘 뒤 컨트롤을 숨기기까지의 시간

// 구형 Safari(특히 iOS)는 표준 Fullscreen API 대신 webkit 접두사 API를 쓰는 경우가 있어
// document/element에 안전하게 접근하기 위한 타입.
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

  const { drama: supabaseDrama, loading } = useDramaDetail(id);
  // Supabase에 없으면 로컬 mock 데이터(mockData + showcaseData)에서 fallback
  const drama = supabaseDrama ?? (!loading ? findLocalDrama(id) : null);
  const episode = drama?.episodes.find((e) => e.id === episodeId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedViewEpisodeRef = useRef<string | null>(null);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // ─── 조회수 기록 (재생 시작 시점) ───────────────────────────────────────
  // video의 'play' 이벤트는 일시정지 후 재생 등으로 여러 번 발생할 수 있으므로,
  // 같은 episode에 대해 이 Player 세션 안에서는 최초 1회만 RPC를 호출한다.
  // 서로 다른 사용자/브라우저 사이의 중복 집계 방지는 DB의 record_episode_view()
  // RPC가 viewer_id + dedupe 윈도우로 처리한다.
  const handlePlayStart = useCallback(() => {
    console.log("[Player] video onPlay 이벤트 발생", {
      seriesId: id,
      episodeId,
      alreadyRecordedFor: recordedViewEpisodeRef.current,
    });
    if (!id || !episodeId) {
      console.warn("[Player] id 또는 episodeId 없음 → 조회수 기록 생략");
      return;
    }
    if (recordedViewEpisodeRef.current === episodeId) {
      console.log("[Player] 이미 이 에피소드는 기록됨 → 생략");
      return;
    }
    recordedViewEpisodeRef.current = episodeId;
    recordEpisodeView(episodeId, id)
      .then((counted) => {
        console.log("[Player] 조회수 기록 결과:", counted);
      })
      .catch((err) => {
        console.error("조회수 기록 실패:", err);
      });
  }, [id, episodeId]);

  // ─── 영상 종료 핸들러 (수정: 두 로직이 한 함수 안에서 완전히 동작) ────────
  const handleVideoEnded = useCallback(async () => {
    if (!id || !episodeId) return;

    try {
      // 1) 시청 완료 기록
      await saveWatchHistory(episodeId, 100);

      // 2) 시리즈 조회수는 재생 "시작" 시점(handlePlayStart → record_episode_view RPC)에
      //    이미 기록되므로, 여기서 다시 증가시키면 같은 시청에 대해 조회수가 2번
      //    집계된다. 따라서 종료 시점의 중복 증가 호출은 제거한다.

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
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing]);

  // ─── 음소거 sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // ─── 볼륨 sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      if (volume === 0) setMuted(true);
      else setMuted(false);
    }
  }, [volume]);

  // ─── 전체화면 토글 ────────────────────────────────────────────────────────
  const handleFullscreen = useCallback(async () => {
    const container = videoContainerRef.current as FullscreenElement | null;
    const video = videoRef.current as FullscreenVideo | null;
    if (!container) return;

    try {
      if (getFullscreenElement()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          (document as FullscreenDocument).webkitExitFullscreen?.();
        }
        return;
      }

      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        // iPhone Safari는 컨테이너 단위 Fullscreen API를 지원하지 않아
        // video 태그 자체의 네이티브 전체화면으로 대체한다.
        video.webkitEnterFullscreen();
      }
    } catch (err) {
      console.error("[Player] 전체화면 전환 실패:", err);
    }
  }, []);

  // 브라우저/OS의 전체화면 상태 변화를 감지해서 아이콘과 동기화
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  // ─── 10초 앞/뒤로 ─────────────────────────────────────────────────────────
  const skipBack = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 10);
  }, []);

  const skipForward = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
  }, []);

  // ─── 키보드 단축키: F = 전체화면 진입/해제, ESC = 전체화면 해제 ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFullscreen();
      } else if (e.key === "Escape" && getFullscreenElement()) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else {
          (document as FullscreenDocument).webkitExitFullscreen?.();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipForward();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10));
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFullscreen, skipBack, skipForward]);

  // ─── 컨트롤 자동 숨김 (넷플릭스 스타일) ──────────────────────────────────
  // 재생 중에는 마우스가 2초간 멈추면 숨기고, 일시정지 중에는 항상 표시한다.
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (!playing) return; // 일시정지 상태에서는 자동으로 숨기지 않음
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_HIDE_DELAY_MS);
  }, [playing]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  // 재생 상태가 바뀔 때마다(재생 시작 / 일시정지) 자동숨김 타이머를 다시 건다.
  // 즉시 보여주는 처리는 클릭/마우스무브 핸들러(revealControls)에서 이미 하므로
  // 여기서는 타이머만 (재)예약한다 — effect 안에서 setState를 직접 호출하지 않기 위함.
  useEffect(() => {
    scheduleHideControls();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [playing, scheduleHideControls]);

  const handleVideoClick = () => {
    revealControls();
    setPlaying((p) => !p);
  };

  if (loading) return <div className="text-white p-10">Loading...</div>;
  if (!drama || !episode) return <div className="text-white p-10">Not Found</div>;

  const isLocked = !episode.isFree;
  const hasVideo = !!episode.videoUrl;
  const controlsVisible = showControls || isLocked;
  const fadeClass = `transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`;

  return (
    <div
      ref={videoContainerRef}
      className="fixed inset-0 bg-black text-white"
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
          onPlay={handlePlayStart}
          onPlaying={handlePlayStart}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (v?.duration) {
              setProgress((v.currentTime / v.duration) * 100);
            }
          }}
          onEnded={handleVideoEnded}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center space-y-2">
            <p className="text-white font-bold text-lg">영상이 아직 등록되지 않았습니다</p>
            <p className="text-white/50 text-sm">관리자에서 영상 파일을 업로드해 주세요</p>
          </div>
        </div>
      )}

      {/* OVERLAY - 컨트롤이 보일 때만 화면을 살짝 어둡게 */}
      <div className={`absolute inset-0 bg-black/40 pointer-events-none ${fadeClass}`} />

      {/* TOP BAR: 뒤로가기 버튼 — 항상 표시 (자동숨김 제외) */}
      <div className="absolute top-0 left-0 p-4 z-20">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={28} />
        </button>
      </div>

      {/* TOP BAR: 드라마 제목 + 에피소드명 — showControls 연동 자동숨김 */}
      <div className={`absolute top-0 left-0 right-0 flex justify-center items-center p-4 pointer-events-none z-10 ${fadeClass}`}>
        <div className="text-center">
          <div className="font-semibold text-sm">{drama.title}</div>
          <div className="text-xs opacity-70">{episode.title}</div>
        </div>
      </div>

      {/* CENTER CONTROLS */}
      {!isLocked && (
        <div className={`absolute inset-0 flex items-center justify-center gap-6 pointer-events-none ${fadeClass}`}>
          {/* ⏮ 10초 뒤로 */}
          <button
            onClick={(e) => { e.stopPropagation(); revealControls(); skipBack(); }}
            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto transition-all duration-200 hover:shadow-[0_0_12px_3px_rgba(212,175,55,0.6)]"
            aria-label="10초 뒤로"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              <text x="9" y="15" fontSize="5" fill="white" fontWeight="bold">10</text>
            </svg>
          </button>

          {/* ▶ / ⏸ 재생/일시정지 */}
          <button
            onClick={(e) => { e.stopPropagation(); revealControls(); setPlaying((p) => !p); }}
            className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto transition-all duration-200 hover:shadow-[0_0_16px_4px_rgba(212,175,55,0.65)]"
            aria-label={playing ? "일시정지" : "재생"}
          >
            {playing ? <Pause size={36} /> : <Play size={36} />}
          </button>

          {/* ⏭ 10초 앞으로 */}
          <button
            onClick={(e) => { e.stopPropagation(); revealControls(); skipForward(); }}
            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto transition-all duration-200 hover:shadow-[0_0_12px_3px_rgba(212,175,55,0.6)]"
            aria-label="10초 앞으로"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
              <text x="9" y="15" fontSize="5" fill="white" fontWeight="bold">10</text>
            </svg>
          </button>
        </div>
      )}

      {/* RIGHT ACTIONS (전체화면 버튼 포함) */}
      <div className={`absolute right-4 bottom-24 flex flex-col gap-5 items-center pointer-events-none ${fadeClass}`}>
        <button onClick={() => setLiked((p) => !p)} className="flex flex-col items-center gap-1 pointer-events-auto">
          <Heart size={26} className={liked ? "text-red-500 fill-red-500" : ""} />
        </button>
        <button className="flex flex-col items-center gap-1 pointer-events-auto">
          <MessageCircle size={26} />
        </button>
        <button className="flex flex-col items-center gap-1 pointer-events-auto">
          <Share2 size={26} />
        </button>

        {/* 볼륨 컨트롤 */}
        <div
          className="flex flex-col items-center gap-1 pointer-events-auto relative"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            onClick={() => {
              if (muted) { setMuted(false); if (volume === 0) setVolume(1); }
              else setMuted(true);
            }}
            className="flex flex-col items-center gap-1"
            aria-label="볼륨"
          >
            {muted || volume === 0 ? <VolumeX size={26} /> : <Volume2 size={26} />}
          </button>
          {/* PC: 항상 표시 / 모바일: showVolumeSlider 시 표시 */}
          <div
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 transition-opacity duration-200 ${
              showVolumeSlider ? "opacity-100" : "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
            }`}
            style={{ touchAction: "none" }}
          >
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={(e) => {
                const val = Number(e.target.value) / 100;
                setVolume(val);
              }}
              className="h-20 cursor-pointer"
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                accentColor: "#D4AF37",
                width: "4px",
              }}
              aria-label="볼륨 슬라이더"
            />
          </div>
        </div>

        <button
          onClick={handleFullscreen}
          aria-label="전체화면"
          className="flex flex-col items-center gap-1 pointer-events-auto"
        >
          {isFullscreen ? <Minimize size={26} /> : <Maximize size={26} />}
        </button>
      </div>

      {/* BOTTOM PROGRESS */}
      <div className={`absolute bottom-0 w-full px-4 pb-6 pointer-events-none ${fadeClass}`}>
        <div
          className="h-1 bg-white/20 rounded cursor-pointer pointer-events-auto"
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
