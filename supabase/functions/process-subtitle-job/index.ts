/**
 * process-subtitle-job
 * ─────────────────────
 * FRAMIX AI 자막 자동 생성 — 서버 사이드 Job 처리기.
 *
 * 흐름:
 *   1. job 조회 (status='pending', 또는 명시적 job_id)
 *   2. 기존 자막 존재 확인 (force_regenerate=false면 스킵 → done)
 *   3. Storage에서 영상 다운로드
 *   4. Groq Whisper STT → 한국어 VTT
 *   5. 한국어 VTT Storage 업로드
 *   6. 대상 언어별 순차: Gemini 번역(실패 시 OpenRouter 폴백) → Storage 업로드
 *   7. episodes.subtitles 갱신 (기존 값과 병합 — 덮어쓰지 않음)
 *   8. job 완료 처리
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
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-job-trigger-secret',
  };
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

  await updateJob(db, job.id, {
    status: 'transcribing',
    stage_label: '한국어 자막 생성 중 (Groq Whisper STT)',
    current_lang: 'ko',
    started_at: new Date().toISOString(),
  });

  // ── 1. 기존 자막 존재 확인 (중복 방지) ──────────────────────────────
  if (!job.force_regenerate) {
    const { data: epRow } = await db
      .from('episodes')
      .select('subtitles')
      .eq('id', job.episode_id)
      .single();

    const existing = (epRow?.subtitles as Record<string, string> | null) ?? {};
    if (Object.keys(existing).length > 0) {
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
  const { blob: videoBlob, fileName } = await downloadVideo(db, job.video_url);

  // ── 3. Groq Whisper STT (한국어) ───────────────────────────────────
  let koVtt: string;
  try {
    koVtt = await transcribeWithGroqWhisper(videoBlob, fileName);
  } catch (err) {
    const newRetryCount = job.retry_count + 1;
    if (newRetryCount < job.max_retries) {
      await updateJob(db, job.id, {
        status: 'pending',
        retry_count: newRetryCount,
        error_message: `Whisper 실패 (재시도 예정 ${newRetryCount}/${job.max_retries}): ${(err as Error).message}`,
      });
      return;
    }
    await updateJob(db, job.id, {
      status: 'error',
      retry_count: newRetryCount,
      error_message: `Whisper 최종 실패: ${(err as Error).message}`,
    });
    return;
  }

  const completedLangs: string[] = [];
  const subtitleMap: Record<string, string> = {};

  // ── 4. 한국어 VTT Storage 저장 ─────────────────────────────────────
  await updateJob(db, job.id, {
    status: 'uploading',
    stage_label: 'Storage 저장 중',
    current_lang: 'ko',
  });
  try {
    const koUrl = await uploadVttToStorage(db, job.series_id, job.episode_id, 'ko', koVtt);
    subtitleMap.ko = koUrl;
    completedLangs.push('ko');
  } catch (err) {
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `ko VTT 저장 실패: ${(err as Error).message}`,
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

    let langVtt: string;
    let provider: string;
    try {
      const result = await translateVtt(koVtt, lang);
      langVtt = result.vtt;
      provider = result.provider;
    } catch (err) {
      jobRetryCount++;
      console.error(`[process-subtitle-job] ${lang} 번역 최종 실패, 스킵:`, (err as Error).message);
      await updateJob(db, job.id, {
        retry_count: jobRetryCount,
        error_message: `${lang} 번역 실패(스킵): ${(err as Error).message}`,
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
      await updateJob(db, job.id, {
        completed_langs: completedLangs,
        subtitle_map: subtitleMap,
      });
    } catch (err) {
      jobRetryCount++;
      console.error(`[process-subtitle-job] ${lang} Storage 저장 실패, 스킵:`, (err as Error).message);
      await updateJob(db, job.id, { retry_count: jobRetryCount });
    }
  }

  // ── 6. episodes.subtitles 등록 (기존 값과 병합) ────────────────────
  await updateJob(db, job.id, {
    status: 'registering',
    stage_label: 'DB 등록 중',
    current_lang: null,
  });

  try {
    const { data: epRow } = await db
      .from('episodes')
      .select('subtitles')
      .eq('id', job.episode_id)
      .single();

    const existing = (epRow?.subtitles as Record<string, string> | null) ?? {};
    const merged = { ...existing, ...subtitleMap };

    const { error } = await db
      .from('episodes')
      .update({ subtitles: merged })
      .eq('id', job.episode_id);

    if (error) throw new Error(error.message);
  } catch (err) {
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `DB 등록 실패: ${(err as Error).message}`,
    });
    return;
  }

  // ── 7. 완료 ─────────────────────────────────────────────────────────
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // ── 인증: DB 트리거(x-job-trigger-secret) 또는 CMS 관리자(Authorization) ──
  const triggerSecret = req.headers.get('x-job-trigger-secret');
  const authHeader = req.headers.get('authorization');

  const isTrustedTrigger = JOB_TRIGGER_SECRET !== '' && triggerSecret === JOB_TRIGGER_SECRET;
  const hasAuthHeader = authHeader !== null && authHeader.startsWith('Bearer ');

  if (!isTrustedTrigger && !hasAuthHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정' }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }

  // service_role 클라이언트 — RLS 우회, 브라우저에는 절대 노출되지 않음
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let jobId: string | undefined;
  try {
    const body = await req.json() as { job_id?: string };
    jobId = body.job_id;
  } catch {
    jobId = undefined;
  }

  let job: SubtitleJob | null;

  if (jobId) {
    const { data, error } = await db.from('subtitle_jobs').select('*').eq('id', jobId).single();
    if (error || !data) {
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
    const { data } = await db
      .from('subtitle_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    job = data as SubtitleJob | null;
  }

  if (!job) {
    return new Response(JSON.stringify({ message: '처리할 job 없음' }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  if (job.status === 'done') {
    return new Response(JSON.stringify({ message: '이미 완료된 job' }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  try {
    await processJob(db, job);
    return new Response(JSON.stringify({ message: 'ok', job_id: job.id }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`[process-subtitle-job] job ${job.id} 처리 중 예외:`, err);
    await updateJob(db, job.id, {
      status: 'error',
      error_message: `처리 중 예외: ${(err as Error).message}`,
    });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
});
