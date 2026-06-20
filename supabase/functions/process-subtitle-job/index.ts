/**
 * process-subtitle-job
 * ─────────────────────
 * FRAMIX AI 자막 자동 생성 — 서버 사이드 Job 처리기.
 *
 * 흐름:
 *   STEP05 FUNCTION START
 *   STEP06 AUTH CHECK
 *   STEP07 JOB LOAD
 *   STEP08 VIDEO DOWNLOAD
 *   STEP09 STT START / STEP10 STT END
 *   STEP11 TRANSLATE START / STEP12 TRANSLATE END
 *   STEP13 STORAGE UPLOAD
 *   STEP14 EPISODES UPDATE
 *   STEP15 DONE
 *
 * 추적 시스템:
 *   - 함수 진입 즉시(인증 체크 이전)부터 subtitle_function_calls 에 1행 기록.
 *   - job 단위 진행 상황은 subtitle_jobs.last_step / debug_log / error_message 에 누적 기록.
 *   - 모든 throw / catch / early return 지점에서 위 두 테이블 중 하나(또는 둘 다) 갱신.
 *   - 원인 추측 없이 "어디서 멈췄는지"만 SQL 조회로 100% 드러나는 것이 목표.
 *
 * 보안: 브라우저에서 호출 불가. DB 트리거(x-job-trigger-secret) 또는
 *       CMS 관리자 세션(Authorization 헤더, service_role 검증)을 통해서만 실행됨.
 * 모든 API 키(GROQ/GEMINI/OPENROUTER)는 Edge Function 환경변수에만 존재 —
 * 브라우저에는 절대 노출되지 않음.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.108.1';
import { transcribeWithGroqWhisper } from '../_shared/whisper.ts';
import { translateVtt } from '../_shared/translate.ts';
import { PIPELINE_TARGET_LANGS } from '../_shared/langs.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const JOB_TRIGGER_SECRET = Deno.env.get('SUBTITLE_JOB_TRIGGER_SECRET') ?? '';
const SUBTITLES_BUCKET = 'subtitles';

interface SubtitleJob {
  id: string;
  series_id: string;
  episode_id: string;
  episode_number: number;
  video_url: string;
  status: string;
  target_langs: string[];
  completed_langs: string[];
  subtitle_map: Record<string, string>;
  retry_count: number;
  max_retries: number;
  force_regenerate: boolean;
  debug_log?: string | null;
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-job-trigger-secret',
  };
}

// ─── 디버그 로그 한 줄 포맷 ──────────────────────────────────────────────
function logLine(step: string, status: 'OK' | 'FAIL', message: string): string {
  return `[${new Date().toISOString()}] ${step} ${status} ${message}`;
}

// ─── subtitle_function_calls: 함수 진입 자체를 기록 (job row와 무관) ────
// db 가 아직 없을 수도 있으므로(SUPABASE_URL/SERVICE_ROLE_KEY 미설정 시)
// 별도 client 인자를 받는다.
async function recordFunctionCall(
  db: SupabaseClient | null,
  payload: unknown,
  result: string,
  error?: string,
): Promise<void> {
  if (!db) {
    console.error('[process-subtitle-job] subtitle_function_calls 기록 불가 (db client 없음):', { payload, result, error });
    return;
  }
  try {
    const { error: insertErr } = await db.from('subtitle_function_calls').insert({
      payload: payload ?? null,
      result,
      error: error ?? null,
    });
    if (insertErr) {
      console.error('[process-subtitle-job] subtitle_function_calls INSERT 실패:', insertErr.message);
    }
  } catch (e) {
    console.error('[process-subtitle-job] subtitle_function_calls INSERT 예외:', (e as Error).message);
  }
}

// ─── subtitle_jobs.debug_log 누적 + last_step 갱신 ──────────────────────
async function appendStep(
  db: SupabaseClient,
  jobId: string,
  step: string,
  status: 'OK' | 'FAIL',
  message: string,
  extraPatch: Record<string, unknown> = {},
): Promise<void> {
  const line = logLine(step, status, message);
  try {
    const { data: current, error: selErr } = await db
      .from('subtitle_jobs')
      .select('debug_log')
      .eq('id', jobId)
      .single();

    const prevLog = !selErr ? ((current?.debug_log as string | null) ?? '') : '';
    const nextLog = prevLog ? `${prevLog}\n${line}` : line;

    const { error: updErr } = await db
      .from('subtitle_jobs')
      .update({ debug_log: nextLog, last_step: step, ...extraPatch })
      .eq('id', jobId);

    if (updErr) {
      console.error(`[process-subtitle-job] job ${jobId} STEP 기록 실패 (${step}):`, updErr.message);
    }
  } catch (e) {
    console.error(`[process-subtitle-job] job ${jobId} STEP 기록 예외 (${step}):`, (e as Error).message);
  }
}

async function updateJob(
  db: SupabaseClient,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from('subtitle_jobs').update(patch).eq('id', jobId);
  if (error) console.error(`[process-subtitle-job] job ${jobId} 업데이트 실패:`, error.message);
}

async function downloadVideo(db: SupabaseClient, videoUrl: string): Promise<{ blob: Blob; fileName: string }> {
  // video_url은 public URL이므로 직접 fetch (대용량 영상이라 fetch 스트리밍 사용)
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`영상 다운로드 실패 (${res.status}): ${videoUrl}`);
  const blob = await res.blob();
  const fileName = videoUrl.split('/').pop() ?? 'video.mp4';
  return { blob, fileName };
}

async function uploadVttToStorage(
  db: SupabaseClient,
  seriesId: string,
  episodeId: string,
  lang: string,
  vttContent: string,
): Promise<string> {
  const path = `${seriesId}/${episodeId}/${lang}.vtt`;
  const blob = new Blob([vttContent], { type: 'text/vtt' });

  const { error } = await db.storage
    .from(SUBTITLES_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'text/vtt' });

  if (error) throw new Error(`Storage 저장 실패 [${lang}]: ${error.message}`);

  const { data } = db.storage.from(SUBTITLES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function processJob(db: SupabaseClient, job: SubtitleJob): Promise<void> {
  const allTargetLangs = job.target_langs.length > 0 ? job.target_langs : [...PIPELINE_TARGET_LANGS];

  // ── STEP07 JOB LOAD 완료 표시 (job 자체는 이미 호출부에서 로드됨) ──────
  await appendStep(db, job.id, 'STEP07_JOB_LOAD', 'OK', `job 로드 완료 episode_id=${job.episode_id}`);

  await updateJob(db, job.id, {
    status: 'transcribing',
    stage_label: '한국어 자막 생성 중 (Groq Whisper STT)',
    current_lang: 'ko',
    started_at: new Date().toISOString(),
  });

  // ── 1. 기존 자막 존재 확인 (중복 방지) ──────────────────────────────
  if (!job.force_regenerate) {
    const { data: epRow, error: epSelErr } = await db
      .from('episodes')
      .select('subtitles')
      .eq('id', job.episode_id)
      .single();

    if (epSelErr) {
      await appendStep(db, job.id, 'STEP07_JOB_LOAD', 'FAIL', `기존 자막 확인용 episodes SELECT 실패: ${epSelErr.message}`);
    }

    const existing = (epRow?.subtitles as Record<string, string> | null) ?? {};
    if (Object.keys(existing).length > 0) {
      await appendStep(db, job.id, 'STEP15_DONE', 'OK', `기존 자막 재사용 (${Object.keys(existing).length}개 언어) — 조기 종료`);
      await updateJob(db, job.id, {
        status: 'done',
        stage_label: `기존 자막 재사용 (${Object.keys(existing).length}개 언어)`,
        completed_langs: Object.keys(existing),
        subtitle_map: existing,
        completed_at: new Date().toISOString(),
      });
      return;
    }
  }

  // ── 2. 영상 다운로드 ────────────────────────────────────────────────
  await appendStep(db, job.id, 'STEP08_VIDEO_DOWNLOAD', 'OK', `다운로드 시도: ${job.video_url}`);
  let videoBlob: Blob;
  let fileName: string;
  try {
    const result = await downloadVideo(db, job.video_url);
    videoBlob = result.blob;
    fileName = result.fileName;
    await appendStep(db, job.id, 'STEP08_VIDEO_DOWNLOAD', 'OK', `다운로드 완료 size=${videoBlob.size} fileName=${fileName}`);
  } catch (err) {
    const msg = (err as Error).message;
    await appendStep(db, job.id, 'STEP08_VIDEO_DOWNLOAD', 'FAIL', msg);
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `STEP08_VIDEO_DOWNLOAD 실패: ${msg}`,
      last_step: 'STEP08_VIDEO_DOWNLOAD',
    });
    return;
  }

  // ── 3. Groq Whisper STT (한국어) ───────────────────────────────────
  await appendStep(db, job.id, 'STEP09_STT_START', 'OK', 'Groq Whisper STT 호출 시작');
  let koVtt: string;
  try {
    koVtt = await transcribeWithGroqWhisper(videoBlob, fileName);
    await appendStep(db, job.id, 'STEP10_STT_END', 'OK', `STT 완료, VTT 길이=${koVtt.length}`);
  } catch (err) {
    const msg = (err as Error).message;
    await appendStep(db, job.id, 'STEP10_STT_END', 'FAIL', msg);
    const newRetryCount = job.retry_count + 1;
    if (newRetryCount < job.max_retries) {
      await updateJob(db, job.id, {
        status: 'pending',
        retry_count: newRetryCount,
        error_message: `STEP09/10_STT 실패 (재시도 예정 ${newRetryCount}/${job.max_retries}): ${msg}`,
        last_step: 'STEP10_STT_END',
      });
      return;
    }
    await updateJob(db, job.id, {
      status: 'error',
      retry_count: newRetryCount,
      error_message: `STEP09/10_STT 최종 실패: ${msg}`,
      last_step: 'STEP10_STT_END',
    });
    return;
  }

  const completedLangs: string[] = [];
  const subtitleMap: Record<string, string> = {};

  // ── 4. 한국어 VTT Storage 저장 ─────────────────────────────────────
  await appendStep(db, job.id, 'STEP13_STORAGE_UPLOAD', 'OK', 'ko VTT Storage 업로드 시작');
  await updateJob(db, job.id, {
    status: 'uploading',
    stage_label: 'Storage 저장 중',
    current_lang: 'ko',
  });
  try {
    const koUrl = await uploadVttToStorage(db, job.series_id, job.episode_id, 'ko', koVtt);
    subtitleMap.ko = koUrl;
    completedLangs.push('ko');
    await appendStep(db, job.id, 'STEP13_STORAGE_UPLOAD', 'OK', `ko VTT 업로드 완료: ${koUrl}`);
  } catch (err) {
    const msg = (err as Error).message;
    await appendStep(db, job.id, 'STEP13_STORAGE_UPLOAD', 'FAIL', `ko VTT 업로드 실패: ${msg}`);
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `STEP13_STORAGE_UPLOAD(ko) 실패: ${msg}`,
      last_step: 'STEP13_STORAGE_UPLOAD',
    });
    return;
  }

  await updateJob(db, job.id, {
    completed_langs: completedLangs,
    subtitle_map: subtitleMap,
  });

  // ── 5. 대상 언어별 번역 + 업로드 (순차 처리, 단일 언어 실패는 스킵) ───
  let jobRetryCount = job.retry_count;

  for (const lang of allTargetLangs) {
    await updateJob(db, job.id, {
      status: 'translating',
      stage_label: '다국어 자막 번역 중 (Gemini / OpenRouter)',
      current_lang: lang,
    });

    await appendStep(db, job.id, 'STEP11_TRANSLATE_START', 'OK', `${lang} 번역 시작`);

    let langVtt: string;
    let provider: string;
    try {
      const result = await translateVtt(koVtt, lang);
      langVtt = result.vtt;
      provider = result.provider;
      await appendStep(db, job.id, 'STEP12_TRANSLATE_END', 'OK', `${lang} 번역 완료 (provider=${provider})`);
    } catch (err) {
      jobRetryCount++;
      const msg = (err as Error).message;
      console.error(`[process-subtitle-job] ${lang} 번역 최종 실패, 스킵:`, msg);
      await appendStep(db, job.id, 'STEP12_TRANSLATE_END', 'FAIL', `${lang} 번역 실패(스킵): ${msg}`);
      await updateJob(db, job.id, {
        retry_count: jobRetryCount,
        error_message: `STEP11/12_TRANSLATE(${lang}) 실패(스킵): ${msg}`,
      });
      continue;
    }

    await updateJob(db, job.id, {
      status: 'uploading',
      stage_label: `Storage 저장 중 — ${lang}.vtt`,
      current_lang: lang,
      provider_used: provider,
    });

    try {
      const url = await uploadVttToStorage(db, job.series_id, job.episode_id, lang, langVtt);
      subtitleMap[lang] = url;
      completedLangs.push(lang);
      await appendStep(db, job.id, 'STEP13_STORAGE_UPLOAD', 'OK', `${lang} VTT 업로드 완료: ${url}`);
      await updateJob(db, job.id, {
        completed_langs: completedLangs,
        subtitle_map: subtitleMap,
      });
    } catch (err) {
      jobRetryCount++;
      const msg = (err as Error).message;
      console.error(`[process-subtitle-job] ${lang} Storage 저장 실패, 스킵:`, msg);
      await appendStep(db, job.id, 'STEP13_STORAGE_UPLOAD', 'FAIL', `${lang} VTT 업로드 실패(스킵): ${msg}`);
      await updateJob(db, job.id, { retry_count: jobRetryCount });
    }
  }

  // ── 6. episodes.subtitles 등록 (기존 값과 병합) ────────────────────
  await appendStep(db, job.id, 'STEP14_EPISODES_UPDATE', 'OK', `episodes.subtitles 갱신 시도, langs=${completedLangs.join(',')}`);
  await updateJob(db, job.id, {
    status: 'registering',
    stage_label: 'DB 등록 중',
    current_lang: null,
  });

  try {
    const { data: epRow, error: epSelErr } = await db
      .from('episodes')
      .select('subtitles')
      .eq('id', job.episode_id)
      .single();

    if (epSelErr) throw new Error(`episodes SELECT 실패: ${epSelErr.message}`);

    const existing = (epRow?.subtitles as Record<string, string> | null) ?? {};
    const merged = { ...existing, ...subtitleMap };

    const { error } = await db
      .from('episodes')
      .update({ subtitles: merged })
      .eq('id', job.episode_id);

    if (error) throw new Error(error.message);

    await appendStep(db, job.id, 'STEP14_EPISODES_UPDATE', 'OK', `episodes.subtitles 갱신 완료, 최종 langs=${Object.keys(merged).join(',')}`);
  } catch (err) {
    const msg = (err as Error).message;
    await appendStep(db, job.id, 'STEP14_EPISODES_UPDATE', 'FAIL', msg);
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `STEP14_EPISODES_UPDATE 실패: ${msg}`,
      last_step: 'STEP14_EPISODES_UPDATE',
    });
    return;
  }

  // ── 7. 완료 ─────────────────────────────────────────────────────────
  await appendStep(db, job.id, 'STEP15_DONE', 'OK', `완료 — ${completedLangs.length}개 언어 자막 생성됨`);
  await updateJob(db, job.id, {
    status: 'done',
    stage_label: `완료 — ${completedLangs.length}개 언어 자막 생성됨`,
    completed_langs: completedLangs,
    subtitle_map: subtitleMap,
    retry_count: jobRetryCount,
    completed_at: new Date().toISOString(),
  });
}

Deno.serve(async (req: Request) => {
  // ── STEP05 FUNCTION START ───────────────────────────────────────────
  // db client는 SUPABASE_URL/SERVICE_ROLE_KEY 확인 후 생성되므로,
  // 그 이전 단계의 함수 진입 기록은 일단 null client로 시도하고
  // (콘솔에만 남을 수 있음), 아래에서 client 생성 후 다시 기록한다.
  console.log('[process-subtitle-job] STEP05_FUNCTION_START');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // db client를 가능한 한 일찍 만들어 STEP05 기록부터 DB에 남긴다.
  let earlyDb: SupabaseClient | null = null;
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    earlyDb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  }

  let rawBody: unknown = null;
  try {
    rawBody = await req.clone().json();
  } catch {
    rawBody = null;
  }

  await recordFunctionCall(earlyDb, rawBody, 'STEP05_FUNCTION_START');

  // ── STEP06 AUTH CHECK ───────────────────────────────────────────────
  const triggerSecret = req.headers.get('x-job-trigger-secret');
  const authHeader = req.headers.get('authorization');

  const isTrustedTrigger = JOB_TRIGGER_SECRET !== '' && triggerSecret === JOB_TRIGGER_SECRET;
  const hasAuthHeader = authHeader !== null && authHeader.startsWith('Bearer ');

  if (!isTrustedTrigger && !hasAuthHeader) {
    await recordFunctionCall(earlyDb, rawBody, 'STEP06_AUTH_CHECK_FAIL', 'unauthorized: no valid trigger secret or bearer token');
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  await recordFunctionCall(earlyDb, rawBody, 'STEP06_AUTH_CHECK_OK');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    await recordFunctionCall(
      earlyDb,
      rawBody,
      'STEP06_ENV_MISSING',
      `SUPABASE_URL 존재=${!!SUPABASE_URL}, SERVICE_ROLE_KEY 존재=${!!SERVICE_ROLE_KEY}`,
    );
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정' }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }

  // service_role 클라이언트 — RLS 우회, 브라우저에는 절대 노출되지 않음
  const db = earlyDb ?? createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let jobId: string | undefined;
  try {
    const body = rawBody as { job_id?: string } | null;
    jobId = body?.job_id;
  } catch {
    jobId = undefined;
  }

  // ── STEP07 JOB LOAD ─────────────────────────────────────────────────
  let job: SubtitleJob | null;

  if (jobId) {
    const { data, error } = await db.from('subtitle_jobs').select('*').eq('id', jobId).single();
    if (error || !data) {
      await recordFunctionCall(db, rawBody, 'STEP07_JOB_LOAD_FAIL', `job ${jobId} 조회 실패: ${error?.message}`);
      return new Response(JSON.stringify({ error: `job ${jobId} 조회 실패` }), {
        status: 404,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }
    job = data as SubtitleJob;
  } else {
    // job_id 미지정 시: 가장 최근에 INSERT된 pending job 1건 처리
    // (클라이언트 직접 invoke 경로 — 업로드 직후 호출되는 job이 항상 최신이므로
    //  created_at desc 로 가져와야 방금 등록된 job을 즉시 처리한다)
    const { data, error } = await db
      .from('subtitle_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      await recordFunctionCall(db, rawBody, 'STEP07_JOB_LOAD_FAIL', `최신 pending job 조회 실패: ${error.message}`);
    }
    job = data as SubtitleJob | null;
  }

  if (!job) {
    await recordFunctionCall(db, rawBody, 'STEP07_JOB_LOAD_EMPTY', '처리할 pending job 없음');
    return new Response(JSON.stringify({ message: '처리할 job 없음' }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  await recordFunctionCall(db, rawBody, 'STEP07_JOB_LOAD_OK', `job_id=${job.id} status=${job.status}`);

  if (job.status === 'done') {
    await appendStep(db, job.id, 'STEP07_JOB_LOAD', 'OK', '이미 완료된 job — 조기 종료');
    return new Response(JSON.stringify({ message: '이미 완료된 job' }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  try {
    await processJob(db, job);
    await recordFunctionCall(db, rawBody, 'STEP15_DONE', `job_id=${job.id} 처리 완료`);
    return new Response(JSON.stringify({ message: 'ok', job_id: job.id }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[process-subtitle-job] job ${job.id} 처리 중 예외:`, err);
    await appendStep(db, job.id, 'STEP15_DONE', 'FAIL', `처리 중 미포착 예외: ${msg}`);
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `처리 중 예외: ${msg}`,
    });
    await recordFunctionCall(db, rawBody, 'STEP15_FAIL', `job_id=${job.id}`, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
});
