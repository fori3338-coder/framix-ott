import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Pause,
  Heart,
  VolumeX, Volume2, Lock, Maximize, Minimize,
  SkipBack, SkipForward,
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
  { code: "off",   label: "자막 끄기" },
  { code: "ko",    label: "한국어 (CC)" },
  { code: "en",    label: "English" },
  { code: "en_cc", label: "English (CC)" },
  { code: "ja",    label: "日本語" },
  { code: "zh_cn", label: "中文 (简体)" },
  { code: "zh_tw", label: "中文 (繁體)" },
  { code: "es",    label: "Español" },
  { code: "fr",    label: "Français" },
  { code: "de",    label: "Deutsch" },
  { code: "it",    label: "Italiano" },
  { code: "pt",    label: "Português (Brasil)" },
  { code: "ru",    label: "Русский" },
  { code: "ar",    label: "العربية" },
  { code: "th",    label: "ภาษาไทย" },
  { code: "vi",    label: "Tiếng Việt" },
  { code: "id",    label: "Bahasa Indonesia" },
  { code: "ms",    label: "Bahasa Melayu" },
  { code: "tr",    label: "Türkçe" },
  { code: "nl",    label: "Nederlands" },
  { code: "no",    label: "Norsk" },
  { code: "hi",    label: "हिन्दी" },
  { code: "bn",    label: "বাংলা" },
  { code: "ta",    label: "தமிழ்" },
  { code: "te",    label: "తెలుగు" },
];

// ─── Custom Subtitle Engine ──────────────────────────────────────────────────
interface SubCue {
  start: number;
  end: number;
  text: string;
}

/** "HH:MM:SS.mmm" or "MM:SS.mmm" → seconds */
function vttTimeToSeconds(t: string): number {
  const parts = t.trim().split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
}

/** VTT 텍스트 → SubCue[] */
function parseVTT(text: string): SubCue[] {
  const cues: SubCue[] = [];
  // \r\n 정규화
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    // 타임스탬프 라인 찾기 (-->)
    const tsIdx = lines.findIndex((l) => l.includes("-->"));
    if (tsIdx < 0) continue;
    const tsParts = lines[tsIdx].split("-->");
    if (tsParts.length < 2) continue;
    const start = vttTimeToSeconds(tsParts[0]);
    // end는 position 태그 앞까지만
    const endStr = tsParts[1].split(" ")[0].split("\t")[0];
    const end = vttTimeToSeconds(endStr);
    // 나머지 라인이 자막 텍스트
    const textLines = lines.slice(tsIdx + 1);
    if (textLines.length === 0) continue;
    // VTT 태그 제거 (<b>, <i>, <c.xxx>, <00:00:00.000>)
    const raw = textLines.join("\n").replace(/<[^>]*>/g, "").trim();
    if (!raw) continue;
    cues.push({ start, end, text: raw });
  }
  return cues;
}

// ─── Fullscreen 타입 확장 ────────────────────────────────────────────────────
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

