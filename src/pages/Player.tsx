import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Play, Pause,
  Heart,
  VolumeX, Volume2, Lock, Maximize, Minimize,
  SkipBack, SkipForward, ChevronLeftIcon, ChevronRight,
  SkipForward as NextEpisodeIcon,
  List, Subtitles, Check, X,
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { useSubscription } from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";

const CONTROLS_HIDE_DELAY_MS = 3000;
const RESUME_KEY = (id: string) => `framix_resume_${id}`;
const SUBTITLE_KEY = "framix_subtitle_lang";

// ─── 지원 자막 언어 목록 ─────────────────────────────────────────────────────
const SUBTITLE_LANGUAGES = [
  { code: "off",  label: "자막 끄기" },
  { code: "ko",   label: "한국어 (CC)" },
  { code: "en",   label: "English" },
  { code: "en-cc",label: "English (CC)" },
  { code: "ja",   label: "日本語" },
  { code: "zh-cn",label: "中文 (简体)" },
  { code: "zh-tw",label: "中文 (繁體)" },
  { code: "es",   label: "Español" },
  { code: "fr",   label: "Français" },
  { code: "de",   label: "Deutsch" },
  { code: "it",   label: "Italiano" },
  { code: "pt-br",label: "Português (Brasil)" },
  { code: "ru",   label: "Русский" },
  { code: "ar",   label: "العربية" },
  { code: "th",   label: "ภาษาไทย" },
  { code: "vi",   label: "Tiếng Việt" },
  { code: "id",   label: "Bahasa Indonesia" },
  { code: "ms",   label: "Bahasa Melayu" },
  { code: "tr",   label: "Türkçe" },
  { code: "nl",   label: "Nederlands" },
  { code: "no",   label: "Norsk" },
  { code: "da",   label: "Dansk" },
  { code: "sv",   label: "Svenska" },
  { code: "el",   label: "Ελληνικά" },
  { code: "cs",   label: "Čeština" },
  { code: "ro",   label: "Română" },
  { code: "hr",   label: "Hrvatski" },
];

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

// ─── watch_history 저장 (progress_seconds 기반) ──────────────────────────────
async function saveWatchHistory(episodeId: string, currentTime: number, duration: number) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    const progressSeconds = Math.round(currentTime);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const completed = progressPercent >= 95;
    await supabase.from("watch_history").upsert(
      {
        user_id: userId,
        episode_id: episodeId,
        progress_seconds: progressSeconds,
        completed,
        watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,episode_id" }
    );
  } catch (e) {
    console.error("saveWatchHistory error:", e);
  }
}

