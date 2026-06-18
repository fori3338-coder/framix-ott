# FRAMIX — Premium Korean Short Drama OTT Platform

Netflix/Disney+ 스타일의 다크 골드 테마 프리미엄 쇼츠 드라마 OTT 플랫폼 UI입니다.
React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 기반으로 제작되었으며,
모바일 퍼스트(Mobile First) 반응형으로 구현되었습니다.

## 기술 스택

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4 (`@theme` 기반 디자인 토큰)
- React Router v7
- lucide-react 아이콘

## 실행 방법

```bash
npm install
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드 (tsc + vite build)
npm run preview   # 빌드 결과 미리보기
npm run lint      # ESLint 검사
```

## 디자인 시스템

`src/index.css`의 `@theme` 블록에 모든 디자인 토큰이 정의되어 있습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-base` | `#050505` | 전체 배경 (Dark Black) |
| `--color-gold` | `#D4AF37` | 강조 색상 (Dark Gold) |
| `--color-surface` / `surface-2` / `surface-3` | 회색 계열 | 카드, 패널 배경 |
| `--color-text` / `text-dim` / `text-muted` | 흰색 계열 | 텍스트 위계 |

## 페이지 구조

| 라우트 | 페이지 | 설명 |
| --- | --- | --- |
| `/` | 홈 | 히어로 배너, 이어보기, 트렌딩, 추천, 신작, 장르별 추천 등 |
| `/drama/:id` | 작품 상세 | 시놉시스, 에피소드 목록, 출연/연출, 비슷한 작품 |
| `/watch/:id/:episodeId` | 플레이어 | 쇼츠 스타일 풀스크린 플레이어, 에피소드 드로어, VIP 잠금 |
| `/search` | 검색 | 키워드/장르 필터, 트렌딩·신작 쿼리 파라미터 지원 |
| `/my-list` | 내 보관함 | 찜한 작품 관리 (편집/삭제) |
| `/history` | 시청 기록 | 날짜별 시청 기록, 진행률, 삭제 |
| `/subscription` | 구독 | 베이직/프리미엄/VIP 요금제 비교 |
| `/admin` | 관리자 대시보드 | 통계, 인기 콘텐츠, 빠른 링크 |
| `/admin/upload` | 콘텐츠 업로드 | 작품/에피소드 등록 폼 |

## 데이터

모든 콘텐츠는 `src/data/mockData.ts`의 목 데이터로 구성되어 있으며,
포스터/배경 이미지는 `picsum.photos` placeholder 이미지를 사용합니다.
실제 서비스 연동 시 이 파일을 API 응답으로 대체하면 됩니다.

## 인증 관련

요구사항에 따라 로그인/회원가입/Supabase Auth 등 인증 기능은 포함되어 있지 않습니다.
현재는 UI/UX와 OTT 구조 완성에 집중되어 있습니다.

## 데이터 정합성 패치 (2026-06-18)

**증상**: Home 화면에 동일 작품("인생 2회차 복수")의 회차들이 서로 다른 작품처럼 6개 행으로 반복 노출됨.

**원인**: 코드(`Home.tsx`, `useDramas.ts`, `mappers.ts` 등)는 정상이며, `series` 테이블에
"인생 2회차 복수 1화" ~ "인생 2회차 복수 6화"가 회차별로 별도의 `series` row로 잘못 등록되어 있었음
(정상 구조는 `series` 1개 + `episodes` 6개여야 함).

**조치**: 코드 수정 없이 `sql/` 폴더의 SQL로 데이터만 정리.

1. `sql/00_backup.sql` — 수정 전 `series`/`episodes` 전체 백업 (필수, 먼저 실행)
2. `sql/01_preview.sql` — 병합 대상 미리보기 (읽기 전용, 실행 전 확인용)
3. `sql/02_fix_fragmented_series.sql` — 실제 병합 적용 (= `supabase/migrations/002_fix_fragmented_series.sql`)
4. `sql/03_rollback.sql` — 문제가 생겼을 때만 사용하는 원복 스크립트

위 스크립트는 `series.title`이 `"<작품명> <N>화"` 형태이고 동일 `<작품명>`을 가진 row가
2개 이상 있는 경우만 대상으로 하며, `video_url`/`thumbnail_url`/`episodes` 데이터를
삭제하지 않고 올바른 부모 series 아래로 재배치만 한다. 합쳐지기 전 row들은 삭제되지 않고
`status = 'inactive'`로만 전환되어 Home에서 숨겨진다. 로컬 PostgreSQL로 실제 버그를
재현한 데이터셋에 대해 적용/재실행/롤백 전 과정을 검증했다.
