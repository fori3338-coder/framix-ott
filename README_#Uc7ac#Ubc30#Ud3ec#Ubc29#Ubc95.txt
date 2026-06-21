[FRAMIX 자막 시스템 — 실행 추적(트레이싱) 시스템 적용 가이드]

이 패키지는 원인을 추측하지 않습니다.
실제 실행이 어느 STEP에서 멈췄는지 SQL 조회 한 줄로 100% 보이게 만드는
실행 추적 시스템입니다.

────────────────────────────────────────────────────────
[추가 테이블]
────────────────────────────────────────────────────────
1. subtitle_function_calls
   - id, created_at, payload(jsonb), result(text), error(text)
   - process-subtitle-job Edge Function 진입 자체(STEP05~07) 기록
   - ContentUpload.tsx의 STEP01(series insert), STEP02(episode insert)
     실패/성공도 이 테이블에 기록 (job 행이 아직 없는 단계이므로)

────────────────────────────────────────────────────────
[추가 컬럼]
────────────────────────────────────────────────────────
subtitle_jobs 테이블:
  - debug_log text NOT NULL DEFAULT ''
    → STEP03~STEP15 전체 로그가 시간순으로 누적된 텍스트
  - last_step text
    → 가장 최근에 도달한 STEP 코드 (예: STEP09_STT_START)
    → 이 값이 "어디서 멈췄는지"를 바로 보여줌

────────────────────────────────────────────────────────
[추가 뷰]
────────────────────────────────────────────────────────
- subtitle_jobs_trace
    : subtitle_jobs 의 last_step/error_message/debug_log를 최신순 정렬
- subtitle_pipeline_full_trace  (이번 패키지에서 신규 추가)
    : STEP01/02(PRE_JOB, subtitle_function_calls 기준)와
      STEP03~15(JOB, subtitle_jobs 기준)를 하나의 타임라인으로 합쳐
      "가장 최근 행 1개"만 봐도 전체 파이프라인 중 어디서 멈췄는지 확인 가능

────────────────────────────────────────────────────────
[수정 파일 목록]
────────────────────────────────────────────────────────
1. supabase/migrations/014_subtitle_debug_tracing.sql
   - (기존 ZIP에 이미 포함되어 있던 추적 테이블/컬럼/STEP01~15 인프라.
      참고용으로 동봉, 내용 변경 없음)

2. supabase/migrations/015_subtitle_function_calls_client_insert.sql  [신규]
   - subtitle_function_calls 에 authenticated INSERT 정책 추가.
     (기존 014는 SELECT 정책만 있어 클라이언트가 STEP01/02를
      직접 기록하려 해도 RLS에 막혀 조용히 실패하는 사각지대가 있었음)
   - subtitle_pipeline_full_trace 통합 조회 뷰 추가.

3. src/lib/subtitlePipeline.ts  [수정]
   - recordClientFunctionCall() 함수 추가.
     subtitle_jobs 행이 없는 단계(STEP01/02)의 성공/실패를
     subtitle_function_calls 에 직접 기록하는 클라이언트 헬퍼.

4. src/pages/admin/ContentUpload.tsx  [수정]
   - recordClientFunctionCall import 추가.
   - STEP01_SERIES_INSERT 성공/실패 시 DB 기록 호출 추가.
   - STEP02_EPISODE_INSERT 성공/실패 시 DB 기록 호출 추가.
   - STEP03/STEP04는 기존 ZIP에 이미 구현되어 있었음 (변경 없음).

5. supabase/functions/process-subtitle-job/index.ts
   - (기존 ZIP에 이미 STEP05~STEP15 전 구간이 완전히 구현되어 있었음.
      참고용으로 동봉, 내용 변경 없음)

────────────────────────────────────────────────────────
[재배포 방법]
────────────────────────────────────────────────────────
1. 마이그레이션 적용:
   supabase db push
   (또는 SQL Editor에서 015_subtitle_function_calls_client_insert.sql
    내용을 직접 실행 — 014는 이미 적용되어 있다면 스킵)

2. 클라이언트 파일 교체:
   - src/lib/subtitlePipeline.ts
   - src/pages/admin/ContentUpload.tsx
   교체 후 평소 빌드/배포 절차대로 재배포 (npm run build → Cloudflare Pages 등)

3. Edge Function은 이번 패키지에서 변경하지 않았으므로 재배포 불필요.
   (이미 STEP05~15 추적 로직이 구현되어 있는 버전이 배포되어 있어야 함.
    혹시 배포된 버전이 이 추적 로직 이전 버전이라면:
    supabase functions deploy process-subtitle-job --no-verify-jwt)

────────────────────────────────────────────────────────
[사용법 — 어디서 멈췄는지 확인하는 SQL]
────────────────────────────────────────────────────────
콘텐츠 등록을 한 번 시도한 직후, SQL Editor에서 아래 한 줄만 실행:

   SELECT * FROM public.subtitle_pipeline_full_trace LIMIT 20;

- 결과가 비어 있다면: STEP01(series insert) 자체가 시도되지 않은 것
  (브라우저 콘솔 / 네트워크 탭 확인 필요 — 코드 진입 자체가 안 된 상태)
- 가장 최근 행의 step 이 STEP02_EPISODE_INSERT, result=FAIL 이라면:
  episodes INSERT가 막힌 것 (message 컬럼에 정확한 사유 표시)
- 가장 최근 행의 step 이 STEP05_FUNCTION_START 뿐이고 STEP06이 없다면:
  Edge Function이 호출은 됐으나 그 직후 어딘가에서 멈춘 것
- 가장 최근 행의 step 이 STEP06_AUTH_CHECK_FAIL 이라면:
  인증 실패 (message 컬럼에 사유 표시)
- 가장 최근 행의 step 이 STEP08_VIDEO_DOWNLOAD, result=FAIL 이라면:
  영상 다운로드 실패 (message 컬럼에 HTTP 상태/URL 표시)
- 가장 최근 행의 step 이 STEP09_STT_START 이고 STEP10이 없다면:
  Groq Whisper STT 호출 중 멈춘 것 (타임아웃 또는 무응답)
- 가장 최근 행의 step 이 STEP15_DONE, result=done 이라면:
  파이프라인 전체 성공

특정 job 하나만 더 자세히 보고 싶다면:

   SELECT last_step, status, error_message, debug_log
   FROM public.subtitle_jobs
   ORDER BY created_at DESC LIMIT 1;

debug_log 컬럼에 해당 job의 모든 STEP이 시간순으로 줄바꿈 구분되어
누적되어 있으므로, 이 한 컬럼만 봐도 전체 실행 타임라인이 보입니다.
