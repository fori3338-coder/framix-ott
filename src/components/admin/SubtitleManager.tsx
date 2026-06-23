import { useCallback, useEffect, useRef, useState } from "react";
import {
  X, Upload, Trash2, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadSubtitle, BUCKET } from "../../lib/storage";

// ─── 지원 자막 언어 목록 (Player.tsx와 동일) ───────────────────────────────
export const SUBTITLE_LANGUAGES = [
  { code: "ko",    label: "한국어 (CC)" },
  { code: "en",    label: "English" },
  { code: "en-cc", label: "English (CC)" },
  { code: "ja",    label: "日本語" },
  { code: "zh-cn", label: "中文 (简体)" },
  { code: "zh-tw", label: "中文 (繁體)" },
  { code: "es",    label: "Español" },
  { code: "fr",    label: "Français" },
  { code: "de",    label: "Deutsch" },
  { code: "it",    label: "Italiano" },
  { code: "pt-br", label: "Português (Brasil)" },
  { code: "ru",    label: "Русский" },
  { code: "ar",    label: "العربية" },
  { code: "th",    label: "ภาษาไทย" },
  { code: "vi",    label: "Tiếng Việt" },
  { code: "id",    label: "Bahasa Indonesia" },
  { code: "ms",    label: "Bahasa Melayu" },
  { code: "tr",    label: "Türkçe" },
  { code: "nl",    label: "Nederlands" },
  { code: "no",    label: "Norsk" },
  { code: "da",    label: "Dansk" },
  { code: "sv",    label: "Svenska" },
  { code: "el",    label: "Ελληνικά" },
  { code: "cs",    label: "Čeština" },
  { code: "ro",    label: "Română" },
  { code: "hr",    label: "Hrvatski" },
];

// ─── DB episode row (subtitles 컬럼 포함) ─────────────────────────────────
interface DbEpisode {
  id: string;
  title: string;
  episode_number: number;
  subtitles: Record<string, string>;
}

interface Props {
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
}

