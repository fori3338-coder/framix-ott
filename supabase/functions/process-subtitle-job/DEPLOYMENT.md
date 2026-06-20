# AI 자막 자동 생성 — Job Queue 배포 가이드

이 문서는 `subtitle_jobs` 백그라운드 파이프라인을 실제 운영 환경에 연결하기 위한
1회성 설정 절차입니다. 코드 자체는 이미 완성되어 있으며, 아래 단계는 Supabase
프로젝트 측 설정(시크릿/마이그레이션 적용)만 다룹니다.

## 1. 마이그레이션 적용

```bash
supabase db push
# 또는 supabase/migrations/010_subtitle_jobs.sql 을 SQL Editor에서 직접 실행
```

## 2. Edge Function 배포

```bash
supabase functions deploy process-subtitle-job --no-verify-jwt
```

`--no-verify-jwt`를 사용하는 이유: 이 함수는 DB 트리거(pg_net)에서도 호출되며,
자체적으로 `x-job-trigger-secret` 헤더 또는 관리자 `Authorization` 헤더로
인증을 검증합니다 (코드 내부 인증 로직 참고).

## 3. Edge Function 환경변수 (Secrets)

```bash
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set OPENROUTER_API_KEY=sk-or-...
supabase secrets set SUBTITLE_JOB_TRIGGER_SECRET=<임의의 긴 랜덤 문자열>

# 아래 두 값은 Supabase가 Edge Function에 기본 제공하므로 보통 별도 설정 불필요:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

- **GROQ_API_KEY**: Groq Console에서 발급 (Whisper STT 호스팅 API, OpenAI 호환).
- **GEMINI_API_KEY**: Google AI Studio에서 발급 (Gemini Free Tier, 1차 번역 제공자).
- **OPENROUTER_API_KEY**: OpenRouter에서 발급 (Gemini 실패/한도초과 시 폴백 번역).
- **SUBTITLE_JOB_TRIGGER_SECRET**: DB 트리거가 Edge Function을 호출할 때 사용하는
  공유 시크릿. 아무 값이나 생성해도 무방하나, 외부에 노출되지 않도록 주의.

## 4. DB 설정값 등록 (pg_net 트리거가 사용)

SQL Editor에서 1회 실행:

```sql
ALTER DATABASE postgres SET app.edge_function_base_url =
  'https://<your-project-ref>.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.edge_function_secret = '<3번에서 설정한 SUBTITLE_JOB_TRIGGER_SECRET과 동일한 값>';
```

설정하지 않으면 job은 INSERT는 되지만 자동 트리거되지 않습니다 — 이 경우
`010_subtitle_jobs.sql`에 포함된 5분 간격 `pg_cron` 폴링이 안전망으로 동작하거나
(pg_cron 확장이 활성화된 경우), CMS에서 수동으로 Edge Function을 호출해야 합니다.

## 5. pg_net / pg_cron 확장 확인

```sql
-- 둘 다 Supabase 대시보드 > Database > Extensions 에서 활성화 가능
-- pg_net: 필수 (DB 트리거가 Edge Function을 호출하기 위함)
-- pg_cron: 선택 (안전망 폴링용, 없어도 핵심 기능은 동작)
```

## 6. 동작 확인

CMS(ContentUpload)에서 영상 업로드 후 콘텐츠 등록 시:
1. `subtitle_jobs`에 `status='pending'` 행이 INSERT됨
2. DB 트리거가 즉시 `process-subtitle-job` 호출
3. CMS 화면에서 `SubtitlePipelineStatus`가 Realtime으로 진행 상태 표시
4. 완료 시 `episodes.subtitles`에 언어별 VTT URL이 병합 등록됨

Supabase 대시보드 > Edge Functions > Logs 에서 처리 로그를 확인할 수 있습니다.

## 알려진 제약 사항 / 후속 작업 권장 사항

- 영상 다운로드는 Edge Function 내에서 `fetch(video_url)`로 전체를 메모리에 로드합니다.
  Edge Function 메모리/시간 제한을 고려할 때, 매우 긴 영상(예: 1시간 이상)에서는
  실패할 수 있습니다. 짧은 숏폼 드라마(에피소드당 수 분 내외) 기준으로 설계되었습니다.
  더 긴 영상을 다뤄야 한다면 청크 분할 업로드 또는 별도 트랜스코딩 단계 추가를 권장합니다.
- Gemini Free Tier는 분당/일당 요청 한도가 있습니다. 동시에 여러 에피소드가 큐에
  쌓이는 경우 OpenRouter 폴백 호출 빈도가 높아질 수 있으니 OpenRouter 크레딧을
  미리 확보해두는 것을 권장합니다.
- `ContentUpload.tsx`의 `episodes` INSERT 페이로드에 `description: ep.title`이
  포함되어 있으나, `episodes` 테이블에는 `description` 컬럼이 존재하지 않습니다
  (`description`은 `series` 테이블에만 존재). 이는 본 작업 범위 밖의 기존 코드이므로
  손대지 않았습니다 — INSERT 시 Supabase가 알 수 없는 컬럼을 무시하는지, 혹은
  에러를 반환하는지 별도 확인이 필요합니다.
