import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Pause,
  Heart,
  VolumeX, Volume2, Maximize, Minimize,
  SkipBack, SkipForward,
  SkipForward as NextEpisodeIcon,
  List, Subtitles, Check, X,
  ArrowLeft,
} from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { useSubscription } from "../hooks/useSubscription";
import { useFavorites } from "../hooks/useFavorites";
import { supabase } from "../lib/supabase";
import { recordEpisodeView } from "../lib/viewTracking";

const CONTROLS_HIDE_DELAY_MS = 3000;
const RESUME_KEY = (id: string) => `framix_resume_${id}`;
const SUBTITLE_KEY = "framix_subtitle_lang";
const SUBTITLE_ENABLED_KEY = "framix_subtitle_enabled";
const SUBTITLE_SIZE_KEY = "framix_subtitle_size";
const SUBTITLE_POSITION_KEY = "framix_subtitle_position";
const SUBTITLE_STYLE_KEY = "framix_subtitle_style";

type SubtitleSize = "small" | "medium" | "large";
type SubtitlePosition = "bottom" | "center";
type SubtitleStyleMode = "default" | "large_text" | "high_contrast";

// ─── 자막 크기 옵션 (모바일 / 태블릿 / 데스크톱 font-size) ───────────────────
const SUBTITLE_SIZE_OPTIONS: { value: SubtitleSize; label: string; className: string }[] = [
  { value: "small", label: "작게", className: "text-[14px] sm:text-[16px] lg:text-[18px]" },
  { value: "medium", label: "보통", className: "text-[18px] sm:text-[20px] lg:text-[24px]" },
  { value: "large", label: "크게", className: "text-[22px] sm:text-[26px] lg:text-[30px]" },
];

// ─── 자막 위치 옵션 ──────────────────────────────────────────────────────
const SUBTITLE_POSITION_OPTIONS: { value: SubtitlePosition; label: string }[] = [
  { value: "bottom", label: "하단" },
  { value: "center", label: "중앙" },
];

// ─── 접근성 자막 스타일 프리셋 (Netflix / Disney+ / Prime Video 수준) ────────
const SUBTITLE_STYLE_OPTIONS: { value: SubtitleStyleMode; label: string; sublabel: string }[] = [
  { value: "default", label: "기본", sublabel: "Default" },
  { value: "large_text", label: "큰 글씨", sublabel: "Large Text" },
  { value: "high_contrast", label: "고대비", sublabel: "High Contrast" },
];

// large_text 스타일 적용 시 사용하는 font-size (기존 SUBTITLE_SIZE_OPTIONS 대비 20% 증가)
const SUBTITLE_SIZE_CLASSNAME_LARGE_TEXT: Record<SubtitleSize, string> = {
  small: "text-[17px] sm:text-[19px] lg:text-[22px]",
  medium: "text-[22px] sm:text-[24px] lg:text-[29px]",
  large: "text-[26px] sm:text-[31px] lg:text-[36px]",
};

// ─── 지원 자막 언어 목록 ─────────────────────────────────────────────────────
const SUBTITLE_LANGUAGES = [
  { code: "off", label: "자막 끄기" },
  { code: "ko",  label: "한국어 (CC)" },
  { code: "en",  label: "English (CC)" },
  { code: "ja",  label: "日本語 (CC)" },
  { code: "zh",  label: "中文 (CC)" },
  { code: "es",  label: "Español (CC)" },
  { code: "fr",  label: "Français (CC)" },
  { code: "de",  label: "Deutsch (CC)" },
  { code: "it",  label: "Italiano (CC)" },
  { code: "pt",  label: "Português (CC)" },
  { code: "ru",  label: "Русский (CC)" },
  { code: "ar",  label: "العربية (CC)" },
  { code: "th",  label: "ภาษาไทย (CC)" },
  { code: "vi",  label: "Tiếng Việt (CC)" },
  { code: "id",  label: "Bahasa Indonesia (CC)" },
  { code: "ms",  label: "Bahasa Melayu (CC)" },
  { code: "tr",  label: "Türkçe (CC)" },
  { code: "nl",  label: "Nederlands (CC)" },
  { code: "no",  label: "Norsk (CC)" },
  { code: "hi",  label: "हिन्दी (CC)" },
  { code: "bn",  label: "বাংলা (CC)" },
  { code: "ta",  label: "தமிழ் (CC)" },
  { code: "te",  label: "తెలుగు (CC)" },
];