export default function SubtitleManager({ seriesId, seriesTitle, onClose }: Props) {
  const [episodes, setEpisodes] = useState<DbEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 현재 선택한 에피소드 ID
  const [selectedEpId, setSelectedEpId] = useState<string | null>(null);
  const selectedEp = episodes.find((e) => e.id === selectedEpId) ?? null;

  // 언어 선택 + 업로드 상태
  const [selectedLang, setSelectedLang] = useState<string>("ko");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null); // lang code

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── 에피소드 목록 로드 ─────────────────────────────────────────────────
  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("episodes")
      .select("id, title, episode_number, subtitles")
      .eq("series_id", seriesId)
      .order("episode_number", { ascending: true });

    if (error) {
      setMsg({ text: `에피소드 조회 실패: ${error.message}`, ok: false });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as DbEpisode[];
    setEpisodes(rows);
    if (rows.length > 0 && !selectedEpId) setSelectedEpId(rows[0].id);
    setLoading(false);
  }, [seriesId, selectedEpId]);

  useEffect(() => { fetchEpisodes(); }, [fetchEpisodes]);

  // ─── VTT 업로드 ─────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!selectedEpId || !selectedLang) return;
    if (!file.name.endsWith(".vtt")) {
      setMsg({ text: "VTT 파일만 업로드할 수 있습니다 (.vtt)", ok: false });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMsg(null);

    try {
      // 1) Storage 업로드
      const publicUrl = await uploadSubtitle(
        seriesId,
        selectedEpId,
        selectedLang,
        file,
        setUploadProgress,
      );

      // 2) episodes.subtitles JSONB 업데이트
      const currentSubs = selectedEp?.subtitles ?? {};
      const newSubs = { ...currentSubs, [selectedLang]: publicUrl };

      const { error: dbErr } = await supabase
        .from("episodes")
        .update({ subtitles: newSubs })
        .eq("id", selectedEpId);

      if (dbErr) throw new Error(`DB 저장 실패: ${dbErr.message}`);

      setMsg({ text: `${SUBTITLE_LANGUAGES.find((l) => l.code === selectedLang)?.label ?? selectedLang} 자막 업로드 완료`, ok: true });
      await fetchEpisodes();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "업로드 실패", ok: false });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  // ─── 언어별 자막 삭제 ───────────────────────────────────────────────────
  const handleDelete = async (lang: string) => {
    if (!selectedEpId || !selectedEp) return;
    if (!window.confirm(`"${SUBTITLE_LANGUAGES.find((l) => l.code === lang)?.label ?? lang}" 자막을 삭제하시겠습니까?`)) return;

    setDeleting(lang);
    setMsg(null);

    try {
      // 1) Storage 파일 삭제
      const storagePath = `${seriesId}/${selectedEpId}/${lang}.vtt`;
      await supabase.storage.from(BUCKET.SUBTITLES).remove([storagePath]);

      // 2) episodes.subtitles에서 해당 언어 제거
      const newSubs = { ...selectedEp.subtitles };
      delete newSubs[lang];

      const { error: dbErr } = await supabase
        .from("episodes")
        .update({ subtitles: newSubs })
        .eq("id", selectedEpId);

      if (dbErr) throw new Error(`DB 업데이트 실패: ${dbErr.message}`);

      setMsg({ text: `${SUBTITLE_LANGUAGES.find((l) => l.code === lang)?.label ?? lang} 자막 삭제 완료`, ok: true });
      await fetchEpisodes();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "삭제 실패", ok: false });
    } finally {
      setDeleting(null);
    }
  };

  // ─── 현재 선택된 에피소드의 자막 목록 ──────────────────────────────────
  const currentSubs: Record<string, string> = selectedEp?.subtitles ?? {};
  const uploadedCodes = new Set(Object.keys(currentSubs));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-[#141416] border border-[#2a2a2c] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2c] bg-[#1a1a1c]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[#ff3e6c] shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 15h4m0 0h4m-4 0V9" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">자막 관리</p>
              <p className="text-[11px] text-[#888] truncate">{seriesTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#666] hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* ── 에피소드 사이드바 ── */}
          <div className="sm:w-48 sm:shrink-0 border-b sm:border-b-0 sm:border-r border-[#2a2a2c] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-[#555]">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : episodes.length === 0 ? (
              <p className="text-xs text-[#666] text-center py-6 px-3">에피소드 없음</p>
            ) : (
              <div className="flex sm:flex-col gap-0 overflow-x-auto sm:overflow-x-visible">
                {episodes.map((ep) => {
                  const subCount = Object.keys(ep.subtitles ?? {}).length;
                  const isSelected = ep.id === selectedEpId;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => setSelectedEpId(ep.id)}
                      className={`shrink-0 sm:shrink text-left px-3 py-2.5 sm:py-3 transition-colors border-b border-[#1e1e20] ${
                        isSelected
                          ? "bg-[#ff3e6c]/10 border-l-2 border-l-[#ff3e6c] sm:border-l"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <p className={`text-xs font-semibold truncate ${isSelected ? "text-[#ff3e6c]" : "text-white/80"}`}>
                        {ep.episode_number}화 {ep.title}
                      </p>
                      <p className="text-[10px] mt-0.5">
                        {subCount > 0 ? (
                          <span className="text-emerald-400">{subCount}개 언어</span>
                        ) : (
                          <span className="text-[#555]">자막 없음</span>
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 메인 영역 ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

            {/* 메시지 배너 */}
            {msg && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                msg.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}>
                {msg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {msg.text}
                <button onClick={() => setMsg(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            {!selectedEp ? (
              <p className="text-xs text-[#666] text-center py-10">에피소드를 선택하세요</p>
            ) : (
              <>
                {/* ── 언어 선택 + VTT 업로드 ── */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#ff3e6c] mb-3">VTT 업로드</h3>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* 언어 선택 */}
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      disabled={uploading}
                      className="flex-1 sm:flex-none sm:w-52 bg-[#1e1e20] border border-[#2a2a2c] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff3e6c] disabled:opacity-50"
                    >
                      {SUBTITLE_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label} ({l.code})
                          {uploadedCodes.has(l.code) ? " ✓" : ""}
                        </option>
                      ))}
                    </select>

                    {/* 파일 선택 버튼 */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#ff3e6c] text-black text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {uploadProgress > 0 ? `${uploadProgress}%` : "업로드 중..."}
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> VTT 파일 선택
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".vtt,text/vtt"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* 업로드 진행바 */}
                  {uploading && (
                    <div className="mt-2 h-1 bg-[#2a2a2c] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ff3e6c] rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-[#555] mt-2">
                    WebVTT 형식(.vtt)만 지원합니다. 업로드 시 동일 언어가 있으면 덮어씁니다.
                  </p>
                </div>

                {/* ── 현재 자막 목록 ── */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#ff3e6c] mb-3">
                    등록된 자막 ({uploadedCodes.size}개)
                  </h3>

                  {uploadedCodes.size === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#2a2a2c] py-8 text-center">
                      <p className="text-xs text-[#555]">등록된 자막이 없습니다</p>
                      <p className="text-[10px] text-[#444] mt-1">위에서 언어를 선택 후 VTT 파일을 업로드하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {SUBTITLE_LANGUAGES.filter((l) => uploadedCodes.has(l.code)).map((lang) => {
                        const url = currentSubs[lang.code];
                        const isDeleting = deleting === lang.code;
                        return (
                          <div
                            key={lang.code}
                            className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[#1a1a1c] border border-[#2a2a2c] hover:border-[#3a3a3c] transition-colors"
                          >
                            {/* 상태 뱃지 */}
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />

                            {/* 언어명 */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white">{lang.label}</p>
                              <p className="text-[10px] text-[#555] font-mono truncate mt-0.5">{url}</p>
                            </div>

                            {/* 지원됨 배지 */}
                            <span className="shrink-0 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              지원됨
                            </span>

                            {/* URL 복사 */}
                            <button
                              onClick={() => { navigator.clipboard.writeText(url).catch(() => {}); setMsg({ text: "URL 복사됨", ok: true }); }}
                              title="URL 복사"
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-[#ff3e6c] hover:bg-[#ff3e6c]/10 transition-colors text-[11px] font-mono"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>

                            {/* 삭제 */}
                            <button
                              onClick={() => handleDelete(lang.code)}
                              disabled={isDeleting}
                              title="자막 삭제"
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                            >
                              {isDeleting ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── 미지원 언어 목록 ── */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#555] mb-3">
                    미지원 언어 ({SUBTITLE_LANGUAGES.length - uploadedCodes.size}개)
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBTITLE_LANGUAGES.filter((l) => !uploadedCodes.has(l.code)).map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLang(lang.code)}
                        title={`${lang.label} 자막 업로드`}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-[#1a1a1c] border border-[#2a2a2c] text-[#555] hover:text-[#ff3e6c] hover:border-[#ff3e6c]/40 transition-colors"
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#444] mt-2">클릭하면 위 언어 선택기에 적용됩니다</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
