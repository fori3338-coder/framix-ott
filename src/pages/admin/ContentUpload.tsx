import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, UploadCloud, Plus, Trash2, ImagePlus, CheckCircle2, X, GripVertical,
  Save, Eye, Film, Sparkles, Crown,
} from "lucide-react";

interface EpisodeDraft {
  id: number;
  title: string;
  duration: string;
  isFree: boolean;
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
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([
    { id: 1, title: "1화", duration: "12:00", isFree: true },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [backdropPreview, setBackdropPreview] = useState<string | null>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLInputElement>(null);

  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const completion = (() => {
    let score = 0;
    if (title) score += 20;
    if (synopsis) score += 15;
    if (selectedGenres.length) score += 15;
    if (posterPreview) score += 15;
    if (backdropPreview) score += 10;
    if (episodes.length) score += 10;
    if (videoName) score += 15;
    return Math.min(100, score);
  })();

  const toggleGenre = (g: string) =>
    setSelectedGenres((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const addEpisode = () =>
    setEpisodes((p) => [
      ...p,
      { id: p.length ? p[p.length - 1].id + 1 : 1, title: `${p.length + 1}화`, duration: "12:00", isFree: false },
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

  const handleImage = (file: File | undefined, setter: (s: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleVideo = (file: File | undefined) => {
    if (!file) return;
    setVideoName(file.name);
    setVideoProgress(0);
    const tick = () =>
      setVideoProgress((p) => {
        if (p >= 100) return 100;
        const next = p + Math.random() * 12 + 4;
        if (next < 100) setTimeout(tick, 220);
        return Math.min(100, next);
      });
    setTimeout(tick, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in max-w-5xl mx-auto admin-grid-bg min-h-screen">
      {/* Header */}
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

      {/* Completion bar */}
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

      {/* Stepper */}
      <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <ol className="flex items-center gap-2 min-w-max">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    active
                      ? "bg-gold text-black border-gold shadow-lg shadow-gold/20"
                      : done
                      ? "bg-gold/10 text-gold border-gold/30"
                      : "bg-surface text-text-dim border-border"
                  }`}
                >
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 0: basic info */}
        {step === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold mb-2">작품 제목 *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 재벌집 그녀의 계약"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">영문 제목</label>
              <input
                value={englishTitle}
                onChange={(e) => setEnglishTitle(e.target.value)}
                placeholder="예: Contract with a Chaebol"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold">시놉시스 *</label>
                <span className="text-[11px] text-text-muted tabular-nums">{synopsis.length}/500</span>
              </div>
              <textarea
                required
                maxLength={500}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={5}
                placeholder="작품 줄거리를 입력하세요"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">시청 연령</label>
                <select
                  value={ageRating}
                  onChange={(e) => setAgeRating(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
                >
                  <option>전체</option><option>12+</option><option>15+</option><option>19+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">콘텐츠 태그</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setIsOriginal((v) => !v)}
                    className={`text-xs px-3 py-2 rounded-lg border font-semibold transition-colors ${
                      isOriginal ? "bg-gold text-black border-gold" : "border-border text-text-dim hover:border-gold/40"
                    }`}>
                    FRAMIX 오리지널
                  </button>
                  <button type="button" onClick={() => setIsExclusive((v) => !v)}
                    className={`text-xs px-3 py-2 rounded-lg border font-semibold transition-colors ${
                      isExclusive ? "bg-gold text-black border-gold" : "border-border text-text-dim hover:border-gold/40"
                    }`}>
                    독점 콘텐츠
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: images + genres */}
        {step === 1 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-4">
              {/* Poster */}
              <div>
                <label className="block text-sm font-semibold mb-2">포스터 (2:3)</label>
                <input ref={posterRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0], setPosterPreview)} />
                <button type="button" onClick={() => posterRef.current?.click()}
                  className="w-full aspect-2/3 rounded-xl border-2 border-dashed border-border bg-surface-2 hover:border-gold/50 transition-colors relative overflow-hidden group">
                  {posterPreview ? (
                    <>
                      <img src={posterPreview} alt="포스터" className="absolute inset-0 w-full h-full object-cover" />
                      <span onClick={(e) => { e.stopPropagation(); setPosterPreview(null); }}
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
              {/* Backdrop */}
              <div>
                <label className="block text-sm font-semibold mb-2">배경 이미지 (16:9)</label>
                <input ref={backdropRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0], setBackdropPreview)} />
                <button type="button" onClick={() => backdropRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-surface-2 hover:border-gold/50 transition-colors relative overflow-hidden">
                  {backdropPreview ? (
                    <>
                      <img src={backdropPreview} alt="배경" className="absolute inset-0 w-full h-full object-cover" />
                      <span onClick={(e) => { e.stopPropagation(); setBackdropPreview(null); }}
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
                        on
                          ? "bg-gold text-black border-gold font-semibold shadow-lg shadow-gold/20"
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

        {/* STEP 2: episodes */}
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
                  <input
                    value={ep.title}
                    onChange={(e) => updateEpisode(ep.id, { title: e.target.value })}
                    placeholder="에피소드 제목"
                    className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors min-w-0"
                  />
                  <input
                    value={ep.duration}
                    onChange={(e) => updateEpisode(ep.id, { duration: e.target.value })}
                    placeholder="12:00"
                    className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors text-center"
                  />
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

        {/* STEP 3: video upload */}
        {step === 3 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 admin-card animate-fade-in">
            <label className="block text-sm font-semibold mb-2">영상 파일</label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                handleVideo(e.dataTransfer.files?.[0]);
              }}
              className={`block rounded-2xl border-2 border-dashed transition-all cursor-pointer py-10 px-6 text-center ${
                dragOver ? "border-gold bg-gold/5" : "border-border bg-surface-2 hover:border-gold/50"
              }`}
            >
              <input type="file" accept="video/*" className="hidden"
                onChange={(e) => handleVideo(e.target.files?.[0])} />
              <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 border border-gold/20 grid place-items-center mb-3">
                <UploadCloud size={26} className="text-gold" />
              </div>
              <p className="text-sm font-semibold">클릭 또는 드래그하여 영상 업로드</p>
              <p className="text-xs text-text-muted mt-1">MP4, MOV, MKV · 최대 5GB</p>
            </label>

            {videoName && (
              <div className="mt-4 bg-surface-2 border border-border rounded-xl p-3 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold truncate">{videoName}</p>
                  <span className="text-[11px] tabular-nums text-gold font-bold">{Math.round(videoProgress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-gradient-gold transition-all" style={{ width: `${videoProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer nav */}
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
            <button type="submit"
              className="px-5 py-2.5 rounded-md bg-gradient-gold text-black text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-gold/20 flex items-center gap-1.5">
              {submitted ? (<><CheckCircle2 size={16} /> 등록 완료!</>) : "콘텐츠 등록"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