// 실제 DB의 subtitles 키가 SUBTITLE_LANGUAGES.code와 다른 표기로 저장된 경우를 위한 별칭 매핑
// (예: 중국어가 "zh" 대신 "zh_cn" / "zh-cn" / "zh_tw" 등으로 저장된 경우에도 자동 인식)
const SUBTITLE_CODE_ALIASES: Record<string, string[]> = {
  zh: ["zh", "zh_cn", "zh-cn", "zh_tw", "zh-tw", "zh_hans", "zh_hant"],
  en: ["en", "en_cc", "en-us", "en_us"],
  pt: ["pt", "pt_br", "pt-br"],
};

// episode.subtitles(실제 보유 자막 목록)에서 해당 언어 코드에 대응하는 실제 키를 찾는다.
function resolveSubtitleKey(code: string, subtitles: Record<string, string>): string | undefined {
  const candidates = SUBTITLE_CODE_ALIASES[code] ?? [code];
  return candidates.find((c) => !!subtitles[c]);
}

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
    const completed = progressPercent >= 90;
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

// ─── 전환(Conversion) 최적화 멤버십/코인 잠금 오버레이 ──────────────────────
// ReelShort / DramaBox / ShortMax 스타일: 배지 → 헤드라인 → 혜택 → 주 CTA(멤버십) → 보조 CTA(코인) → 하단 보류
const MEMBERSHIP_BENEFITS = [
  "광고 없이 시청",
  "전체 에피소드 이용",
  "신규 콘텐츠 우선 공개",
];