// ─── watch_history 조회 ──────────────────────────────────────────────────────
async function loadWatchHistory(episodeId: string): Promise<{ progressSeconds: number; completed: boolean } | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return null;
    const { data } = await supabase
      .from("watch_history")
      .select("progress_seconds, completed")
      .eq("user_id", userId)
      .eq("episode_id", episodeId)
      .maybeSingle();
    if (!data) return null;
    return { progressSeconds: data.progress_seconds ?? 0, completed: data.completed ?? false };
  } catch {
    return null;
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
  const saveHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekAppliedRef = useRef(false); // 이어보기 seek 중복 방지

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  // 자동 다음화
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(5);
  // 에피소드 패널
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  // 자막 패널
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState<string>(() =>
    localStorage.getItem(SUBTITLE_KEY) ?? "off"
  );

  const currentIndex = drama?.episodes.findIndex((e) => e.id === episodeId) ?? -1;
  const prevEpisode = currentIndex > 0 ? drama?.episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && drama?.episodes[currentIndex + 1]
      ? drama.episodes[currentIndex + 1]
      : null;

  // ─── 자동 이어보기: DB watch_history → localStorage fallback ─────────────
  useEffect(() => {
    if (!episodeId) return;
    seekAppliedRef.current = false;

    async function applyResume() {
      // 1) DB 우선
      const hist = await loadWatchHistory(episodeId!);
      if (hist) {
        if (hist.completed) {
          // 95% 이상 시청 완료 → 처음부터
          seekAppliedRef.current = true;
          return;
        }
        if (hist.progressSeconds > 5) {
          // video가 아직 로드 안 됐을 수 있으므로 canplay 이후에 seek
          const applySeek = () => {
            if (seekAppliedRef.current) return;
            seekAppliedRef.current = true;
            if (videoRef.current) {
              videoRef.current.currentTime = hist.progressSeconds;
            }
          };
          if (videoRef.current && videoRef.current.readyState >= 1) {
            applySeek();
          } else {
            videoRef.current?.addEventListener("loadedmetadata", applySeek, { once: true });
          }
          return;
        }
      }
      // 2) localStorage fallback
      const saved = localStorage.getItem(RESUME_KEY(episodeId!));
      if (saved) {
        const t = parseFloat(saved);
        if (t > 5) {
          const applySeek = () => {
            if (seekAppliedRef.current) return;
            seekAppliedRef.current = true;
            if (videoRef.current) videoRef.current.currentTime = t;
          };
          if (videoRef.current && videoRef.current.readyState >= 1) {
            applySeek();
          } else {
            videoRef.current?.addEventListener("loadedmetadata", applySeek, { once: true });
          }
        }
      }
    }

    applyResume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId]);

  // ─── 자막 DOM 주입 (track 요소를 JS로 직접 생성) ─────────────────────────
  // JSX <track> 대신 JS DOM으로 삽입해야 브라우저가 즉시 mode 제어를 수용함
  // HOTFIX STEP7-2A: 영상(framix-ott.pages.dev)과 자막(*.supabase.co) 도메인이
  // 달라 HTML5 track이 Cross-Origin으로 차단되는 문제 수정
  const applySubtitle = useCallback(async (lang: string, subtitles: Record<string, string>) => {
    const video = videoRef.current;
    if (!video) return;

    // 1) 기존에 삽입한 자막 track 전부 제거 (data-framix-sub 표시된 것만)
    const oldTracks = video.querySelectorAll("track[data-framix-sub]");
    oldTracks.forEach((t) => t.remove());

    // 2) lang === "off" 이면 삽입 없이 종료
    if (lang === "off") return;

    // 3) 선택 언어의 VTT URL 확인
    const url = subtitles[lang];
    if (!url) return;

    // [수정 3] FETCH 사전 검증 — track 생성 전 실제 URL 접근 가능 여부 확인
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`subtitle fetch failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("subtitle fetch failed", url, error);
      return;
    }

    // 같은 lang 재선택 도중 다른 언어로 바뀌었으면 중단 (race condition 방지)
    if (videoRef.current !== video) return;

    // 4) <track> 엘리먼트 생성 → video에 삽입
    const trackEl = document.createElement("track");
    trackEl.kind = "subtitles";
    trackEl.src = url;
    trackEl.srclang = lang;
    trackEl.label = SUBTITLE_LANGUAGES.find((l) => l.code === lang)?.label ?? lang;
    trackEl.setAttribute("data-framix-sub", "1");
    // [수정 2] TRACK CORS — 자막 VTT가 영상과 다른 도메인(Supabase)에서 오므로 명시
    // HTMLTrackElement 타입에 crossOrigin 프로퍼티가 없어 setAttribute로 설정
    trackEl.setAttribute("crossorigin", "anonymous");

    // [수정 4] TRACK LOAD DEBUG — 실제 원인 확인용 로그
    trackEl.addEventListener("load", () => {
      console.log("subtitle loaded", url);
    });
    trackEl.addEventListener("error", () => {
      console.error("subtitle load failed", url);
    });

    video.appendChild(trackEl);

    // 5) track 로드 완료 후 mode = "showing"
    //    loadeddata 이전에도 설정하고, 로드 후에도 재확인 (브라우저 호환성)
    const setShowing = () => {
      if (trackEl.track) trackEl.track.mode = "showing";
    };
    setShowing();
    trackEl.addEventListener("load", setShowing, { once: true });

    // [수정 5] TRACK MODE 강제 적용 — video.textTracks 기준으로 재확인
    setTimeout(() => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = tracks[i].language === lang ? "showing" : "hidden";
      }
    }, 500);
  }, []);

  // subtitleLang 변경 → 즉시 적용 + localStorage 저장
  useEffect(() => {
    const subtitles = episode?.subtitles ?? {};
    applySubtitle(subtitleLang, subtitles);
    localStorage.setItem(SUBTITLE_KEY, subtitleLang);
  }, [subtitleLang, episode?.subtitles, applySubtitle]);

  // 에피소드 변경 시 → 저장된 언어로 자막 재적용
  useEffect(() => {
    if (!episode?.id) return;
    const subtitles = episode.subtitles ?? {};
    // video src 변경 후 loadedmetadata 이후에 track 삽입해야 안정적
    const video = videoRef.current;
    if (!video) return;
    const doApply = () => applySubtitle(subtitleLang, subtitles);
    if (video.readyState >= 1) {
      doApply();
    } else {
      video.addEventListener("loadedmetadata", doApply, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id]);

  // ─── 영상 진행 저장 ───────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);

    // localStorage 저장 (초 단위)
    if (episodeId) localStorage.setItem(RESUME_KEY(episodeId), String(v.currentTime));

    // DB 저장 (throttle 5초)
    if (!saveHistoryTimerRef.current && episodeId) {
      saveHistoryTimerRef.current = setTimeout(() => {
        saveHistoryTimerRef.current = null;
        if (videoRef.current && episodeId) {
          saveWatchHistory(episodeId, videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 5000);
    }

    // 자동 다음화: 종료 10초 전
    const remaining = v.duration - v.currentTime;
    if (remaining <= 10 && remaining > 0 && nextEpisode && !showAutoNext) {
      setShowAutoNext(true);
      setAutoNextCountdown(5);
    }
  }, [episodeId, nextEpisode, showAutoNext]);

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

  // ─── 영상 종료 (95% 이상 완료 처리) ─────────────────────────────────────
  const handleVideoEnded = useCallback(async () => {
    if (!id || !episodeId) return;
    try {
      if (saveHistoryTimerRef.current) {
        clearTimeout(saveHistoryTimerRef.current);
        saveHistoryTimerRef.current = null;
      }
      localStorage.removeItem(RESUME_KEY(episodeId));
      // completed=true 저장
      const v = videoRef.current;
      await saveWatchHistory(episodeId, v?.duration ?? 0, v?.duration ?? 1);
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
        e.preventDefault(); revealControls(); setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault(); seek(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault(); seek(10);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault(); handleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault(); setMuted((m) => !m);
      } else if (e.key === "Escape") {
        setShowEpisodePanel(false);
        setShowSubtitlePanel(false);
        if (getFullscreenElement()) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else (document as FullscreenDocument).webkitExitFullscreen?.();
        }
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

  // 모바일 탭 → 컨트롤 표시, 3초 후 자동 숨김
  const handleVideoClick = () => {
    // 패널 열려있으면 패널만 닫기
    if (showEpisodePanel || showSubtitlePanel) {
      setShowEpisodePanel(false);
      setShowSubtitlePanel(false);
      return;
    }
    revealControls();
    setPlaying((p) => !p);
  };

  // ─── 볼륨 슬라이더 ───────────────────────────────────────────────────────
  const scheduleHideVolume = useCallback(() => {
    if (volumeHideTimerRef.current) clearTimeout(volumeHideTimerRef.current);
    volumeHideTimerRef.current = setTimeout(() => setShowVolumeSlider(false), 3000);
  }, []);

  const handleVolumeClick = () => {
    if (!showVolumeSlider) {
      setShowVolumeSlider(true); scheduleHideVolume();
    } else {
      setMuted((m) => !m); scheduleHideVolume();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v); setMuted(v === 0); scheduleHideVolume();
  };

  // ─── 10초 이동 ───────────────────────────────────────────────────────────
  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    revealControls();
  };

  // ─── 다음화 즉시 이동 ────────────────────────────────────────────────────
  const goToNextEpisode = () => {
    if (nextEpisode && id) navigate(`/watch/${id}/${nextEpisode.id}`);
  };

  // ─── 자막 선택 ───────────────────────────────────────────────────────────
  // setSubtitleLang → useEffect → applySubtitleToTracks 순서로 반영됨
  // 추가로 직접 DOM 즉시 적용(React state 반영 전 1프레임 gap 제거)
  const selectSubtitle = (code: string) => {
    setSubtitleLang(code);
    applySubtitle(code, episode?.subtitles ?? {}); // 즉시 DOM 반영
    localStorage.setItem(SUBTITLE_KEY, code);
    setShowSubtitlePanel(false);
  };

  // ─── 패널 토글 (하나만 열리게) ───────────────────────────────────────────
  const toggleEpisodePanel = () => {
    setShowEpisodePanel((v) => !v);
    setShowSubtitlePanel(false);
  };

  const toggleSubtitlePanel = () => {
    setShowSubtitlePanel((v) => !v);
    setShowEpisodePanel(false);
  };

  // ─── cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveHistoryTimerRef.current) clearTimeout(saveHistoryTimerRef.current);
    };
  }, []);

  if (loading) return <div className="text-white p-10">Loading...</div>;
  if (!drama || !episode) return <div className="text-white p-10">Not Found</div>;

  const isLocked = !episode.isFree && !isSubscribed;
  const hasVideo = !!episode.videoUrl && !isLocked;
  const controlsVisible = showControls || isLocked;
  const fadeClass = `transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`;

  // 현재 에피소드에서 사용 가능한 자막 목록
  const availableSubtitles = episode.subtitles ?? {};
  const availableCodes = new Set(Object.keys(availableSubtitles));

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
          crossOrigin="anonymous"
          className="w-full h-full object-cover cursor-pointer"
          autoPlay
          muted={muted}
          onClick={handleVideoClick}
          onDoubleClick={handleFullscreen}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          playsInline
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

      {/* GRADIENT OVERLAY */}
      <div
        className={`absolute inset-0 pointer-events-none ${fadeClass}`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.9) 100%)",
        }}
      />

      {/* ═══ TOP BAR ════════════════════════════════════════════════════════ */}
      <div className={`absolute top-0 left-0 right-0 flex items-center p-4 z-20 ${fadeClass}`}>
        <button onClick={() => navigate(-1)} className="p-1 mr-3">
          <ChevronLeft size={28} />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-sm">{drama.title}</div>
          <div className="text-xs opacity-70">{episode.title}</div>
        </div>
        <button onClick={() => setLiked((p) => !p)} className="p-1">
          <Heart size={22} className={liked ? "text-red-500 fill-red-500" : ""} />
        </button>
      </div>

      {/* ═══ CENTER: 이전화 / 다음화 ════════════════════════════════════════ */}
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

      {/* ═══ BOTTOM CONTROLS ════════════════════════════════════════════════ */}
      {!isLocked && (
        <div className={`absolute bottom-0 left-0 right-0 px-4 pb-4 z-20 ${fadeClass}`}>
          {/* 프로그레스 바 */}
          <div
            className="h-1 bg-white/30 rounded cursor-pointer pointer-events-auto mb-4 group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              setProgress(pct);
              if (videoRef.current?.duration)
                videoRef.current.currentTime = (pct / 100) * videoRef.current.duration;
              if (episodeId && videoRef.current)
                saveWatchHistory(episodeId, videoRef.current.currentTime, videoRef.current.duration);
            }}
          >
            <div
              className="h-full bg-red-600 rounded transition-all relative group-hover:h-1.5"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* 버튼 행 */}
          <div className="flex items-center justify-between pointer-events-auto">
            {/* 좌측 */}
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
                className="flex flex-col items-center gap-0.5 p-1 hover:scale-110 transition-transform"
                aria-label="10초 뒤로"
              >
                <SkipBack size={22} />
                <span className="text-[9px] font-bold leading-none">10</span>
              </button>

              {/* 10초 앞으로 */}
              <button
                onClick={() => seek(10)}
                className="flex flex-col items-center gap-0.5 p-1 hover:scale-110 transition-transform"
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
                <div
                  className={`overflow-hidden transition-all duration-200 ${showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"}`}
                >
                  <input
                    type="range" min={0} max={1} step={0.05}
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

            {/* 우측 */}
            <div className="flex items-center gap-3">
              {/* 자막 */}
              <button
                onClick={toggleSubtitlePanel}
                className={`p-1 hover:scale-110 transition-transform ${showSubtitlePanel ? "text-yellow-400" : ""}`}
                aria-label="자막"
              >
                <Subtitles size={22} />
              </button>

              {/* 에피소드 목록 */}
              <button
                onClick={toggleEpisodePanel}
                className={`p-1 hover:scale-110 transition-transform ${showEpisodePanel ? "text-yellow-400" : ""}`}
                aria-label="에피소드 목록"
              >
                <List size={22} />
              </button>

              {/* 다음화 */}
              {nextEpisode && (
                <button
                  onClick={goToNextEpisode}
                  className="flex items-center gap-1 p-1 hover:scale-110 transition-transform"
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

      {/* ═══ 에피소드 패널 (우측) ═══════════════════════════════════════════ */}
      {showEpisodePanel && (
        <div className="absolute inset-y-0 right-0 w-80 bg-zinc-900/97 z-40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-bold text-sm">에피소드</span>
            <button onClick={() => setShowEpisodePanel(false)} className="p-1">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 py-2">
            {drama.episodes.map((ep, idx) => {
              const isCurrentEp = ep.id === episodeId;
              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    setShowEpisodePanel(false);
                    if (!isCurrentEp && id) navigate(`/watch/${id}/${ep.id}`);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left ${
                    isCurrentEp ? "bg-white/10" : ""
                  }`}
                >
                  {/* 썸네일 */}
                  <div className="relative flex-shrink-0 w-24 h-14 rounded overflow-hidden bg-zinc-800">
                    <img
                      src={ep.thumbnail}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${ep.id}/400/225`; }}
                    />
                    {isCurrentEp && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                          <Play size={12} className="ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-bold ${isCurrentEp ? "text-red-400" : "text-white/50"}`}>
                        {idx + 1}화
                      </span>
                      {isCurrentEp && (
                        <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-semibold">
                          재생 중
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold leading-tight truncate ${isCurrentEp ? "text-white" : "text-white/80"}`}>
                      {ep.title}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{ep.duration}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 자막 패널 (우측) ═══════════════════════════════════════════════ */}
      {showSubtitlePanel && (
        <div className="absolute inset-y-0 right-0 w-72 bg-zinc-900/97 z-40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-bold text-sm">자막</span>
            <button onClick={() => setShowSubtitlePanel(false)} className="p-1">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 py-2">
            {SUBTITLE_LANGUAGES.map((lang) => {
              const isOff = lang.code === "off";
              const isAvailable = isOff || availableCodes.has(lang.code);
              const isSelected = subtitleLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => isAvailable && selectSubtitle(lang.code)}
                  disabled={!isAvailable}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${
                    isSelected
                      ? "text-yellow-400 bg-white/5"
                      : isAvailable
                      ? "text-white hover:bg-white/10"
                      : "text-white/25 cursor-not-allowed"
                  }`}
                >
                  <span>{lang.label}</span>
                  {isSelected && <Check size={16} className="flex-shrink-0" />}
                  {!isOff && !isAvailable && (
                    <span className="text-[10px] text-white/30">미지원</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LOCK OVERLAY ═══════════════════════════════════════════════════ */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center space-y-3">
            <Lock size={40} className="mx-auto text-yellow-400" />
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

      {/* ═══ 자동 다음화 오버레이 ═══════════════════════════════════════════ */}
      {showAutoNext && nextEpisode && (
        <div className="absolute bottom-20 right-4 z-30">
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