// ─── watch_history 저장 ──────────────────────────────────────────────────────
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
  const seekAppliedRef = useRef(false);

  // ─── Custom Subtitle Engine 상태 ────────────────────────────────────────
  const subtitleCuesRef = useRef<SubCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(5);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState<string>(() =>
    localStorage.getItem(SUBTITLE_KEY) ?? "off"
  );

  const currentIndex = drama?.episodes.findIndex((e) => e.id === episodeId) ?? -1;

  const nextEpisode =
    currentIndex >= 0 && drama?.episodes[currentIndex + 1]
      ? drama.episodes[currentIndex + 1]
      : null;

  // ─── 자동 이어보기 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!episodeId) return;
    seekAppliedRef.current = false;

    async function applyResume() {
      const hist = await loadWatchHistory(episodeId!);
      if (hist) {
        if (hist.completed) { seekAppliedRef.current = true; return; }
        if (hist.progressSeconds > 5) {
          const applySeek = () => {
            if (seekAppliedRef.current) return;
            seekAppliedRef.current = true;
            if (videoRef.current) videoRef.current.currentTime = hist.progressSeconds;
          };
          if (videoRef.current && videoRef.current.readyState >= 1) applySeek();
          else videoRef.current?.addEventListener("loadedmetadata", applySeek, { once: true });
          return;
        }
      }
      const saved = localStorage.getItem(RESUME_KEY(episodeId!));
      if (saved) {
        const t = parseFloat(saved);
        if (t > 5) {
          const applySeek = () => {
            if (seekAppliedRef.current) return;
            seekAppliedRef.current = true;
            if (videoRef.current) videoRef.current.currentTime = t;
          };
          if (videoRef.current && videoRef.current.readyState >= 1) applySeek();
          else videoRef.current?.addEventListener("loadedmetadata", applySeek, { once: true });
        }
      }
    }
    applyResume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId]);

  // ─── Custom Subtitle Engine: VTT 로드 & 파싱 ────────────────────────────
  const loadSubtitle = useCallback(async (lang: string, subtitles: Record<string, string>) => {
    subtitleCuesRef.current = [];
    setCurrentSubtitle("");

    if (lang === "off") return;
    const url = subtitles[lang];
    if (!url) return;

    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const cues = parseVTT(text);
      subtitleCuesRef.current = cues;
      console.log(`[Subtitle] ${lang} 로드 완료 — ${cues.length} cues`);
    } catch (err) {
      console.error("[Subtitle] VTT 로드 실패:", url, err);
    }
  }, []);

  // subtitleLang 변경 시 로드
  useEffect(() => {
    const subtitles = episode?.subtitles ?? {};
    loadSubtitle(subtitleLang, subtitles);
    localStorage.setItem(SUBTITLE_KEY, subtitleLang);
  }, [subtitleLang, episode?.subtitles, loadSubtitle]);

  // 에피소드 변경 시 재로드
  useEffect(() => {
    if (!episode?.id) return;
    const subtitles = episode.subtitles ?? {};
    loadSubtitle(subtitleLang, subtitles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id]);

  // ─── 영상 진행 저장 + 자막 실시간 탐색 ──────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);

    if (episodeId) localStorage.setItem(RESUME_KEY(episodeId), String(v.currentTime));

    if (!saveHistoryTimerRef.current && episodeId) {
      saveHistoryTimerRef.current = setTimeout(() => {
        saveHistoryTimerRef.current = null;
        if (videoRef.current && episodeId) {
          saveWatchHistory(episodeId, videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 5000);
    }

    // 자동 다음화
    const remaining = v.duration - v.currentTime;
    if (remaining <= 10 && remaining > 0 && nextEpisode && !showAutoNext) {
      setShowAutoNext(true);
      setAutoNextCountdown(5);
    }

    // ─── 자막 오버레이: currentTime 기준 cue 탐색 ───────────────────────
    const ct = v.currentTime;
    const cues = subtitleCuesRef.current;
    if (cues.length === 0) {
      setCurrentSubtitle("");
      return;
    }
    // 이진탐색으로 현재 시간에 해당하는 cue 찾기
    let lo = 0, hi = cues.length - 1, found = "";
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const cue = cues[mid];
      if (ct >= cue.start && ct < cue.end) { found = cue.text; break; }
      else if (ct < cue.start) hi = mid - 1;
      else lo = mid + 1;
    }
    setCurrentSubtitle(found);
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

  // ─── 영상 종료 ───────────────────────────────────────────────────────────
  const handleVideoEnded = useCallback(async () => {
    if (!id || !episodeId) return;
    try {
      if (saveHistoryTimerRef.current) {
        clearTimeout(saveHistoryTimerRef.current);
        saveHistoryTimerRef.current = null;
      }
      localStorage.removeItem(RESUME_KEY(episodeId));
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

  const handleVideoClick = () => {
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

  const goToNextEpisode = () => {
    if (nextEpisode && id) navigate(`/watch/${id}/${nextEpisode.id}`);
  };

  // ─── 자막 선택 ───────────────────────────────────────────────────────────
  const selectSubtitle = (code: string) => {
    setSubtitleLang(code);
    localStorage.setItem(SUBTITLE_KEY, code);
    setShowSubtitlePanel(false);
  };

  // ─── 패널 토글 ───────────────────────────────────────────────────────────
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

  const availableSubtitles = episode.subtitles ?? {};
  const availableCodes = new Set(Object.keys(availableSubtitles));

  return (
    <div
      ref={videoContainerRef}
      className="fixed inset-0 bg-black text-white select-none"
      style={{ zIndex: 30 }}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
    >
      {/* VIDEO — native track 없음 */}
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

      {/* ═══ CUSTOM SUBTITLE OVERLAY ════════════════════════════════════════ */}
      {currentSubtitle && (
        <div
          className="framix-subtitle"
          style={{
            position: "absolute",
            bottom: "120px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            maxWidth: "80%",
            textAlign: "center",
            whiteSpace: "pre-wrap",
            fontSize: "24px",
            fontWeight: 700,
            lineHeight: 1.5,
            color: "white",
            textShadow:
              "0 0 6px rgba(0,0,0,.9), 0 0 12px rgba(0,0,0,.9)",
            pointerEvents: "none",
          }}
        >
          {currentSubtitle}
        </div>
      )}

      {/* GRADIENT OVERLAY */}
      <div
        className={`absolute inset-0 pointer-events-none ${fadeClass}`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.9) 100%)",
        }}
      />

      {/* ═══ TOP BAR — Netflix 스타일 좌측 상단 제목 (뒤로가기 제거) ══════ */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20 ${fadeClass}`}>
        <div className="flex flex-col">
          <div className="font-bold text-sm leading-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,.9)" }}>
            {drama.title}
          </div>
          <div className="text-xs opacity-70" style={{ textShadow: "0 1px 4px rgba(0,0,0,.9)" }}>
            {episode.title}
          </div>
        </div>
        <button onClick={() => setLiked((p) => !p)} className="p-1 shrink-0">
          <Heart size={22} className={liked ? "text-red-500 fill-red-500" : ""} />
        </button>
      </div>

      {/* ═══ CENTER: 이전화 / 다음화 — 제거됨 ══════════════════════════════ */}

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
              <button
                onClick={() => { revealControls(); setPlaying((p) => !p); }}
                className="p-1.5 hover:scale-110 transition-transform"
                aria-label={playing ? "일시정지" : "재생"}
              >
                {playing ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button
                onClick={() => seek(-10)}
                className="flex flex-col items-center gap-0.5 p-1 hover:scale-110 transition-transform"
                aria-label="10초 뒤로"
              >
                <SkipBack size={22} />
                <span className="text-[9px] font-bold leading-none">10</span>
              </button>
              <button
                onClick={() => seek(10)}
                className="flex flex-col items-center gap-0.5 p-1 hover:scale-110 transition-transform"
                aria-label="10초 앞으로"
              >
                <SkipForward size={22} />
                <span className="text-[9px] font-bold leading-none">10</span>
              </button>
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
              <button
                onClick={toggleSubtitlePanel}
                className={`p-1 hover:scale-110 transition-transform ${showSubtitlePanel ? "text-yellow-400" : ""}`}
                aria-label="자막"
              >
                <Subtitles size={22} />
              </button>
              <button
                onClick={toggleEpisodePanel}
                className={`p-1 hover:scale-110 transition-transform ${showEpisodePanel ? "text-yellow-400" : ""}`}
                aria-label="에피소드 목록"
              >
                <List size={22} />
              </button>
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
        <div className="absolute inset-y-0 right-0 w-80 bg-zinc-900/97 z-[35] flex flex-col">
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
        <div className="absolute inset-y-0 right-0 w-72 bg-zinc-900/97 z-[35] flex flex-col">
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
