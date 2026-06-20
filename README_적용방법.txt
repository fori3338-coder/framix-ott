[FRAMIX 자막 시스템 — 실제 차단 지점 수정]

실패 지점 (1개):
src/pages/admin/ContentUpload.tsx
handleSubmit() 함수, episodes INSERT 부분 (구버전 기준 398~411번 줄)

원인:
episodes 테이블 INSERT 페이로드에 description 필드가 포함되어 있었음.
episodes 테이블 실제 스키마(supabase/migrations/001_init.sql)에는
description 컬럼이 존재하지 않음 (description은 series 테이블에만 존재).

PostgREST는 스키마에 없는 컬럼이 INSERT 바디에 포함되면 해당 필드만
무시하지 않고 요청 전체를 400 Bad Request(PGRST204)로 거부함.
따라서 episodes INSERT가 항상 실패 → epErr 발생 → throw →
같은 루프 반복(iteration) 안에 있는 triggerSubtitlePipeline() 호출
(enqueueSubtitleJob, functions.invoke('process-subtitle-job') 포함)이
전혀 실행되지 못함.

이전에 적용했던 모든 수정(Trigger, Secret, JWT, base_url, Force Fix —
직접 invoke, process-subtitle-job 최신 pending 처리)은 전부 코드상
정상이었으나, 그 앞 단계에서 이미 episodes INSERT가 막혀 있었기
때문에 어떤 수정도 효과가 없었던 것임.

수정 내용:
episodes INSERT 페이로드에서 description 필드 제거.
(series INSERT의 description 필드는 정상 컬럼이므로 그대로 유지)

적용 방법:
1. 이 파일로 기존 src/pages/admin/ContentUpload.tsx 교체.
2. 재배포.
3. 콘텐츠 등록 시 episodes INSERT가 정상적으로 성공하고,
   이어서 enqueueSubtitleJob → functions.invoke('process-subtitle-job')
   → STT → 번역 → Storage 업로드 → episodes.subtitles UPDATE →
   Player 송출까지 정상 진행됨.
