/**
 * FRAMIX AI Auto Subtitle Pipeline — Job Queue Client
 * ────────────────────────────────────────────────────
 * 영상 업로드 완료 → subtitle_jobs 테이블에 INSERT만 수행.
 * 실제 STT/번역/Storage 저장/DB 등록은 전부 서버(Edge Function)에서 처리됨.
 *
 * ⚠️ 이 파일은 브라우저에서 실행됨 — API 키, Whisper/GPT/Gemini 호출 절대 금지.
 * ⚠️ Player, SubtitleEngine, Auth, Membership 등 기존 기능에는 일절 영향 없음.
 */

import { supabase } from './supabase';

// ─── 지원 언어 목록 (요구사항 30개 언어, ko 제외) ──────────────────────────

export const PIPELINE_TARGET_LANGS = [
  'en', 'ja', 'zh', 'zh-tw', 'es', 'hi', 'ar', 'pt-br',
  'fr', 'de', 'id', 'ru', 'tr', 'vi', 'th', 'ms',
  'it', 'nl', 'pl', 'ur', 'bn', 'fa', 'sv', 'da',
  'no', 'ro', 'cs', 'el', 'uk', 'hr',
] as const;

export type TargetLang = (typeof PIPELINE_TARGET_LANGS)[number];

// ─── Job 상태 타입 (subtitle_jobs.status와 1:1 매칭) ──────────────────────

export type PipelineStage =
  | 'idle'
  | 'pending'
  | 'transcribing'
  | 'translating'
  | 'uploading'
  | 'registering'
  | 'done'
  | 'error';

export interface PipelineProgress {
  jobId?: string;
  stage: PipelineStage;
  stageLabel: string;
  currentLang?: string | null;
  completedLangs: string[];
  totalLangs: number;
  errorMessage?: string | null;
  retryCount: number;
  providerUsed?: 'gemini' | 'openrouter' | null;
}

export type PipelineProgressCallback = (progress: PipelineProgress) => void;

// ─── Job 등록 ───────────────────────────────────────────────────────────

export interface EnqueueSubtitleJobOptions {
  seriesId: string;
  episodeId: string;       // DB episode row id (UUID)
  episodeNumber: number;   // 로그/표시용
  videoUrl: string;        // Storage public URL (이미 업로드 완료된 영상)
  forceRegenerate?: boolean;
}

/**
 * subtitle_jobs 테이블에 작업을 등록한다.
 * INSERT가 성공하는 즉시 DB 트리거가 Edge Function을 호출해 백그라운드 처리를 시작하므로,
 * 이 함수가 반환된 이후 브라우저를 닫아도 작업은 계속 진행된다.
 */
export async function enqueueSubtitleJob(
  opts: EnqueueSubtitleJobOptions,
): Promise<{ jobId: string }> {
  const { seriesId, episodeId, episodeNumber, videoUrl, forceRegenerate = false } = opts;

  // ── INSERT 전 세션 상태 전체 검증 ────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  console.log(`[subtitlePipeline] ep${episodeNumber} INSERT 전 세션 검증:`);
  console.log(`  1. session 존재:        ${!!session}`);
  console.log(`  2. access_token 존재:   ${!!session?.access_token}`);
  console.log(`  3. user.id 존재:        ${!!session?.user?.id}`);
  console.log(`  4. user.id 값:          ${session?.user?.id ?? '(없음)'}`);
  console.log(`  5. Supabase auth 상태:  ${session ? 'authenticated' : 'anon/unauthenticated'}`);
  console.log(`  6. episode_id:          ${episodeId}`);
  console.log(`  7. series_id:           ${seriesId}`);
  console.log(`  8. video_url 길이:      ${videoUrl?.length ?? 0}`);

  if (!session) {
    throw new Error('subtitle_jobs INSERT 실패: 로그인 세션 없음 — authenticated 권한 필요');
  }
  if (!session.access_token) {
    throw new Error('subtitle_jobs INSERT 실패: access_token 없음 — 세션 재인증 필요');
  }

  const { data, error } = await supabase
    .from('subtitle_jobs')
    .insert({
      series_id: seriesId,
      episode_id: episodeId,
      episode_number: episodeNumber,
      video_url: videoUrl,
      target_langs: [...PIPELINE_TARGET_LANGS],
      force_regenerate: forceRegenerate,
    })
    .select('id')
    .single();

  if (error || !data) {
    // INSERT 실패 원인 상세 출력
    console.error('[subtitlePipeline] subtitle_jobs INSERT 실패 상세:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      session_uid: session.user.id,
      episode_id: episodeId,
      series_id: seriesId,
    });
    throw new Error(
      `자막 작업 등록 실패 [ep${episodeNumber}]: ${error?.message ?? 'unknown error'}` +
      (error?.hint ? ` (힌트: ${error.hint})` : '') +
      (error?.code ? ` [code: ${error.code}]` : ''),
    );
  }

  console.log(`[subtitlePipeline] ep${episodeNumber} subtitle_jobs INSERT 성공, jobId:`, (data as { id: string }).id);
  return { jobId: (data as { id: string }).id };
}

