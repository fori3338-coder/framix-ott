import { useEffect, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, UploadCloud, Plus, Trash2, ImagePlus, CheckCircle2, X, GripVertical,
  Save, Eye, Film, Sparkles, Crown, AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadImage, uploadVideo, BUCKET } from "../../lib/storage";

interface EpisodeDraft {
  id: number;
  title: string;
  duration: string;
  isFree: boolean;
  videoFile?: File;
  videoProgress: number;
  thumbnailFile?: File;
  thumbnailPreview?: string;
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
    { id: 1, title: "1화", duration: "12:00", isFree: true, videoProgress: 0 },
  ]);

  const [dragOverMap, setDragOverMap] = useState<Record<number, boolean>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

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
      { id: p.length ? p[p.length - 1].id + 1 : 1, title: `${p.length + 1}화`, duration: "12:00", isFree: false, videoProgress: 0 },
    ]);

  const removeEpisode = (id: number) => setEpisodes((p) => p.filter((e) => e.id !== id));
  const updateEpisode = (id: number, patch: Partial<EpisodeDraft>) =>
    setEpisodes((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));

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
    console.log("[ContentUpload] VIDEO_CHANGE", episodeId, file?.name);
    if (!file) return;
    updateEpisode(episodeId, { videoFile: file, videoProgress: 0 });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, episodeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMap((prev) => ({ ...prev, [episodeId]: true }));
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, episodeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMap((prev) => ({ ...prev, [episodeId]: false }));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, episodeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMap((prev) => ({ ...prev, [episodeId]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) handleEpisodeVideo(episodeId, file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    console.log("[ContentUpload] HANDLE_SUBMIT");
    e.preventDefault();
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
          const ext = posterFile.name.split('.').pop() ?? 'jpg';
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
          const ext = backdropFile.name.split('.').pop() ?? 'jpg';
          const backdropUrl = await uploadImage(BUCKET.BANNERS, `${dramaId}.${ext}`, backdropFile);
          if (backdropUrl) {
            await supabase.from("series").update({ backdrop_url: backdropUrl }).eq("id", dramaId);
          }
        } catch (imgErr) {
          console.warn("[ContentUpload] 배경 업로드 실패 (비치명):", imgErr);
        }
      }

      let insertedEpisodes = 0;

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
            console.log("[ContentUpload] 영상 업로드 성공:", videoUrl);
          } catch (videoErr) {
            console.error(`[ContentUpload] ${i + 1}화 영상 업로드 실패:`, videoErr);
            throw new Error(`${i + 1}화 영상 업로드 실패: ${(videoErr as Error).message}`);
          }
        }

        let episodeThumbnailUrl: string | null = null;
        if (ep.thumbnailFile) {
          try {
            const ext = ep.thumbnailFile.name.split('.').pop() ?? 'jpg';
            episodeThumbnailUrl = await uploadImage(
              BUCKET.THUMBNAILS,
              `${dramaId}/ep${i + 1}.${ext}`,
              ep.thumbnailFile
            );
          } catch (thumbErr) {
            console.warn("[ContentUpload] 에피소드 썸네일 업로드 실패 (비치명):", thumbErr);
          }
        }

        const { error: epErr } = await supabase.from("episodes").insert({
          series_id: dramaId,
          episode_number: i + 1,
          title: ep.title,
          thumbnail_url: episodeThumbnailUrl,
          video_url: videoUrl,
          sort_order: i,
        });

        if (epErr) {
          console.error(`[ContentUpload] ${i + 1}화 INSERT 오류:`, epErr.message, epErr.details);
          throw new Error(`${i + 1}화 등록 실패: ${epErr.message}`);
        }

        insertedEpisodes++;
        console.log(`[ContentUpload] ${i + 1}화 등록 완료, video_url:`, videoUrl);
      }

      await supabase
        .from("series")
        .update({ total_episodes: insertedEpisodes })
        .eq("id", dramaId);

      setUploadStatus("등록 완료!");
      setSubmitted(true);
      setTimeout(() => navigate(`/drama/${dramaId}`), 1500);

    } catch (err) {
      const msg = (err as Error).message;
      console.error("[ContentUpload] 등록 오류:", err);
      setSubmitError(msg || "알 수 없는 오류가 발생했습니다.");
      setUploadStatus("");
    } finally {
      setSubmitting(false);
    }
  };

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold mb-2">작품 제목 *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)}
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
                    if (file) {
                      setBackdropFile(file);
                      setBackdropPreview(URL.createObjectURL(file));
                    }
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
                <div key={ep.id}
                  className="grid grid-cols-[auto_36px_minmax(0,1fr)_72px_auto_auto] sm:grid-cols-[auto_36px_minmax(0,1fr)_90px_auto_auto] gap-2 items-center bg-surface-2 border border-border rounded-xl p-2.5 hover:border-gold/30 transition-colors">
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
                  <button type="button" onClick={() => removeEpisode(ep.id)} aria-label="에피소드 삭제"
                    className="w-8 h-8 rounded-md grid place-items-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
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
            <p className="text-sm text-text-dim">각 에피소드의 영상 파일을 업로드하세요. 업로드는 콘텐츠 등록 버튼 클릭 시 일괄 처리됩니다.</p>

            {episodes.map((ep, i) => (
              <div key={ep.id} className="bg-surface-2 border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gold">{i + 1}화 — {ep.title}</span>
                  {ep.videoFile && (
                    <span className="text-[10px] text-green-400 font-semibold">✓ 파일 선택됨: {ep.videoFile.name}</span>
                  )}
                </div>

                <div
                  onDragOver={(e) => handleDragOver(e, ep.id)}
                  onDragLeave={(e) => handleDragLeave(e, ep.id)}
                  onDrop={(e) => handleDrop(e, ep.id)}
                  onClick={() => {
                    const input = document.getElementById(`video-input-${ep.id}`) as HTMLInputElement | null;
                    input?.click();
                  }}
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
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 rounded-md bg-gradient-gold text-black text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-gold/20 flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> 등록 중...</>
              ) : submitted ? (
                <><CheckCircle2 size={16} /> 등록 완료!</>
              ) : "콘텐츠 등록"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