function MembershipConversionOverlay({
  headline,
  dismissLabel,
  onStartMembership,
  onWatchWithCoin,
  onDismiss,
}: {
  headline: [string, string];
  dismissLabel: string;
  onStartMembership: () => void;
  onWatchWithCoin: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="relative w-[300px] max-w-[88vw] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-zinc-900 to-black border border-yellow-400/20">
      <button
        onClick={onDismiss}
        aria-label="닫기"
        className="absolute top-3 right-3 z-10 p-1.5 text-white/50 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>

      <div className="px-6 pt-7 pb-6 text-center space-y-5">
        {/* ─── 상단: 잠긴 에피소드 배지 ─────────────────────────────── */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30">
          <span className="text-sm leading-none">🔒</span>
          <span className="text-xs font-bold text-yellow-400 tracking-wide">잠긴 에피소드</span>
        </div>

        {/* ─── 중앙: 헤드라인 ───────────────────────────────────────── */}
        <p className="text-lg font-extrabold leading-snug">
          {headline[0]}
          <br />
          {headline[1]}
        </p>

        {/* ─── 혜택 표시 ────────────────────────────────────────────── */}
        <ul className="text-left bg-white/5 rounded-xl px-4 py-3 space-y-2">
          {MEMBERSHIP_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-white/90">
              <Check size={16} className="text-yellow-400 flex-shrink-0" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {/* ─── 버튼: 주 CTA(멤버십) + 보조 CTA(코인) ───────────────────── */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onStartMembership}
            className="w-full px-4 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-extrabold text-sm shadow-lg shadow-yellow-500/20 hover:brightness-110 transition-all"
          >
            멤버십 시작하기
          </button>
          <button
            onClick={onWatchWithCoin}
            className="w-full px-4 py-2.5 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            코인으로 보기
          </button>
        </div>

        {/* ─── 하단: 보류 ───────────────────────────────────────────── */}
        <button
          onClick={onDismiss}
          className="text-xs text-white/40 hover:text-white/70 transition-colors pt-1"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}

// ─── 시간 포맷 (mm:ss / hh:mm:ss) ──────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function Player() {
  const { id, episodeId } = useParams();
  const navigate = useNavigate();

  const { drama, loading } = useDramaDetail(id);
  const episode = drama?.episodes.find((e) => e.id === episodeId);
  const { isActive: isSubscribed } = useSubscription();
  const { isFavorite, toggleFavorite } = useFavorites();

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekAppliedRef = useRef(false);
  // 조회수 중복 기록 방지: 에피소드별로 "재생 시작" 시 1회만 recordEpisodeView 호출
  // (실제 중복/시간창 판정은 DB record_episode_view RPC의 viewer_id+30분 dedupe가 담당,
  //  이 ref는 같은 컴포넌트 생명주기 내에서 동일 에피소드에 대해 매 timeupdate마다
  //  반복 호출하지 않도록 막는 클라이언트 측 가드일 뿐)
  const viewRecordedEpisodeRef = useRef<string | null>(null);

  // ─── Custom Subtitle Engine 상태 ────────────────────────────────────────
  const subtitleCuesRef = useRef<SubCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverTooltip, setHoverTooltip] = useState<{ visible: boolean; x: number; time: number; thumb: string | null }>({ visible: false, x: 0, time: 0, thumb: null });
  // ─── Thumbnail Preview (Offscreen Video + Canvas) ────────────────────────
  const thumbVideoRef = useRef<HTMLVideoElement | null>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const thumbCacheRef = useRef<Map<number, string>>(new Map());
  const thumbRafRef = useRef<number | null>(null);
  const thumbSrcRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(5);
  const [dismissedNextLock, setDismissedNextLock] = useState(false);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [subtitleNotice, setSubtitleNotice] = useState<string>("");
  const [resumeToast, setResumeToast] = useState<string>("");
  const [subtitleLang, setSubtitleLang] = useState<string>(() =>
    localStorage.getItem(SUBTITLE_KEY) ?? "off"
  );
  const [subtitleEnabled, setSubtitleEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(SUBTITLE_ENABLED_KEY);
    return saved === null ? true : saved === "true";
  });
  const [subtitleSize, setSubtitleSize] = useState<SubtitleSize>(() => {
    const saved = localStorage.getItem(SUBTITLE_SIZE_KEY) as SubtitleSize | null;
    return saved === "small" || saved === "medium" || saved === "large" ? saved : "medium";
  });
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitlePosition>(() => {
    const saved = localStorage.getItem(SUBTITLE_POSITION_KEY) as SubtitlePosition | null;
    return saved === "bottom" || saved === "center" ? saved : "bottom";
  });
  const [subtitleStyleMode, setSubtitleStyleMode] = useState<SubtitleStyleMode>(() => {
    const saved = localStorage.getItem(SUBTITLE_STYLE_KEY) as SubtitleStyleMode | null;
    return saved === "default" || saved === "large_text" || saved === "high_contrast" ? saved : "default";
  });

  const currentIndex = drama?.episodes.findIndex((e) => e.id === episodeId) ?? -1;

  const nextEpisode =
    currentIndex >= 0 && drama?.episodes[currentIndex + 1]
      ? drama.episodes[currentIndex + 1]
      : null;

  // ─── 다음화 잠금 안내 닫기 상태 초기화 (에피소드 변경 시) ──────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedNextLock(false);
  }, [episodeId]);

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
            if (videoRef.current) {
              videoRef.current.currentTime = hist.progressSeconds;
              setResumeToast(`${formatTime(hist.progressSeconds)}부터 이어보기`);
            }
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
            if (videoRef.current) {
              videoRef.current.currentTime = t;
              setResumeToast(`${formatTime(t)}부터 이어보기`);
            }
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

    if (lang === "off") {
      setSubtitleNotice("");
      return;
    }

    const resolvedKey = resolveSubtitleKey(lang, subtitles);
    const url = resolvedKey ? subtitles[resolvedKey] : undefined;
    if (!url) {
      setSubtitleNotice("선택한 언어의 자막이 없습니다");
      return;
    }

    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const cues = parseVTT(text);
      subtitleCuesRef.current = cues;
      setSubtitleNotice("");
      console.log(`[Subtitle] ${lang} 로드 완료 — ${cues.length} cues`);
    } catch (err) {
      console.error("[Subtitle] VTT 로드 실패:", url, err);
      setSubtitleNotice("선택한 언어의 자막이 없습니다");
    }
  }, []);

  // subtitleLang 변경 시 로드
  useEffect(() => {
    const subtitles = episode?.subtitles ?? {};
    loadSubtitle(subtitleLang, subtitles);
    localStorage.setItem(SUBTITLE_KEY, subtitleLang);
  }, [subtitleLang, episode?.subtitles, loadSubtitle]);

  // "선택한 언어의 자막이 없습니다" 안내 자동 숨김 (2.5초)
  useEffect(() => {
    if (!subtitleNotice) return;
    const t = setTimeout(() => setSubtitleNotice(""), 2500);
    return () => clearTimeout(t);
  }, [subtitleNotice]);

  // 이어보기 토스트 자동 숨김 (3초)
  useEffect(() => {
    if (!resumeToast) return;
    const t = setTimeout(() => setResumeToast(""), 3000);
    return () => clearTimeout(t);
  }, [resumeToast]);

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
    setCurrentTime(v.currentTime);
    setDuration(v.duration);

    if (episodeId) localStorage.setItem(RESUME_KEY(episodeId), String(v.currentTime));

    // ─── 조회수 기록: 실제 재생이 시작된 시점(timeupdate 최초 발생)에 1회 호출 ───
    // 기존에는 record_episode_view RPC를 호출하는 recordEpisodeView()가 정의만
    // 되어 있고 어디에서도 호출되지 않아, 시청 시간과 무관하게 조회수가 전혀
    // 반영되지 않았음. 여기서 실제로 연결한다. (DB 측 30분 dedupe는
    // record_episode_view RPC 내부에서 처리되므로 클라이언트는 단순 1회 호출.)
    if (episodeId && id && viewRecordedEpisodeRef.current !== episodeId) {
      viewRecordedEpisodeRef.current = episodeId;
      recordEpisodeView(episodeId, id);
    }

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
    const nextLocked = !!nextEpisode && !nextEpisode.isFree && !isSubscribed;
    if (nextLocked) return; // 다음화 잠금 시 카운트다운/자동이동 중단
    if (autoNextCountdown <= 0) {
      if (nextEpisode && id) navigate(`/watch/${id}/${nextEpisode.id}`);
      return;
    }
    const t = setTimeout(() => setAutoNextCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showAutoNext, autoNextCountdown, nextEpisode, isSubscribed, id, navigate]);

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

      if (nextEpisode) {
        // 카운트다운이 아직 시작되지 않은 경우(짧은 영상 등) 대비 안전장치
        setShowAutoNext(true);
        setAutoNextCountdown((c) => (c > 0 ? c : 5));
      } else {
        // 다음화 없음 → 시리즈 상세 페이지로 이동
        navigate(`/drama/${id}`);
      }
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

  // ─── 자막 ON/OFF ─────────────────────────────────────────────────────────
  const toggleSubtitleEnabled = () => {
    setSubtitleEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SUBTITLE_ENABLED_KEY, String(next));
      return next;
    });
  };

  // ─── 자막 크기 ───────────────────────────────────────────────────────────
  const changeSubtitleSize = (size: SubtitleSize) => {
    setSubtitleSize(size);
    localStorage.setItem(SUBTITLE_SIZE_KEY, size);
  };

  // ─── 자막 위치 ───────────────────────────────────────────────────────────
  const changeSubtitlePosition = (position: SubtitlePosition) => {
    setSubtitlePosition(position);
    localStorage.setItem(SUBTITLE_POSITION_KEY, position);
  };

  // ─── 자막 스타일 (접근성 프리셋: 기본 / 큰 글씨 / 고대비) ──────────────────
  const changeSubtitleStyleMode = (mode: SubtitleStyleMode) => {
    setSubtitleStyleMode(mode);
    localStorage.setItem(SUBTITLE_STYLE_KEY, mode);
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

  // ─── Thumbnail Preview: Offscreen Video + Canvas 초기화 ──────────────────
  useEffect(() => {
    const src = episode?.videoUrl;
    if (!src) return;
    if (thumbSrcRef.current === src) return;
    thumbSrcRef.current = src;
    // 캐시 초기화
    thumbCacheRef.current.clear();

    // Offscreen video element 생성
    const tv = document.createElement("video");
    tv.src = src;
    tv.crossOrigin = "anonymous";
    tv.preload = "metadata";
    tv.muted = true;
    tv.playsInline = true;
    thumbVideoRef.current = tv;

    // Offscreen canvas 생성 (160×90, 16:9)
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    thumbCanvasRef.current = canvas;

    return () => {
      tv.src = "";
      thumbVideoRef.current = null;
      thumbCacheRef.current.clear();
      if (thumbRafRef.current) cancelAnimationFrame(thumbRafRef.current);
    };
  }, [episode?.videoUrl]);

  // ─── 썸네일 추출 함수 (캐시 + rAF) ──────────────────────────────────────
  const extractThumb = useCallback((time: number, x: number) => {
    // bucket: 2초 단위로 캐시
    const bucket = Math.floor(time / 2) * 2;
    const cached = thumbCacheRef.current.get(bucket);
    if (cached) {
      setHoverTooltip({ visible: true, x, time, thumb: cached });
      return;
    }
    const tv = thumbVideoRef.current;
    const canvas = thumbCanvasRef.current;
    if (!tv || !canvas) {
      setHoverTooltip({ visible: true, x, time, thumb: null });
      return;
    }
    if (thumbRafRef.current) cancelAnimationFrame(thumbRafRef.current);

    const doSeekAndCapture = () => {
      tv.currentTime = bucket;
    };

    const onSeeked = () => {
      thumbRafRef.current = requestAnimationFrame(() => {
        try {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(tv, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          // 빈 캔버스 체크 (drawImage 실패 시 검은 이미지)
          if (dataUrl && dataUrl.length > 5000) {
            thumbCacheRef.current.set(bucket, dataUrl);
            setHoverTooltip((prev) =>
              prev.visible ? { ...prev, time: tv.currentTime || time, thumb: dataUrl } : prev
            );
          }
        } catch {
          // crossOrigin 오류 등 — thumb null 유지
        }
        tv.removeEventListener("seeked", onSeeked);
      });
    };

    tv.addEventListener("seeked", onSeeked, { once: true });
    doSeekAndCapture();
  }, []);

  if (loading) return <div className="text-white p-10">Loading...</div>;
  if (!drama || !episode) return <div className="text-white p-10">Not Found</div>;

  const isLocked = !episode.isFree && !isSubscribed;
  const hasVideo = !!episode.videoUrl && !isLocked;
  const controlsVisible = showControls || isLocked;
  const fadeClass = `transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`;
  const nextEpisodeLocked = !!nextEpisode && !nextEpisode.isFree && !isSubscribed;

  const availableSubtitles = episode.subtitles ?? {};
  const availableCodes = new Set(
    SUBTITLE_LANGUAGES.filter((l) => l.code !== "off" && resolveSubtitleKey(l.code, availableSubtitles)).map(
      (l) => l.code
    )
  );
  const currentSubtitleLabel =
    subtitleLang === "off"
      ? "자막 꺼짐"
      : SUBTITLE_LANGUAGES.find((l) => l.code === subtitleLang)?.label ?? "자막 꺼짐";

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
          className="w-full h-full object-contain cursor-pointer bg-black"
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
      {subtitleEnabled && currentSubtitle && (
        <div
          className={`framix-subtitle ${
            subtitleStyleMode === "large_text"
              ? SUBTITLE_SIZE_CLASSNAME_LARGE_TEXT[subtitleSize]
              : SUBTITLE_SIZE_OPTIONS.find((s) => s.value === subtitleSize)?.className ?? ""
          }`}
          style={{
            position: "absolute",
            ...(subtitlePosition === "center"
              ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
              : {
                  bottom: "calc(150px + env(safe-area-inset-bottom, 0px))",
                  left: "50%",
                  transform: "translateX(-50%)",
                }),
            zIndex: 9999,
            maxWidth: "85%",
            textAlign: "center",
            whiteSpace: "pre-wrap",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
            fontWeight: 700,
            lineHeight: subtitleStyleMode === "large_text" ? 1.7 : 1.5,
            color: subtitleStyleMode === "high_contrast" ? "#FFFFFF" : "white",
            textShadow:
              subtitleStyleMode === "high_contrast"
                ? "0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,1)"
                : "0 0 6px rgba(0,0,0,.9), 0 0 12px rgba(0,0,0,.9)",
            pointerEvents: "none",
            background: subtitleStyleMode === "high_contrast" ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.55)",
            padding: "10px 16px",
            borderRadius: "12px",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
            overflow: "hidden",
          }}
        >
          {currentSubtitle}
        </div>
      )}

      {/* ═══ 자막 없음 안내 토스트 (기존 자막 오버레이와 별개 요소) ═══════════ */}
      {subtitleNotice && (
        <div
          style={{
            position: "absolute",
            top: "calc(72px + env(safe-area-inset-top, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: "999px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {subtitleNotice}
        </div>
      )}

      {/* ═══ 이어보기 토스트 — 재개 위치 알림 ═══════════════════════════════ */}
      {resumeToast && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(140px + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "#000000",
            border: "1px solid #FFD54A",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 700,
            padding: "8px 18px",
            borderRadius: "999px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          <span style={{ color: "#FFD54A", fontSize: "14px" }}>▶</span>
          {resumeToast}
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

      {/* ═══ TOP BAR — Netflix 스타일 뒤로가기 버튼만 표시 ═══════════════════ */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20 ${fadeClass}`}>
        <button
          onClick={() => {
            if (id && drama) navigate(`/drama/${drama.id}`);
            else navigate("/");
          }}
          aria-label="뒤로가기"
          className="p-1.5 text-white bg-transparent hover:opacity-70 transition-opacity shrink-0"
          style={{ position: "absolute", top: "16px", left: "16px", zIndex: 50 }}
        >
          <ArrowLeft size={26} />
        </button>
        <span />
        <button
          onClick={() => drama && toggleFavorite(drama.id)}
          disabled={!drama}
          aria-label={drama && isFavorite(drama.id) ? "찜 해제" : "찜하기"}
          className="p-1 shrink-0"
        >
          <Heart size={22} className={drama && isFavorite(drama.id) ? "text-red-500 fill-red-500" : ""} />
        </button>
      </div>

      {/* ═══ CENTER: 이전화 / 다음화 — 제거됨 ══════════════════════════════ */}

      {/* ═══ BOTTOM CONTROLS ════════════════════════════════════════════════ */}
      {!isLocked && (
        <div className={`absolute bottom-0 left-0 right-0 px-4 pb-4 z-20 ${fadeClass}`}>
          {/* 시간 표시 */}
          <div className="flex items-center gap-1 mb-2 text-xs font-mono select-none pointer-events-none">
            <span className="text-white font-semibold tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-white/50">/</span>
            <span className="text-white/70 tabular-nums">{formatTime(duration)}</span>
          </div>

          {/* 프로그레스 바 */}
          <div
            className="relative h-1 bg-white/30 rounded cursor-pointer pointer-events-auto mb-4 group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              setProgress(pct);
              if (videoRef.current?.duration)
                videoRef.current.currentTime = (pct / 100) * videoRef.current.duration;
              if (episodeId && videoRef.current)
                saveWatchHistory(episodeId, videoRef.current.currentTime, videoRef.current.duration);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const t = pct * (videoRef.current?.duration ?? 0);
              const xPos = e.clientX - rect.left;
              setHoverTooltip((prev) => ({ ...prev, visible: true, x: xPos, time: t }));
              extractThumb(t, xPos);
            }}
            onMouseLeave={() => setHoverTooltip((prev) => ({ ...prev, visible: false, thumb: null }))}
          >
            {/* Hover Thumbnail Preview */}
            {hoverTooltip.visible && (
              <div
                className="absolute pointer-events-none z-10"
                style={{
                  left: hoverTooltip.x,
                  bottom: "calc(100% + 10px)",
                  transform: "translateX(-50%)",
                }}
              >
                {/* 썸네일 카드 */}
                <div
                  style={{
                    background: "#000000",
                    border: "2px solid #FFD54A",
                    borderRadius: "6px",
                    overflow: "hidden",
                    width: "160px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
                  }}
                >
                  {/* 썸네일 이미지 영역 (160×90) */}
                  <div
                    style={{
                      width: "160px",
                      height: "90px",
                      background: "#111",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {hoverTooltip.thumb ? (
                      <img
                        src={hoverTooltip.thumb}
                        alt=""
                        style={{ width: "160px", height: "90px", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <img
                        src={episode?.thumbnail || drama?.poster || ""}
                        alt=""
                        style={{ width: "160px", height: "90px", objectFit: "cover", display: "block", opacity: 0.5 }}
                      />
                    )}
                  </div>
                  {/* 시간 표시 */}
                  <div
                    style={{
                      background: "#000000",
                      padding: "4px 8px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {formatTime(hoverTooltip.time)}
                    </span>
                  </div>
                </div>
                {/* 말풍선 꼬리 */}
                <div
                  style={{
                    margin: "0 auto",
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "6px solid #FFD54A",
                  }}
                />
              </div>
            )}
            <div
              className="h-full bg-[#FFD54A] rounded transition-all relative group-hover:h-1.5"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* 제목 — 하단 중앙 정렬 (진행바 아래 / 컨트롤 버튼 위) */}
          <div className="flex justify-center px-20 sm:px-24 mb-3 pointer-events-none">
            <span
              className="text-white font-semibold text-center truncate max-w-full text-base sm:text-lg"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,.9)" }}
            >
              {drama.title} {episode.title}
            </span>
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
                className={`p-1 hover:scale-110 transition-transform ${showSubtitlePanel ? "text-gold" : ""}`}
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
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (img.src.endsWith("/content/fallback-thumbnail.svg")) return;
                        img.src = "/content/fallback-thumbnail.svg";
                      }}
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

      {/* ═══ 자막 패널 배경 오버레이 (외부 클릭 시 닫기) ══════════════════════ */}
      {showSubtitlePanel && (
        <div
          className="absolute inset-0 z-[34]"
          onClick={() => setShowSubtitlePanel(false)}
        />
      )}

      {/* ═══ 자막 패널 (우측, Netflix 스타일) ═══════════════════════════════ */}
      <div
        className={`absolute inset-y-0 right-0 w-80 max-w-[320px] bg-zinc-900/90 backdrop-blur-xl z-[35] flex flex-col transform transition-all duration-300 ${
          showSubtitlePanel ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center px-4 py-3 border-b border-white/10">
          <span className="font-bold text-sm">자막</span>
          <button
            onClick={() => setShowSubtitlePanel(false)}
            className="absolute p-1 hover:text-gold transition-colors"
            style={{ top: "16px", right: "16px" }}
            aria-label="자막 패널 닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 py-2">
          {/* ─── 자막 ON/OFF ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white">자막 표시</span>
            <button
              onClick={toggleSubtitleEnabled}
              role="switch"
              aria-checked={subtitleEnabled}
              aria-label="자막 ON/OFF"
              className={`relative w-11 h-6 rounded-full transition-colors ${
                subtitleEnabled ? "bg-gold" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  subtitleEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* ─── 자막 크기 ───────────────────────────────────────────── */}
          <div className="px-4 py-3 border-b border-white/10 space-y-2">
            <span className="text-sm font-semibold text-white">자막 크기</span>
            <div className="flex gap-2">
              {SUBTITLE_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changeSubtitleSize(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subtitleSize === opt.value
                      ? "bg-gold text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── 자막 위치 ───────────────────────────────────────────── */}
          <div className="px-4 py-3 border-b border-white/10 space-y-2">
            <span className="text-sm font-semibold text-white">자막 위치</span>
            <div className="flex gap-2">
              {SUBTITLE_POSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changeSubtitlePosition(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subtitlePosition === opt.value
                      ? "bg-gold text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── 자막 스타일 (접근성 프리셋) ─────────────────────────────── */}
          <div className="px-4 py-3 border-b border-white/10 space-y-2">
            <span className="text-sm font-semibold text-white">자막 스타일</span>
            <div className="flex gap-2">
              {SUBTITLE_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changeSubtitleStyleMode(opt.value)}
                  aria-pressed={subtitleStyleMode === opt.value}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subtitleStyleMode === opt.value
                      ? "bg-gold text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span
                    className={`block text-[9px] font-normal ${
                      subtitleStyleMode === opt.value ? "text-black/60" : "text-white/40"
                    }`}
                  >
                    {opt.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── 자막 언어 ───────────────────────────────────────────── */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-sm font-semibold text-white">자막 언어</span>
          </div>
          <div className="px-4 pb-2">
            <span className="text-[11px] text-white/40">현재 사용 중</span>
            <p className="text-xs text-gold font-semibold">{currentSubtitleLabel}</p>
          </div>
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
                    ? "text-gold bg-white/5"
                    : isAvailable
                    ? "text-white hover:bg-white/10"
                    : "text-white/50 cursor-not-allowed"
                }`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check size={16} className="flex-shrink-0 text-gold" />}
                {!isOff && !isAvailable && (
                  <span className="text-[10px] text-white/30">미지원</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ LOCK OVERLAY ═══════════════════════════════════════════════════ */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <MembershipConversionOverlay
            headline={["이 에피소드를 시청하려면", "멤버십 또는 코인이 필요합니다"]}
            dismissLabel="나중에 보기"
            onStartMembership={() => navigate("/subscription")}
            onWatchWithCoin={() => navigate("/subscription")}
            onDismiss={() => {
              if (id && drama) navigate(`/drama/${drama.id}`);
              else navigate("/");
            }}
          />
        </div>
      )}

      {/* ═══ 다음화 미리보기 카드 (다음화 잠금 해제 상태일 때만) ═════════════ */}
      {showAutoNext && nextEpisode && !nextEpisodeLocked && (
        <div className="absolute bottom-20 right-4 z-30">
          <div className="bg-zinc-900/95 border border-white/10 rounded-xl overflow-hidden w-[240px] shadow-2xl">
            {/* 썸네일 (16:9, 없으면 드라마 세로 포스터로 대체) */}
            <div className="relative w-full aspect-video bg-zinc-800">
              <img
                src={nextEpisode.thumbnail || drama?.poster}
                alt={nextEpisode.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute top-2 right-2 tabular-nums text-xl font-extrabold text-yellow-400 leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {autoNextCountdown}
              </span>
              <p className="absolute bottom-2 left-2.5 right-2.5 text-xs text-white/70 font-semibold uppercase tracking-wider">
                다음화 자동재생
              </p>
            </div>

            <div className="p-3 space-y-2.5">
              <p className="text-sm font-bold truncate">{nextEpisode.title}</p>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={cancelAutoNext}
                  className="text-xs text-white/60 hover:text-white transition-colors"
                >
                  자동재생 취소
                </button>
                <button
                  onClick={() => id && navigate(`/watch/${id}/${nextEpisode.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400 text-black text-xs font-bold hover:brightness-110 transition-all"
                >
                  지금 보기 ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 다음화 잠금 해제 오버레이 ═══════════════════════════════════════ */}
      {showAutoNext && nextEpisode && nextEpisodeLocked && !dismissedNextLock && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/70"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        >
          <MembershipConversionOverlay
            headline={["다음 화를 시청하려면", "멤버십 또는 코인이 필요합니다"]}
            dismissLabel="나중에 보기"
            onStartMembership={() => navigate("/subscription")}
            onWatchWithCoin={() => navigate("/subscription")}
            onDismiss={() => setDismissedNextLock(true)}
          />
        </div>
      )}
    </div>
  );
}
