/**
 * SubtitlePipelineStatus
 * ──────────────────────
 * ContentUpload CMS에서 AI 자막 백그라운드 Job 진행 상태를 표시하는 컴포넌트.
 * subtitle_jobs 테이블의 Realtime 구독 결과(PipelineProgress)를 그대로 렌더링.
 * 기존 Player / SubtitleEngine / SubtitleManager 등에는 일절 영향 없음.
 */

import { CheckCircle2, AlertCircle, Loader2, Sparkles, Languages, Clock } from 'lucide-react';
import type { PipelineProgress } from '../../lib/subtitlePipeline';

interface Props {
  episodeNumber: number;
  episodeTitle: string;
  progress: PipelineProgress;
}

const STAGE_ORDER = ['pending', 'transcribing', 'translating', 'uploading', 'registering', 'done'] as const;

function StageStep({
  label,
  status,
}: {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-5 h-5 rounded-full grid place-items-center shrink-0 text-[10px] font-bold transition-all ${
          status === 'done'
            ? 'bg-emerald-500/20 text-emerald-400'
            : status === 'active'
            ? 'bg-gold/20 text-gold'
            : status === 'error'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-surface-2 text-text-muted'
        }`}
      >
        {status === 'done' ? (
          <CheckCircle2 size={12} />
        ) : status === 'active' ? (
          <Loader2 size={11} className="animate-spin" />
        ) : status === 'error' ? (
          <AlertCircle size={12} />
        ) : (
          '·'
        )}
      </span>
      <span
        className={`text-[11px] transition-colors ${
          status === 'done'
            ? 'text-emerald-400'
            : status === 'active'
            ? 'text-gold font-semibold'
            : status === 'error'
            ? 'text-red-400'
            : 'text-text-muted'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function SubtitlePipelineStatus({ episodeNumber, episodeTitle, progress }: Props) {
  const { stage, completedLangs, totalLangs, currentLang, errorMessage, retryCount, providerUsed } = progress;

  const isDone = stage === 'done';
  const isError = stage === 'error';
  const isPending = stage === 'pending';
  const isActive = !isDone && !isError && !isPending && stage !== 'idle';

  const percent = totalLangs > 0 ? Math.round((completedLangs.length / totalLangs) * 100) : 0;

  const stageStatus = (s: (typeof STAGE_ORDER)[number]): 'pending' | 'active' | 'done' | 'error' => {
    if (isError) return 'pending';
    if (isDone) return 'done';
    const curr = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
    const idx = STAGE_ORDER.indexOf(s);
    if (idx < curr) return 'done';
    if (idx === curr) return 'active';
    return 'pending';
  };

  return (
    <div
      className={`rounded-xl border p-3 transition-colors animate-fade-in ${
        isDone
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : isError
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-gold/25 bg-gold/5'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2.5">
        {isPending ? (
          <Clock size={13} className="text-text-muted" />
        ) : (
          <Sparkles size={13} className={isDone ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-gold'} />
        )}
        <span className="text-xs font-bold text-text">
          {episodeNumber}화 — {episodeTitle}
        </span>
        <span
          className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isDone
              ? 'text-emerald-400 bg-emerald-500/10'
              : isError
              ? 'text-red-400 bg-red-500/10'
              : isPending
              ? 'text-text-muted bg-surface-2'
              : 'text-gold bg-gold/10'
          }`}
        >
          {isDone ? `${completedLangs.length}개 언어` : isError ? '오류' : isPending ? '대기 중' : 'AI 처리 중'}
        </span>
      </div>

      {/* 스테이지 스텝 */}
      <div className="space-y-1.5 mb-3">
        <StageStep label="한국어 자막 생성 (Groq Whisper STT)" status={stageStatus('transcribing')} />
        <StageStep
          label={
            isActive && stage === 'translating' && currentLang
              ? `다국어 번역 중 — ${currentLang.toUpperCase()} (${completedLangs.length}/${totalLangs})`
              : '다국어 번역 (Gemini · OpenRouter 폴백)'
          }
          status={stageStatus('translating')}
        />
        <StageStep
          label={
            isActive && stage === 'uploading' && currentLang
              ? `Storage 저장 — ${currentLang}.vtt`
              : 'Storage 저장'
          }
          status={stageStatus('uploading')}
        />
        <StageStep label="DB 자막 등록" status={stageStatus('registering')} />
      </div>

      {/* 진행 바 */}
      {(isActive || isDone) && totalLangs > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-text-muted flex items-center gap-1">
              <Languages size={10} /> 언어 처리 현황
            </span>
            <span className="text-gold font-bold tabular-nums">{percent}%</span>
          </div>
          <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone ? 'bg-emerald-500' : 'bg-gradient-gold'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* 완료 메시지 */}
      {isDone && (
        <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 size={11} />
          {progress.stageLabel}
        </p>
      )}

      {/* 오류 메시지 */}
      {isError && errorMessage && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={11} />
          {errorMessage}
        </p>
      )}

      {/* 재시도 카운터 */}
      {retryCount > 0 && (
        <p className="text-[10px] text-text-muted mt-1">재시도 {retryCount}회</p>
      )}

      {/* 번역 제공자 표시 */}
      {providerUsed && (isActive || isDone) && (
        <p className="text-[10px] text-text-muted mt-1">
          번역 제공자: {providerUsed === 'gemini' ? 'Gemini' : 'OpenRouter (폴백)'}
        </p>
      )}
    </div>
  );
}