// ─── Job 상태 조회 (최초 1회 스냅샷, 이후엔 Realtime 구독 사용 권장) ──────

interface SubtitleJobRow {
  id: string;
  status: PipelineStage;
  stage_label: string;
  current_lang: string | null;
  completed_langs: string[];
  target_langs: string[];
  error_message: string | null;
  retry_count: number;
  provider_used: 'gemini' | 'openrouter' | null;
}

function rowToProgress(row: SubtitleJobRow): PipelineProgress {
  return {
    jobId: row.id,
    stage: row.status,
    stageLabel: row.stage_label,
    currentLang: row.current_lang,
    completedLangs: row.completed_langs ?? [],
    totalLangs: (row.target_langs?.length ?? PIPELINE_TARGET_LANGS.length) + 1, // +ko
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    providerUsed: row.provider_used,
  };
}

export async function fetchSubtitleJobProgress(jobId: string): Promise<PipelineProgress | null> {
  const { data, error } = await supabase
    .from('subtitle_jobs')
    .select('id, status, stage_label, current_lang, completed_langs, target_langs, error_message, retry_count, provider_used')
    .eq('id', jobId)
    .single();

  if (error || !data) return null;
  return rowToProgress(data as SubtitleJobRow);
}

/**
 * Realtime 구독: job 행 변경을 실시간으로 onProgress에 전달.
 * 반환된 함수를 호출하면 구독 해제됨 (컴포넌트 unmount 시 cleanup용).
 */
export function subscribeSubtitleJob(
  jobId: string,
  onProgress: PipelineProgressCallback,
): () => void {
  const channel = supabase
    .channel(`subtitle_job:${jobId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'subtitle_jobs', filter: `id=eq.${jobId}` },
      (payload) => {
        const row = payload.new as SubtitleJobRow;
        onProgress(rowToProgress(row));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 특정 시리즈의 진행 중인(미완료) job들을 episode_id 기준 맵으로 조회.
 * CMS 진입 시(새로고침 후에도) 진행 중인 파이프라인 상태를 복구하는 데 사용.
 */
export async function fetchActiveJobsBySeriesId(
  seriesId: string,
): Promise<Record<string, PipelineProgress>> {
  const { data, error } = await supabase
    .from('subtitle_jobs')
    .select('id, episode_id, status, stage_label, current_lang, completed_langs, target_langs, error_message, retry_count, provider_used')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error || !data) return {};

  const map: Record<string, PipelineProgress> = {};
  for (const row of data as (SubtitleJobRow & { episode_id: string })[]) {
    // 에피소드당 최신 job만 유지 (이미 정렬되어 있으므로 첫 발견 값 사용)
    if (!map[row.episode_id]) {
      map[row.episode_id] = rowToProgress(row);
    }
  }
  return map;
}
