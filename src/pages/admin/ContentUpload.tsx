import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, UploadCloud, Plus, Trash2, ImagePlus, CheckCircle2 } from "lucide-react";

interface EpisodeDraft {
  id: number;
  title: string;
  duration: string;
  isFree: boolean;
}

const genreOptions = [
  "재벌", "복수", "회귀", "로맨스", "오피스", "쌍둥이", "계약결혼", "운명", "서스펜스", "성장", "가족", "스릴러",
];

export default function ContentUpload() {
  const navigate = useNavigate();
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

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const addEpisode = () => {
    setEpisodes((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, title: `${prev.length + 1}화`, duration: "12:00", isFree: false },
    ]);
  };

  const removeEpisode = (id: number) => {
    setEpisodes((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEpisode = (id: number, patch: Partial<EpisodeDraft>) => {
    setEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center" aria-label="뒤로가기">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold">콘텐츠 업로드</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Poster / backdrop upload */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">포스터 (세로)</label>
            <div className="aspect-2/3 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-text-muted hover:border-gold/50 transition-colors cursor-pointer">
              <ImagePlus size={28} />
              <span className="text-xs">이미지 업로드</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">배경 이미지 (가로)</label>
            <div className="aspect-2/3 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-text-muted hover:border-gold/50 transition-colors cursor-pointer">
              <ImagePlus size={28} />
              <span className="text-xs">이미지 업로드</span>
            </div>
          </div>
        </div>

        {/* Basic info */}
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
          <label className="block text-sm font-semibold mb-2">시놉시스 *</label>
          <textarea
            required
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
            placeholder="작품 줄거리를 입력하세요"
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors resize-none"
          />
        </div>

        {/* Genres */}
        <div>
          <label className="block text-sm font-semibold mb-2">장르 선택</label>
          <div className="flex flex-wrap gap-2">
            {genreOptions.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => toggleGenre(g)}
                className={`text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  selectedGenres.includes(g)
                    ? "bg-gold text-black border-gold font-semibold"
                    : "border-border text-text-dim"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Age rating + flags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">시청 연령</label>
            <select
              value={ageRating}
              onChange={(e) => setAgeRating(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
            >
              <option>전체</option>
              <option>12+</option>
              <option>15+</option>
              <option>19+</option>
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isOriginal} onChange={(e) => setIsOriginal(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              FRAMIX 오리지널
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isExclusive} onChange={(e) => setIsExclusive(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              독점 콘텐츠
            </label>
          </div>
        </div>

        {/* Episodes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold">에피소드 ({episodes.length})</label>
            <button type="button" onClick={addEpisode} className="flex items-center gap-1 text-xs text-gold font-semibold">
              <Plus size={14} />
              에피소드 추가
            </button>
          </div>
          <div className="space-y-2">
            {episodes.map((ep, i) => (
              <div key={ep.id} className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg p-2.5">
                <span className="text-xs text-text-muted w-8 shrink-0 text-center">{i + 1}화</span>
                <input
                  value={ep.title}
                  onChange={(e) => updateEpisode(ep.id, { title: e.target.value })}
                  placeholder="에피소드 제목"
                  className="flex-1 bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors min-w-0"
                />
                <input
                  value={ep.duration}
                  onChange={(e) => updateEpisode(ep.id, { duration: e.target.value })}
                  placeholder="12:00"
                  className="w-16 bg-surface border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-gold transition-colors shrink-0"
                />
                <label className="flex items-center gap-1 text-xs text-text-dim shrink-0">
                  <input type="checkbox" checked={ep.isFree} onChange={(e) => updateEpisode(ep.id, { isFree: e.target.checked })} className="w-3.5 h-3.5 accent-amber-500" />
                  무료
                </label>
                <button type="button" onClick={() => removeEpisode(ep.id)} aria-label="에피소드 삭제" className="text-text-muted hover:text-danger shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Video file uploader */}
        <div>
          <label className="block text-sm font-semibold mb-2">영상 파일 업로드</label>
          <div className="rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-text-muted hover:border-gold/50 transition-colors cursor-pointer py-10">
            <UploadCloud size={32} />
            <span className="text-sm">클릭 또는 드래그하여 영상 업로드</span>
            <span className="text-xs">MP4, MOV (최대 5GB)</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gold text-black font-bold py-3.5 rounded-md text-base hover:bg-gold-light transition-colors flex items-center justify-center gap-2"
        >
          {submitted ? (
            <>
              <CheckCircle2 size={18} />
              업로드 완료!
            </>
          ) : (
            "콘텐츠 등록하기"
          )}
        </button>
      </form>
    </div>
  );
}
