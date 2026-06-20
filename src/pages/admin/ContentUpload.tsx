import { useEffect, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, UploadCloud, Plus, Trash2, ImagePlus, CheckCircle2, X, GripVertical,
  Save, Eye, Film, Sparkles, Crown, AlertCircle, Subtitles, ChevronDown, ChevronUp,
  Bot,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadImage, uploadVideo, BUCKET } from "../../lib/storage";
import {
  enqueueSubtitleJob,
  subscribeSubtitleJob,
  type PipelineProgress,
} from "../../lib/subtitlePipeline";
import SubtitlePipelineStatus from "../../components/admin/SubtitlePipelineStatus";

// ─── 지원 자막 언어 목록 ─────────────────────────────────────────────────────
const SUBTITLE_LANGUAGES = [
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

// ─── 에피소드 파이프라인 상태 맵 ─────────────────────────────────────────────
type EpPipelineMap = Record<number, PipelineProgress | null>; // episodeId(draft) → progress

interface EpisodeDraft {
  id: number;
  title: string;
  duration: string;
  isFree: boolean;
  videoFile?: File;
  videoProgress: number;
  thumbnailFile?: File;
  thumbnailPreview?: string;
  subtitles: Record<string, string>; // { ko: "url", en: "url", ... }
  showSubtitlePanel: boolean;
  // 파이프라인 결과로 채워진 자막 URL (자동 생성된 것)
  pipelineSubtitles?: Record<string, string>;
}

const genreOptions = [
  "재벌", "복수", "회귀", "로맨스", "오피스", "쌍둥이", "계약결혼", "운명", "서스펜스", "성장", "가족", "스릴러",
];

const STEPS = ["기본 정보", "이미지 & 장르", "에피소드", "영상 업로드"] as const;

export default function ContentUpload() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [englishTitle, setEnglishTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [ageRating, setAgeRating] = useState("15+");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isOriginal, setIsOriginal] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [backdropPreview, setBackdropPreview] = useState<string | null>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLInputElement>(null);

  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([
    { id: 1, title: "1화", duration: "12:00", isFree: true, videoProgress: 0, subtitles: {}, showSubtitlePanel: false },
  ]);

  const [dragOverMap, setDragOverMap] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // ─── AI 자막 백그라운드 Job 상태 ────────────────────────────────────────
  // API 키는 브라우저에 존재하지 않음 — 모든 키는 Edge Function 환경변수에서만 관리됨.
  const [aiSubtitleEnabled, setAiSubtitleEnabled] = useState(true);
  // episodeDraft.id → PipelineProgress (subtitle_jobs Realtime 구독 결과)
  const [pipelineMap, setPipelineMap] = useState<EpPipelineMap>({});
  // episodeDraft.id → Realtime 구독 해제 함수 (unmount 시 정리)
  const pipelineUnsubscribeRef = useRef<Record<number, () => void>>({});

  useEffect(() => {
    const unsubscribeMap = pipelineUnsubscribeRef.current;
    return () => {
      Object.values(unsubscribeMap).forEach((unsub) => unsub());
    };
  }, []);

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", prevent);
    };
  }, []);

  const completion = (() => {
    let score = 0;
    if (title) score += 20;
    if (synopsis) score += 15;
    if (selectedGenres.length) score += 15;
    if (posterPreview) score += 15;
    if (backdropPreview) score += 10;
    if (episodes.length) score += 10;
    if (episodes.some((e) => e.videoFile)) score += 15;
    return Math.min(100, score);
  })();

  const toggleGenre = (g: string) =>
    setSelectedGenres((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const addEpisode = () =>
    setEpisodes((p) => [
      ...p,
      {
        id: p.length ? p[p.length - 1].id + 1 : 1,
        title: `${p.length + 1}화`,
        duration: "12:00",
        isFree: false,
        videoProgress: 0,
        subtitles: {},
        showSubtitlePanel: false,
      },
    ]);

  const removeEpisode = (id: number) => setEpisodes((p) => p.filter((e) => e.id !== id));
  const updateEpisode = (id: number, patch: Partial<EpisodeDraft>) =>
    setEpisodes((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const updateSubtitleUrl = (episodeId: number, lang: string, url: string) => {
    setEpisodes((p) =>
      p.map((ep) => {
        if (ep.id !== episodeId) return ep;
        const next = { ...ep.subtitles };
        if (url.trim()) next[lang] = url.trim();
        else delete next[lang];
        return { ...ep, subtitles: next };
      })
    );
  };

  const moveEpisode = (id: number, dir: -1 | 1) => {
    setEpisodes((p) => {
      const idx = p.findIndex((e) => e.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= p.length) return p;
      const copy = [...p];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const handleImage = (
    file: File | undefined,
    setFile: (f: File) => void,
    setPreview: (s: string) => void
  ) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleEpisodeVideo = (episodeId: number, file: File | undefined) => {
    if (!file) return;
    updateEpisode(episodeId, { videoFile: file, videoProgress: 0 });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, episodeId: number) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverMap((prev) => ({ ...prev, [episodeId]: true }));
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, episodeId: number) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverMap((prev) => ({ ...prev, [episodeId]: false }));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, episodeId: number) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverMap((prev) => ({ ...prev, [episodeId]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) handleEpisodeVideo(episodeId, file);
  };

  // ─── AI 자막 Job 등록 (브라우저는 INSERT만 수행, 처리는 서버에서) ──────────
  const triggerSubtitlePipeline = async (
    draftId: number,
    dbEpisodeId: string,
    episodeNumber: number,
    videoUrl: string,
    seriesId: string,
  ) => {
    if (!aiSubtitleEnabled) return;

    setPipelineMap((prev) => ({
      ...prev,
      [draftId]: {
        stage: "pending",
        stageLabel: "대기 중 — 작업 등록됨",
        completedLangs: [],
        totalLangs: 31, // ko + 30 target langs
        retryCount: 0,
      },
    }));

    try {
      const { jobId } = await enqueueSubtitleJob({
        seriesId,
        episodeId: dbEpisodeId,
        episodeNumber,
        videoUrl,
      });

      // ── DB 트리거(pg_net) 의존 제거: 업로드 완료 직후 Edge Function 직접 호출 ──
      // app.edge_function_base_url 등 DB 세션 설정 여부와 무관하게
      // 자막 생성이 즉시 시작되도록 클라이언트가 직접 invoke 한다.
      // 실패해도 throw하지 않음 — pending 상태로 남아 추후 재시도 가능.
      supabase.functions
        .invoke('process-subtitle-job', { body: { job_id: jobId } })
        .then(({ error: invokeError }) => {
          if (invokeError) {
            console.error(
              `[ContentUpload] process-subtitle-job 직접 invoke 실패 ep${episodeNumber}:`,
              invokeError,
            );
          } else {
            console.log(`[ContentUpload] process-subtitle-job 직접 invoke 성공 ep${episodeNumber}, jobId:`, jobId);
          }
        })
        .catch((invokeErr) => {
          console.error(
            `[ContentUpload] process-subtitle-job 직접 invoke 예외 ep${episodeNumber}:`,
            invokeErr,
          );
        });

      // Realtime 구독으로 진행 상태를 받아온다. 구독 해제 함수는
      // unmount 시 정리되도록 ref 맵에 저장 (아래 useEffect cleanup 참고).
      const unsubscribe = subscribeSubtitleJob(jobId, (progress) => {
        setPipelineMap((prev) => ({ ...prev, [draftId]: progress }));
      });
      pipelineUnsubscribeRef.current[draftId] = unsubscribe;
    } catch (err) {
      console.error(`[ContentUpload] 자막 작업 등록 실패 ep${episodeNumber}:`, err);
      setPipelineMap((prev) => ({
        ...prev,
        [draftId]: {
          stage: "error",
          stageLabel: "작업 등록 실패",
          completedLangs: [],
          totalLangs: 31,
          retryCount: 0,
          errorMessage: (err as Error).message,
        },
      }));
    }
  };

  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("SESSION =", session);
    console.log("SESSION.access_token 존재:", !!session?.access_token);
    console.log("SESSION.user.id 존재:", !!session?.user?.id);
    console.log("SESSION.user.id 값:", session?.user?.id ?? "(없음)");
    e?.preventDefault();

    if (!session) {
      setSubmitError("로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.");
      return;
    }
    if (!session.access_token) {
      setSubmitError("인증 토큰이 없습니다. 페이지를 새로고침 후 다시 시도해주세요.");
      return;
    }

    if (!title || !synopsis) { setSubmitError("제목과 시놉시스는 필수입니다."); return; }

    setSubmitting(true);
    setSubmitError(null);
    setUploadStatus("시리즈 등록 중...");

    try {
      const seriesPayload: Record<string, unknown> = {
        title,
        description: synopsis,
        total_episodes: episodes.length,
        status: "active",
      };

      const { data: dramaRow, error: dramaErr } = await supabase
        .from("series")
        .insert(seriesPayload)
        .select()
        .single();

      if (dramaErr || !dramaRow) {
        console.error("[ContentUpload] series INSERT error:", dramaErr);
        throw new Error(dramaErr?.message ?? "드라마 등록 실패");
      }
      const dramaId: string = (dramaRow as { id: string }).id;
      console.log("[ContentUpload] series 등록 완료 id:", dramaId);

      if (posterFile) {
        setUploadStatus("포스터 업로드 중...");
        try {
          const ext = posterFile.name.split(".").pop() ?? "jpg";
          const posterUrl = await uploadImage(BUCKET.POSTERS, `${dramaId}.${ext}`, posterFile);
          if (posterUrl) {
            await supabase.from("series").update({ thumbnail_url: posterUrl }).eq("id", dramaId);
          }
        } catch (imgErr) {
          console.warn("[ContentUpload] 포스터 업로드 실패 (비치명):", imgErr);
        }
      }

      if (backdropFile) {
        setUploadStatus("배경 이미지 업로드 중...");
        try {
          const ext = backdropFile.name.split(".").pop() ?? "jpg";
          const backdropUrl = await uploadImage(BUCKET.BANNERS, `${dramaId}.${ext}`, backdropFile);
          if (backdropUrl) {
            await supabase.from("series").update({ backdrop_url: backdropUrl }).eq("id", dramaId);
          }
        } catch (imgErr) {
          console.warn("[ContentUpload] 배경 업로드 실패 (비치명):", imgErr);
        }
      }

      let insertedEpisodes = 0;
      // Job 등록 Promise 목록 (비동기 병렬)
      const pipelinePromises: Promise<void>[] = [];

      for (let i = 0; i < episodes.length; i++) {
        const ep = episodes[i];
        setUploadStatus(`${i + 1}화 처리 중... (${i + 1}/${episodes.length})`);

        let videoUrl: string | null = null;
        if (ep.videoFile) {
          setUploadStatus(`${i + 1}화 영상 업로드 중...`);
          try {
            videoUrl = await uploadVideo(dramaId, `ep${i + 1}`, ep.videoFile, (pct) => {
              updateEpisode(ep.id, { videoProgress: pct });
              setUploadStatus(`${i + 1}화 영상 업로드 중... ${pct}%`);
            });
          } catch (videoErr) {
            console.error(`[ContentUpload] ${i + 1}화 영상 업로드 실패:`, videoErr);
            throw new Error(`${i + 1}화 영상 업로드 실패: ${(videoErr as Error).message}`, { cause: videoErr });
          }
        }

        let episodeThumbnailUrl: string | null = null;
        if (ep.thumbnailFile) {
          try {
            const ext = ep.thumbnailFile.name.split(".").pop() ?? "jpg";
            episodeThumbnailUrl = await uploadImage(
              BUCKET.THUMBNAILS,
              `${dramaId}/ep${i + 1}.${ext}`,
              ep.thumbnailFile
            );
          } catch (thumbErr) {
            console.warn("[ContentUpload] 에피소드 썸네일 업로드 실패 (비치명):", thumbErr);
          }
        }

        // 수동 입력 자막 (AI 자막은 파이프라인이 나중에 DB 업데이트)
        const subtitlesJson =
          Object.keys(ep.subtitles).length > 0 ? ep.subtitles : {};

        const { data: epRow, error: epErr } = await supabase.from("episodes").insert({
          series_id: dramaId,
          episode_number: i + 1,
          title: ep.title,
          video_url: videoUrl,
          thumbnail_url: episodeThumbnailUrl,
          subtitles: subtitlesJson,
        }).select().single();

        if (epErr || !epRow) {
          console.error(`[ContentUpload] ${i + 1}화 INSERT 오류:`, epErr?.message, epErr?.details);
          throw new Error(`${i + 1}화 등록 실패: ${epErr?.message}`);
        }

        const dbEpisodeId = (epRow as { id: string }).id;

        insertedEpisodes++;
        console.log(`[ContentUpload] ${i + 1}화 등록 완료, video_url:`, videoUrl, "ep_id:", dbEpisodeId);

        // ── 영상 업로드 완료 즉시 AI 자막 Job 등록 ───────────────────────
        if (videoUrl && aiSubtitleEnabled) {
          const capturedVideoUrl: string = videoUrl;
          const capturedDraftId = ep.id;
          const capturedNum = i + 1;
          const capturedDbId = dbEpisodeId;
          const capturedDramaId = dramaId;
          pipelinePromises.push(
            triggerSubtitlePipeline(
              capturedDraftId,
              capturedDbId,
              capturedNum,
              capturedVideoUrl,
              capturedDramaId,
            )
          );
        }
      }

      await supabase
        .from("series")
        .update({ total_episodes: insertedEpisodes })
        .eq("id", dramaId);

      setUploadStatus("등록 완료! AI 자막 생성 중...");
      setSubmitted(true);

      // 파이프라인들은 백그라운드에서 계속 실행 (await 안 함 → 페이지 이동 전 상태 표시)
      // 단, 짧은 대기로 UX 확인 가능하게
      if (pipelinePromises.length > 0) {
        setUploadStatus(`${pipelinePromises.length}개 에피소드 AI 자막 생성 중...`);
        // 파이프라인 완료를 기다리지 않고 진행 (백그라운드)
        Promise.allSettled(pipelinePromises).then((results) => {
          const failed = results.filter((r) => r.status === "rejected").length;
          console.log(`[ContentUpload] 파이프라인 완료. 실패: ${failed}/${pipelinePromises.length}`);
        });
        // 3초 후 이동 (상태 확인 시간 제공)
        setTimeout(() => navigate(`/drama/${dramaId}`), 3000);
      } else {
        setTimeout(() => navigate(`/drama/${dramaId}`), 1500);
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.error("[ContentUpload] 등록 오류:", err);
      setSubmitError(msg || "알 수 없는 오류가 발생했습니다.");
      setUploadStatus("");
    } finally {
      setSubmitting(false);
    }
  };

  // 파이프라인 실행 중인 에피소드 수
  const activePipelineCount = Object.values(pipelineMap).filter(
    (p) => p && p.stage !== "idle" && p.stage !== "done" && p.stage !== "error"
  ).length;

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in max-w-5xl mx-auto admin-grid-bg min-h-screen">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 mb-6">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:border-gold/40 transition-colors shrink-0" aria-label="뒤로가기">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold/80">
            <Crown size={12} /> Framix Studio
          </div>
          <h1 className="text-xl md:text-2xl font-black truncate">
            <span className="text-gradient-gold">신규 콘텐츠</span> 등록
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button type="button" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border border-border hover:border-gold/40 text-text-dim hover:text-text transition-colors">
            <Save size={14} /> 임시저장
          </button>
          <button type="button" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border border-border hover:border-gold/40 text-text-dim hover:text-text transition-colors">
            <Eye size={14} /> 미리보기
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-3 md:p-4 mb-5 admin-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
            <Sparkles size={13} className="text-gold" /> 콘텐츠 완성도
          </p>
          <span className="text-xs font-bold text-gold tabular-nums">{completion}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-gradient-gold transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {/* ── AI 자막 자동 생성 설정 배너 ──────────────────────────────────── */}
      <div className={`mb-5 rounded-xl border p-3.5 transition-colors ${
        aiSubtitleEnabled
          ? "border-gold/30 bg-gold/5"
          : "border-border bg-surface"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bot size={15} className={aiSubtitleEnabled ? "text-gold" : "text-text-muted"} />
            <div className="min-w-0">
              <p className="text-xs font-bold">AI 자막 자동 생성</p>
              <p className="text-[11px] text-text-muted">
                {aiSubtitleEnabled
                  ? "영상 업로드 완료 시 30개 언어 자막이 백그라운드에서 자동 생성됩니다"
                  : "비활성화됨 — 수동으로 자막 URL을 입력하세요"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAiSubtitleEnabled((v) => !v)}
              className={`relative w-9 h-5 rounded-full border transition-all ${
                aiSubtitleEnabled ? "bg-gold border-gold" : "bg-surface-2 border-border"
              }`}
              aria-label="AI 자막 토글"
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                aiSubtitleEnabled ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>
        {aiSubtitleEnabled && (
          <p className="text-[10px] text-text-muted mt-2 pt-2 border-t border-border/50">
            Groq Whisper STT + Gemini 번역(OpenRouter 폴백) 사용 · 작업은 서버에서 처리되며 브라우저를 닫아도 계속 진행됩니다
          </p>
        )}
      </div>

      <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <ol className="flex items-center gap-2 min-w-max">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={label} className="flex items-center gap-2">
                <button type="button" onClick={() => setStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    active ? "bg-gold text-black border-gold shadow-lg shadow-gold/20"
                      : done ? "bg-gold/10 text-gold border-gold/30"
                      : "bg-surface text-text-dim border-border"
                  }`}>
                  <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${
                    active ? "bg-black/20" : done ? "bg-gold/20" : "bg-surface-2"
                  }`}>
                    {done ? <CheckCircle2 size={12} /> : i + 1}
                  </span>
                  {label}
                </button>
                {i < STEPS.length - 1 && <span className="w-6 h-px bg-border" />}
              </li>
            );
          })}
        </ol>
      </div>

      {submitError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          {submitError}
        </div>
      )}

      {submitting && uploadStatus && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm animate-fade-in">
          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin shrink-0" />
          {uploadStatus}
        </div>
      )}

      {/* ── 파이프라인 진행 상태 패널 ─────────────────────────────────────── */}
      {Object.keys(pipelineMap).length > 0 && (
        <div className="mb-5 space-y-2 animate-fade-in">
          <p className="text-xs font-bold text-gold flex items-center gap-1.5 mb-2">
            <Bot size={13} />
            AI 자막 파이프라인
            {activePipelineCount > 0 && (
              <span className="ml-1 text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full">
                {activePipelineCount}개 처리 중
              </span>
            )}
          </p>
          {episodes.map((ep, i) => {
            const prog = pipelineMap[ep.id];
            if (!prog) return null;
            return (
              <SubtitlePipelineStatus
                key={ep.id}
                episodeNumber={i + 1}
                episodeTitle={ep.title}
                progress={prog}
              />
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold mb-2">작품 제목 *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 재벌집 그녀의 계약"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">영문 제목</label>
              <input value={englishTitle} onChange={(e) => setEnglishTitle(e.target.value)}
                placeholder="예: Contract with a Chaebol"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold">시놉시스 *</label>
                <span className="text-[11px] text-text-muted tabular-nums">{synopsis.length}/500</span>
              </div>
              <textarea required maxLength={500} value={synopsis} onChange={(e) => setSynopsis(e.target.value)}
                rows={5} placeholder="작품 줄거리를 입력하세요"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">시청 연령</label>
                <select value={ageRating} onChange={(e) => setAgeRating(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors">
                  <option>전체</option><option>12+</option><option>15+</option><option>19+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">콘텐츠 태그</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setIsOriginal((v) => !v)}
                    className={`text-xs px-3 py-2 rounded-lg border font-semibold transition-colors ${
                      isOriginal ? "bg-gold text-black border-gold" : "border-border text-text-dim hover:border-gold/40"
                    }`}>FRAMIX 오리지널</button>
                  <button type="button" onClick={() => setIsExclusive((v) => !v)}
                    className={`text-xs px-3 py-2 rounded-lg border font-semibold transition-colors ${
                      isExclusive ? "bg-gold text-black border-gold" : "border-border text-text-dim hover:border-gold/40"
                    }`}>독점 콘텐츠</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">포스터 (2:3)</label>
                <input ref={posterRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0], setPosterFile, setPosterPreview)} />
                <button type="button" onClick={() => posterRef.current?.click()}
                  className="w-full aspect-2/3 rounded-xl border-2 border-dashed border-border bg-surface-2 hover:border-gold/50 transition-colors relative overflow-hidden group">
                  {posterPreview ? (
                    <>
                      <img src={posterPreview} alt="포스터" className="absolute inset-0 w-full h-full object-cover" />
                      <span onClick={(e) => { e.stopPropagation(); setPosterPreview(null); setPosterFile(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 grid place-items-center text-white hover:bg-danger transition-colors">
                        <X size={14} />
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                      <ImagePlus size={28} />
                      <span className="text-xs">포스터 업로드</span>
                      <span className="text-[10px]">권장 800×1200</span>
                    </span>
                  )}
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">배경 이미지 (16:9)</label>
                <input ref={backdropRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setBackdropFile(file); setBackdropPreview(URL.createObjectURL(file)); }
                  }} />
                <button type="button" onClick={() => backdropRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-surface-2 hover:border-gold/50 transition-colors relative overflow-hidden">
                  {backdropPreview ? (
                    <>
                      <img src={backdropPreview} alt="배경" className="absolute inset-0 w-full h-full object-cover" />
                      <span onClick={(e) => { e.stopPropagation(); setBackdropPreview(null); setBackdropFile(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 grid place-items-center text-white hover:bg-danger transition-colors">
                        <X size={14} />
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                      <ImagePlus size={28} />
                      <span className="text-xs">배경 이미지 업로드</span>
                      <span className="text-[10px]">권장 1920×1080</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold">장르 선택</label>
                <span className="text-[11px] text-text-muted">{selectedGenres.length}개 선택됨</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {genreOptions.map((g) => {
                  const on = selectedGenres.includes(g);
                  return (
                    <button type="button" key={g} onClick={() => toggleGenre(g)}
                      className={`text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-all ${
                        on ? "bg-gold text-black border-gold font-semibold shadow-lg shadow-gold/20"
                          : "border-border text-text-dim hover:border-gold/40 hover:text-text"
                      }`}>
                      {on && "✓ "}{g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Film size={15} className="text-gold shrink-0" />
                <h3 className="text-sm md:text-base font-bold truncate">에피소드 ({episodes.length})</h3>
              </div>
              <button type="button" onClick={addEpisode}
                className="flex items-center gap-1 text-xs bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 px-3 py-1.5 rounded-md font-semibold transition-colors">
                <Plus size={14} /> 추가
              </button>
            </div>
            <div className="space-y-2">
              {episodes.map((ep, i) => (
                <div key={ep.id} className="bg-surface-2 border border-border rounded-xl p-2.5 hover:border-gold/30 transition-colors">
                  {/* 에피소드 기본 행 */}
                  <div className="grid grid-cols-[auto_36px_minmax(0,1fr)_72px_auto_auto_auto] sm:grid-cols-[auto_36px_minmax(0,1fr)_90px_auto_auto_auto] gap-2 items-center">
                    <div className="flex flex-col -gap-1 text-text-muted">
                      <button type="button" onClick={() => moveEpisode(ep.id, -1)} className="hover:text-gold leading-none text-[10px]" aria-label="위로">▲</button>
                      <button type="button" onClick={() => moveEpisode(ep.id, 1)} className="hover:text-gold leading-none text-[10px]" aria-label="아래">▼</button>
                    </div>
                    <span className="text-xs font-bold text-gold w-9 h-9 rounded-md bg-gold/10 border border-gold/20 grid place-items-center shrink-0">{i + 1}</span>
                    <input value={ep.title} onChange={(e) => updateEpisode(ep.id, { title: e.target.value })}
                      placeholder="에피소드 제목"
                      className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors min-w-0" />
                    <input value={ep.duration} onChange={(e) => updateEpisode(ep.id, { duration: e.target.value })}
                      placeholder="12:00"
                      className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors text-center" />
                    <button type="button" onClick={() => updateEpisode(ep.id, { isFree: !ep.isFree })}
                      className={`text-[10px] font-bold px-2 py-1.5 rounded-md border transition-colors shrink-0 ${
                        ep.isFree ? "bg-gold text-black border-gold" : "border-border text-text-dim"
                      }`}>
                      {ep.isFree ? "무료" : "유료"}
                    </button>
                    {/* 자막 토글 버튼 */}
                    <button
                      type="button"
                      onClick={() => updateEpisode(ep.id, { showSubtitlePanel: !ep.showSubtitlePanel })}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-md border transition-colors shrink-0 ${
                        ep.showSubtitlePanel
                          ? "bg-gold/20 text-gold border-gold/50"
                          : Object.keys(ep.subtitles).length > 0
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "border-border text-text-dim hover:border-gold/40"
                      }`}
                      aria-label="자막 URL"
                    >
                      <Subtitles size={12} />
                      {Object.keys(ep.subtitles).length > 0 && (
                        <span className="tabular-nums">{Object.keys(ep.subtitles).length}</span>
                      )}
                      {ep.showSubtitlePanel ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                    <button type="button" onClick={() => removeEpisode(ep.id)} aria-label="에피소드 삭제"
                      className="w-8 h-8 rounded-md grid place-items-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* ─── 자막 URL 입력 패널 ──────────────────────────────────── */}
                  {ep.showSubtitlePanel && (
                    <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                      <p className="text-[11px] text-gold font-semibold mb-2 flex items-center gap-1.5">
                        <Subtitles size={12} /> 자막 URL (VTT) — 해당 언어 URL 입력 시 자동 활성화
                      </p>
                      {aiSubtitleEnabled && (
                        <p className="text-[10px] text-text-muted mb-2 flex items-center gap-1">
                          <Bot size={10} />
                          AI 자막 자동 생성 ON — 영상 업로드 후 자동으로 채워집니다
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {SUBTITLE_LANGUAGES.map((lang) => (
                          <div key={lang.code} className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted font-mono w-14 shrink-0 text-right">
                              {lang.code}
                            </span>
                            <input
                              type="url"
                              value={ep.subtitles[lang.code] ?? ""}
                              onChange={(e) => updateSubtitleUrl(ep.id, lang.code, e.target.value)}
                              placeholder={`${lang.label} VTT URL`}
                              className={`flex-1 bg-surface border rounded px-2 py-1 text-[11px] focus:outline-none transition-colors min-w-0 ${
                                ep.subtitles[lang.code]
                                  ? "border-emerald-500/50 text-emerald-300 focus:border-emerald-400"
                                  : "border-border text-text-dim focus:border-gold/50"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-3 flex items-center gap-1">
              <GripVertical size={12} /> 화살표로 순서를 조정할 수 있습니다.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card animate-fade-in space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-text-dim">각 에피소드의 영상 파일을 업로드하세요. 업로드는 콘텐츠 등록 버튼 클릭 시 일괄 처리됩니다.</p>
              {aiSubtitleEnabled && (
                <div className="shrink-0 flex items-center gap-1 text-[10px] text-gold font-semibold bg-gold/10 border border-gold/30 px-2.5 py-1.5 rounded-md">
                  <Bot size={11} />
                  AI 자막 자동
                </div>
              )}
            </div>

            {episodes.map((ep, i) => (
              <div key={ep.id} className="bg-surface-2 border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gold">{i + 1}화 — {ep.title}</span>
                  <div className="flex items-center gap-2">
                    {Object.keys(ep.subtitles).length > 0 && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Subtitles size={10} /> 자막 {Object.keys(ep.subtitles).length}개
                      </span>
                    )}
                    {ep.videoFile && (
                      <span className="text-[10px] text-green-400 font-semibold">✓ {ep.videoFile.name}</span>
                    )}
                  </div>
                </div>

                <div
                  onDragOver={(e) => handleDragOver(e, ep.id)}
                  onDragLeave={(e) => handleDragLeave(e, ep.id)}
                  onDrop={(e) => handleDrop(e, ep.id)}
                  onClick={() => document.getElementById(`video-input-${ep.id}`)?.click()}
                  className={`block rounded-xl border-2 border-dashed transition-all cursor-pointer py-6 px-4 text-center ${
                    dragOverMap[ep.id] ? "border-gold bg-gold/5" : ep.videoFile ? "border-green-500/40 bg-green-500/5" : "border-border bg-surface hover:border-gold/50"
                  }`}
                >
                  <input
                    id={`video-input-${ep.id}`}
                    type="file"
                    accept="video/*,.mp4,.mov,.avi,.webm"
                    className="hidden"
                    onChange={(e) => handleEpisodeVideo(ep.id, e.target.files?.[0])}
                  />
                  <UploadCloud size={22} className={`mx-auto mb-2 ${ep.videoFile ? "text-green-400" : "text-gold"}`} />
                  <p className="text-xs font-semibold">{ep.videoFile ? ep.videoFile.name : "클릭 또는 드래그하여 영상 업로드"}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">MP4, MOV · 최대 5GB</p>
                  {aiSubtitleEnabled && (
                    <p className="text-[10px] text-gold/70 mt-1 flex items-center justify-center gap-1">
                      <Bot size={9} /> 업로드 완료 시 AI 자막 자동 생성
                    </p>
                  )}
                </div>

                {ep.videoProgress > 0 && ep.videoProgress < 100 && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-text-muted">업로드 중...</span>
                      <span className="text-gold font-bold tabular-nums">{ep.videoProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                      <div className="h-full bg-gradient-gold transition-all" style={{ width: `${ep.videoProgress}%` }} />
                    </div>
                  </div>
                )}
                {ep.videoProgress === 100 && ep.videoFile && (
                  <div className="flex items-center gap-1.5 text-[11px] text-green-400 font-semibold">
                    <CheckCircle2 size={12} /> 업로드 완료
                  </div>
                )}

                {/* 파이프라인 진행 상태 (이 에피소드) */}
                {pipelineMap[ep.id] && (
                  <SubtitlePipelineStatus
                    episodeNumber={i + 1}
                    episodeTitle={ep.title}
                    progress={pipelineMap[ep.id]!}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 sticky bottom-2">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            className="px-4 py-2.5 rounded-md border border-border bg-surface text-sm font-semibold text-text-dim disabled:opacity-40 hover:border-gold/40 transition-colors">
            이전
          </button>
          <div className="hidden sm:flex items-center justify-center text-[11px] text-text-muted">
            단계 {step + 1} / {STEPS.length}
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-5 py-2.5 rounded-md bg-gradient-gold text-black text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-gold/20">
              다음 →
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e as unknown as FormEvent<HTMLFormElement>)}
              className="px-5 py-2.5 rounded-md bg-gradient-gold text-black text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-gold/20 flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />등록 중...</>
              ) : submitted ? (
                <><CheckCircle2 size={16} />등록 완료!</>
              ) : (
                "콘텐츠 등록"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
